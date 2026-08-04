"use client"

// The five step bodies of the tablet shift-entry flow. Each one is a pure view
// over the draft plus the problems the model reported — no step owns validation
// and no step submits.

import { Minus, Plus, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { KeypadTarget, NumericKeypad, NumericKeypadDialog } from "@/components/common/numeric-keypad"
import { OptionTileGrid, type OptionTile } from "@/components/common/option-tile-grid"
import { SegmentedControl } from "@/components/common/segmented-control"
import { cn } from "@/lib/utils"
import { AREA_LABELS } from "@/types/ppc/common"
import type { Machine, DowntimeReasonMaster, WasteCategoryMaster, PpcShift } from "@/types/ppc/master"

import {
  type DowntimeDraft,
  type ShiftEntryDraft,
  type StepProblems,
  type WasteDraft,
  localIsoOffset,
  nextRowKey,
  toInt,
  todayLocalIso,
  totalDowntimeMin,
  totalWasteKg,
} from "./shift-entry-model"

// ---------------------------------------------------------------------------

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1.5 text-sm text-destructive">{message}</p>
}

function StepHeading({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="space-y-1">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{hint}</p>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs tracking-wide text-muted-foreground uppercase">{children}</p>
}

/**
 * `pageSize: 100` on the reason/category queries is a bet about master size, not
 * a guarantee. When the server says there are more, say so — silent truncation
 * would hide the reason the operator is looking for.
 */
function truncationNote(truncated: boolean, noun: string): string | undefined {
  if (!truncated) return undefined
  return `Showing the first 100 ${noun}. Narrow the area if the one you need is missing.`
}

// ---------------------------------------------------------------------------
// Step 1 — machine & shift
// ---------------------------------------------------------------------------

export interface ContextStepProps {
  draft: ShiftEntryDraft
  problems: StepProblems
  areas: { value: number; label: string }[]
  machines: Machine[]
  machinesLoading: boolean
  shifts: PpcShift[]
  shiftsLoading: boolean
  onAreaChange: (area: number) => void
  onMachineChange: (machineId: number, machineNo: string) => void
  onDateChange: (date: string) => void
  onShiftChange: (code: string, name: string) => void
}

export function ContextStep({
  draft,
  problems,
  areas,
  machines,
  machinesLoading,
  shifts,
  shiftsLoading,
  onAreaChange,
  onMachineChange,
  onDateChange,
  onShiftChange,
}: ContextStepProps) {
  const machineTiles: OptionTile<number>[] = machines.map((m) => ({
    value: m.machineId,
    code: m.machineNo,
    name: m.machineGroupName || undefined,
    meta: AREA_LABELS[m.machineArea],
  }))

  const today = todayLocalIso()
  const yesterday = localIsoOffset(1)

  return (
    <div className="space-y-6">
      <StepHeading
        title="Which machine, and when?"
        hint="Pick the area first — the machine list follows it."
      />

      <div className="space-y-2">
        <SectionLabel>Area</SectionLabel>
        <SegmentedControl
          ariaLabel="Area"
          value={draft.area}
          onChange={onAreaChange}
          options={areas.map((a) => ({ value: a.value, label: a.label }))}
        />
      </div>

      <div className="space-y-2">
        <SectionLabel>Machine</SectionLabel>
        <OptionTileGrid
          ariaLabel="Machine"
          value={draft.machineId || undefined}
          onChange={(id) => {
            const m = machines.find((x) => x.machineId === id)
            onMachineChange(id, m?.machineNo ?? "")
          }}
          tiles={machineTiles}
          isLoading={machinesLoading}
          filterPlaceholder="Filter by machine no…"
          emptyMessage="No machines in this area"
          emptyDescription="Add a machine to this area in the machine master, or pick a different area."
        />
        <FieldError message={problems.machine} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <SectionLabel>Production date</SectionLabel>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={draft.date === today ? "default" : "outline"}
              className="h-12 min-w-[96px]"
              onClick={() => onDateChange(today)}
            >
              Today
            </Button>
            <Button
              type="button"
              variant={draft.date === yesterday ? "default" : "outline"}
              className="h-12 min-w-[112px]"
              onClick={() => onDateChange(yesterday)}
            >
              Yesterday
            </Button>
            <Input
              type="date"
              value={draft.date}
              max={today}
              onChange={(e) => onDateChange(e.target.value)}
              aria-label="Production date"
              className="h-12 w-[170px]"
            />
          </div>
          <FieldError message={problems.date} />
        </div>

        <div className="space-y-2">
          <SectionLabel>Shift</SectionLabel>
          {shiftsLoading ? (
            <div className="h-[60px] animate-pulse rounded-lg bg-muted" />
          ) : shifts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No shifts are configured. Add them in the shift master before recording a shift.
            </p>
          ) : (
            <SegmentedControl
              ariaLabel="Shift"
              value={draft.shift || undefined}
              onChange={(code) => {
                const s = shifts.find((x) => x.code === code)
                onShiftChange(code, s?.name ?? "")
              }}
              options={shifts.map((s) => ({
                value: s.code,
                label: s.name,
                sublabel: `${s.startTime}–${s.endTime}`,
              }))}
            />
          )}
          <FieldError message={problems.shift} />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2 — positions
// ---------------------------------------------------------------------------

export interface PositionsStepProps {
  draft: ShiftEntryDraft
  problems: StepProblems
  activeField: "positionsTotal" | "positionsRunning"
  onActiveFieldChange: (f: "positionsTotal" | "positionsRunning") => void
  onValueChange: (field: "positionsTotal" | "positionsRunning", value: string) => void
}

export function PositionsStep({
  draft,
  problems,
  activeField,
  onActiveFieldChange,
  onValueChange,
}: PositionsStepProps) {
  const total = toInt(draft.positionsTotal)
  const running = toInt(draft.positionsRunning)
  const idle = total !== null && running !== null && running <= total ? total - running : null

  const bump = (delta: number) => {
    const cur = toInt(draft[activeField]) ?? 0
    const next = Math.max(0, cur + delta)
    onValueChange(activeField, String(next))
  }

  return (
    <div className="space-y-6">
      <StepHeading
        title="How many positions ran?"
        hint="Total is what the machine has. Running is what actually produced this shift."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="space-y-3">
          <KeypadTarget
            label="Positions total"
            value={draft.positionsTotal}
            placeholder="0"
            active={activeField === "positionsTotal"}
            invalid={!!problems.positionsTotal}
            hint={problems.positionsTotal ?? "Tap to key it in on the pad."}
            onSelect={() => onActiveFieldChange("positionsTotal")}
          />
          <KeypadTarget
            label="Positions running"
            value={draft.positionsRunning}
            placeholder="0"
            active={activeField === "positionsRunning"}
            invalid={!!problems.positionsRunning}
            hint={problems.positionsRunning ?? "Tap to key it in on the pad."}
            onSelect={() => onActiveFieldChange("positionsRunning")}
          />

          {idle !== null && (
            <div className="rounded-lg border border-dashed bg-muted/40 px-4 py-3">
              <p className="text-xs tracking-wide text-muted-foreground uppercase">Idle positions</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{idle}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Running minutes are worked out from downtime after you save — you do not enter them.
              </p>
            </div>
          )}
        </div>

        <div className="w-full space-y-3 lg:w-[280px]">
          <p className="text-xs text-muted-foreground">
            Keying <span className="font-medium text-foreground">
              {activeField === "positionsTotal" ? "positions total" : "positions running"}
            </span>
          </p>
          <NumericKeypad
            value={draft[activeField]}
            onChange={(v) => onValueChange(activeField, v)}
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => bump(-1)}>
              <Minus className="size-4" /> 1
            </Button>
            <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => bump(1)}>
              <Plus className="size-4" /> 1
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 3 — downtime
// ---------------------------------------------------------------------------

export interface DowntimeStepProps {
  draft: ShiftEntryDraft
  problems: StepProblems
  reasons: DowntimeReasonMaster[]
  reasonsLoading: boolean
  reasonsTruncated: boolean
  onChange: (rows: DowntimeDraft[]) => void
}

export function DowntimeStep({
  draft,
  problems,
  reasons,
  reasonsLoading,
  reasonsTruncated,
  onChange,
}: DowntimeStepProps) {
  const chosen = new Set(draft.downtime.map((d) => d.reasonId))

  const toggle = (r: DowntimeReasonMaster) => {
    if (chosen.has(r.reasonId)) {
      onChange(draft.downtime.filter((d) => d.reasonId !== r.reasonId))
      return
    }
    onChange([
      ...draft.downtime,
      {
        key: nextRowKey("dt"),
        reasonId: r.reasonId,
        reasonCode: r.code,
        reasonName: r.name,
        durationMin: "",
        notes: "",
      },
    ])
  }

  const patch = (key: string, next: Partial<DowntimeDraft>) =>
    onChange(draft.downtime.map((d) => (d.key === key ? { ...d, ...next } : d)))

  const total = totalDowntimeMin(draft.downtime)

  return (
    <div className="space-y-6">
      <StepHeading
        title="What stopped the machine?"
        hint="Tap every reason that applies, then key its minutes. Skip the step if nothing stopped."
      />

      <OptionTileGrid
        multiple
        ariaLabel="Downtime reasons"
        isLoading={reasonsLoading}
        value={[...chosen]}
        tiles={reasons.map((r) => ({
          value: r.reasonId,
          code: r.code,
          name: r.name,
          meta: r.isExcludeFromEff ? "Excluded from efficiency" : undefined,
        }))}
        onChange={(id) => {
          const r = reasons.find((x) => x.reasonId === id)
          if (r) toggle(r)
        }}
        emptyInline="No downtime reasons are configured for this area."
        footnote={truncationNote(reasonsTruncated, "downtime reasons")}
        filterPlaceholder="Filter reasons…"
      />

      {draft.downtime.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <SectionLabel>Minutes lost</SectionLabel>
              <span className="font-mono text-sm tabular-nums text-muted-foreground">
                {total} min total
              </span>
            </div>
            {draft.downtime.map((d) => (
              <div
                key={d.key}
                className={cn(
                  "flex flex-wrap items-center gap-3 rounded-lg border p-3",
                  problems[`downtime.${d.key}`] && "border-destructive"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm font-medium">{d.reasonCode}</p>
                  <p className="truncate text-xs text-muted-foreground">{d.reasonName}</p>
                </div>
                <NumericKeypadDialog
                  value={d.durationMin}
                  onCommit={(v) => patch(d.key, { durationMin: v })}
                  title={`${d.reasonCode} — minutes lost`}
                  description={d.reasonName}
                  label="Duration"
                  unit="min"
                >
                  <Button type="button" variant="outline" className="h-12 min-w-[104px] justify-between font-mono">
                    <span className="text-lg tabular-nums">{d.durationMin || "0"}</span>
                    <span className="text-xs font-normal text-muted-foreground">min</span>
                  </Button>
                </NumericKeypadDialog>
                <Input
                  value={d.notes}
                  onChange={(e) => patch(d.key, { notes: e.target.value })}
                  placeholder="Note (optional)"
                  aria-label={`Note for ${d.reasonCode}`}
                  className="h-12 min-w-[140px] flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-12"
                  aria-label={`Remove ${d.reasonCode}`}
                  onClick={() => onChange(draft.downtime.filter((x) => x.key !== d.key))}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
                {problems[`downtime.${d.key}`] && (
                  <p className="w-full text-sm text-destructive">{problems[`downtime.${d.key}`]}</p>
                )}
              </div>
            ))}
            <FieldError message={problems.downtimeTotal} />
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 4 — waste
// ---------------------------------------------------------------------------

export interface WasteStepProps {
  draft: ShiftEntryDraft
  problems: StepProblems
  categories: WasteCategoryMaster[]
  categoriesLoading: boolean
  categoriesTruncated: boolean
  onChange: (rows: WasteDraft[]) => void
}

export function WasteStep({
  draft,
  problems,
  categories,
  categoriesLoading,
  categoriesTruncated,
  onChange,
}: WasteStepProps) {
  const chosen = new Set(draft.waste.map((w) => w.categoryId))

  const toggle = (c: WasteCategoryMaster) => {
    if (chosen.has(c.categoryId)) {
      onChange(draft.waste.filter((w) => w.categoryId !== c.categoryId))
      return
    }
    onChange([
      ...draft.waste,
      {
        key: nextRowKey("ws"),
        categoryId: c.categoryId,
        categoryCode: c.code,
        categoryName: c.name,
        categoryType: c.type,
        qtyKg: "",
        isUpset: false,
        notes: "",
      },
    ])
  }

  const patch = (key: string, next: Partial<WasteDraft>) =>
    onChange(draft.waste.map((w) => (w.key === key ? { ...w, ...next } : w)))

  const waste = categories.filter((c) => c.type !== "DOWNGRADE")
  const downgrade = categories.filter((c) => c.type === "DOWNGRADE")
  const total = totalWasteKg(draft.waste)

  return (
    <div className="space-y-6">
      <StepHeading
        title="Any waste or downgrade?"
        hint="Tap each category, then key its weight in kilograms. Skip the step if there was none."
      />

      <div className="space-y-2">
        <SectionLabel>Waste</SectionLabel>
        <OptionTileGrid
          multiple
          ariaLabel="Waste categories"
          isLoading={categoriesLoading}
          value={[...chosen]}
          tiles={waste.map((c) => ({ value: c.categoryId, code: c.code, name: c.name }))}
          onChange={(id) => {
            const c = categories.find((x) => x.categoryId === id)
            if (c) toggle(c)
          }}
          emptyInline="No waste categories are configured for this area."
          footnote={truncationNote(categoriesTruncated, "waste categories")}
          filterPlaceholder="Filter categories…"
        />
      </div>

      {downgrade.length > 0 && (
        <div className="space-y-2">
          <SectionLabel>Downgrade</SectionLabel>
          <OptionTileGrid
            multiple
            ariaLabel="Downgrade categories"
            value={[...chosen]}
            tiles={downgrade.map((c) => ({
              value: c.categoryId,
              code: c.code,
              name: c.name,
              meta: c.gradeTarget ? `Grade ${c.gradeTarget}` : undefined,
            }))}
            onChange={(id) => {
              const c = categories.find((x) => x.categoryId === id)
              if (c) toggle(c)
            }}
            emptyInline=""
            filterPlaceholder="Filter downgrade reasons…"
          />
        </div>
      )}

      {draft.waste.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <SectionLabel>Weights</SectionLabel>
              <span className="font-mono text-sm tabular-nums text-muted-foreground">
                {total.toFixed(1)} kg total
              </span>
            </div>
            {draft.waste.map((w) => (
              <div
                key={w.key}
                className={cn(
                  "flex flex-wrap items-center gap-3 rounded-lg border p-3",
                  problems[`waste.${w.key}`] && "border-destructive"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate font-mono text-sm font-medium">
                    {w.categoryCode}
                    {w.categoryType === "DOWNGRADE" && (
                      <Badge variant="secondary" className="text-[10px]">
                        Downgrade
                      </Badge>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{w.categoryName}</p>
                </div>
                <NumericKeypadDialog
                  value={w.qtyKg}
                  onCommit={(v) => patch(w.key, { qtyKg: v })}
                  title={`${w.categoryCode} — weight`}
                  description={w.categoryName}
                  label="Quantity"
                  unit="kg"
                  allowDecimal
                >
                  <Button type="button" variant="outline" className="h-12 min-w-[112px] justify-between font-mono">
                    <span className="text-lg tabular-nums">{w.qtyKg || "0"}</span>
                    <span className="text-xs font-normal text-muted-foreground">kg</span>
                  </Button>
                </NumericKeypadDialog>
                <label className="flex h-12 min-w-[104px] cursor-pointer items-center gap-2 rounded-md border px-3">
                  <Switch
                    checked={w.isUpset}
                    onCheckedChange={(v) => patch(w.key, { isUpset: v })}
                    aria-label={`Upset for ${w.categoryCode}`}
                  />
                  <span className="text-sm">Upset</span>
                </label>
                <Input
                  value={w.notes}
                  onChange={(e) => patch(w.key, { notes: e.target.value })}
                  placeholder="Note (optional)"
                  aria-label={`Note for ${w.categoryCode}`}
                  className="h-12 min-w-[140px] flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-12"
                  aria-label={`Remove ${w.categoryCode}`}
                  onClick={() => onChange(draft.waste.filter((x) => x.key !== w.key))}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
                {problems[`waste.${w.key}`] && (
                  <p className="w-full text-sm text-destructive">{problems[`waste.${w.key}`]}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 5 — review
// ---------------------------------------------------------------------------

export interface ReviewStepProps {
  draft: ShiftEntryDraft
  problems: StepProblems
  onJumpTo: (stepIndex: number) => void
}

export function ReviewStep({ draft, problems, onJumpTo }: ReviewStepProps) {
  const hasProblems = Object.keys(problems).length > 0
  const total = toInt(draft.positionsTotal)
  const running = toInt(draft.positionsRunning)

  return (
    <div className="space-y-6">
      <StepHeading title="Check it over" hint="Tap any row to go back and change it." />

      {hasProblems && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-sm font-medium text-destructive">Something still needs fixing</p>
          <ul className="mt-1.5 space-y-0.5">
            {Object.values(problems).map((m) => (
              <li key={m} className="text-sm text-destructive">
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ReviewRow label="Machine" onEdit={() => onJumpTo(0)}>
        <span className="font-mono font-medium">{draft.machineNo || "—"}</span>
        <span className="text-muted-foreground"> · {AREA_LABELS[draft.area]}</span>
      </ReviewRow>
      <ReviewRow label="Date & shift" onEdit={() => onJumpTo(0)}>
        {draft.date} · {draft.shiftName || `Shift ${draft.shift}`}
      </ReviewRow>
      <ReviewRow label="Positions" onEdit={() => onJumpTo(1)}>
        <span className="font-mono tabular-nums">{running ?? "—"}</span> running of{" "}
        <span className="font-mono tabular-nums">{total ?? "—"}</span>
      </ReviewRow>
      <ReviewRow
        label={`Downtime (${draft.downtime.length})`}
        onEdit={() => onJumpTo(2)}
        empty={draft.downtime.length === 0 ? "None recorded" : undefined}
      >
        <ul className="space-y-0.5">
          {draft.downtime.map((d) => (
            <li key={d.key} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">
                <span className="font-mono">{d.reasonCode}</span>
                <span className="text-muted-foreground"> — {d.reasonName}</span>
              </span>
              <span className="shrink-0 font-mono tabular-nums">{d.durationMin || "0"} min</span>
            </li>
          ))}
        </ul>
        <p className="mt-1.5 font-mono text-xs tabular-nums text-muted-foreground">
          {totalDowntimeMin(draft.downtime)} min total
        </p>
      </ReviewRow>
      <ReviewRow
        label={`Waste (${draft.waste.length})`}
        onEdit={() => onJumpTo(3)}
        empty={draft.waste.length === 0 ? "None recorded" : undefined}
      >
        <ul className="space-y-0.5">
          {draft.waste.map((w) => (
            <li key={w.key} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">
                <span className="font-mono">{w.categoryCode}</span>
                <span className="text-muted-foreground"> — {w.categoryName}</span>
                {w.isUpset && <span className="text-muted-foreground"> · upset</span>}
              </span>
              <span className="shrink-0 font-mono tabular-nums">{w.qtyKg || "0"} kg</span>
            </li>
          ))}
        </ul>
        <p className="mt-1.5 font-mono text-xs tabular-nums text-muted-foreground">
          {totalWasteKg(draft.waste).toFixed(1)} kg total
        </p>
      </ReviewRow>
    </div>
  )
}

function ReviewRow({
  label,
  children,
  onEdit,
  empty,
}: {
  label: string
  children: React.ReactNode
  onEdit: () => void
  empty?: string
}) {
  return (
    <div className="flex min-h-[56px] flex-wrap items-start justify-between gap-3 border-b pb-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
        <div className="mt-1 text-sm">
          {empty ? <span className="text-muted-foreground">{empty}</span> : children}
        </div>
      </div>
      <Button type="button" variant="ghost" className="h-11 shrink-0 px-3 text-xs" onClick={onEdit}>
        Change
      </Button>
    </div>
  )
}

