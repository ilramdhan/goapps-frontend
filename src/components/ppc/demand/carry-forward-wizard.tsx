"use client"

import { useState } from "react"
import {
  Loader2,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  CalendarCheck,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import {
  ScrollableDialogContent,
  ScrollableDialogHeader,
  ScrollableDialogBody,
  ScrollableDialogFooter,
} from "@/components/common/scrollable-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ConfirmDialog, DataTable, type ColumnDef } from "@/components/shared"
import { PlanCarryPanel } from "@/components/ppc/plan/plan-carry-panel"
import { WorkOrderCarryPanel } from "@/components/ppc/work-order/wo-carry-panel"

import type { Demand, CarryForwardSplit, ProcessCarryForwardRequest } from "@/types/ppc/demand"
import {
  CarryAction,
  DemandStatus,
  CARRY_ACTION_LABELS,
  CARRY_ACTION_OUTCOME_LABELS,
  CARRY_ACTIONS_WITHOUT_TARGET,
  CARRY_ACTIONS_IRREVERSIBLE,
  carryActionDescription,
  currentMonth,
} from "@/types/ppc/common"
import {
  useCarryForwardCandidates,
  useProcessCarryForward,
  useBulkCarryForwardAsIs,
  BulkCarryError,
  type BulkCarryResult,
  type BulkCarryOutcome,
} from "@/hooks/ppc/use-demand"

// ─── Scope seam — read this before adding PLAN-05 / PLAN-06 ──────────────────
//
// S-2.4 requires demands, plan items and work orders to read as ONE month-start
// flow rather than three unrelated modals, so all three live in this component.
//
//   PLAN-05 (plan items)  → DONE: { value: "plans", label: "Plan Items" },
//                           panel in ./plan-carry-panel.
//   PLAN-06 (work orders) → adds { value: "workOrders", label: "Work Orders" }
//
// To add a scope:
//   1. Add its entry to CARRY_SCOPES below. The switcher renders itself as soon
//      as there is more than one — with a single scope it stays hidden, because
//      a one-option tab strip is noise.
//   2. Write a panel component shaped like <DemandCarryPanel>: it receives the
//      shared sourceMonth / targetMonth and owns everything below the header.
//      Source and target month are deliberately lifted to this shell so
//      switching scope does not reset the months the user just chose.
//   3. Render it from the scope switch in the body.
//
// Do not fork this into a second dialog.
type CarryScope = "demands" | "plans" | "workOrders"

const CARRY_SCOPES: { value: CarryScope; label: string }[] = [
  { value: "demands", label: "Demands" },
  { value: "plans", label: "Plan Items" },
  { value: "workOrders", label: "Work Orders" },
]

interface CarryForwardWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

/** Shift a "YYYY-MM" string by n months. */
function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number)
  if (!y || !m) return month
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function previousMonth(): string {
  return shiftMonth(currentMonth(), -1)
}

function fmtQty(value: string): string {
  const n = Number(value)
  return Number.isFinite(n) ? n.toLocaleString() : value || "-"
}

/** "2026-08" → "August 2026". Never shown as a bare code to the user. */
function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number)
  if (!y || !m) return month || "—"
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" })
}

/**
 * A human label for one demand, for confirmations and batch results.
 * Never the demand id — falls back through product code, contract no, then a
 * described row, so a batch report always names something the user recognises.
 */
function demandLabel(d: Demand): string {
  if (d.productCode) return d.productCode
  if (d.contractNo) return `Contract ${d.contractNo}`
  const deadline = d.deadline ? d.deadline.slice(0, 10) : "no deadline"
  return `Unmapped product · ${fmtQty(d.qtyRemaining)} due ${deadline}`
}

const CARRY_ACTION_SELECT = [
  CarryAction.CARRY_ACTION_CARRY_AS_IS,
  CarryAction.CARRY_ACTION_SPLIT,
  CarryAction.CARRY_ACTION_DEFER,
  CarryAction.CARRY_ACTION_PARTIAL_CARRY,
  CarryAction.CARRY_ACTION_CANCEL,
]

export function CarryForwardWizard({ open, onOpenChange, onSuccess }: CarryForwardWizardProps) {
  // Shared across every scope — see the scope seam note above.
  const [scope, setScope] = useState<CarryScope>("demands")
  const [sourceMonth, setSourceMonth] = useState(previousMonth())
  const [targetMonth, setTargetMonth] = useState(currentMonth())

  // Reset the wizard when it opens (adjust-during-render pattern).
  const [wasOpen, setWasOpen] = useState(false)
  const [resetToken, setResetToken] = useState(0)
  if (open && !wasOpen) {
    setWasOpen(true)
    setScope(CARRY_SCOPES[0].value)
    setSourceMonth(previousMonth())
    setTargetMonth(currentMonth())
    setResetToken((n) => n + 1)
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  const handleSourceMonth = (value: string) => {
    setSourceMonth(value)
    // Keep the target one month ahead of the source unless the user has said
    // otherwise since — the common case is "roll last month into this one".
    if (value) setTargetMonth(shiftMonth(value, 1))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ScrollableDialogContent className="sm:max-w-3xl">
        <ScrollableDialogHeader>
          <DialogTitle>Start New Month — Carry Forward</DialogTitle>
          <DialogDescription>
            At month start, work that was committed but not finished does not move by itself.
            This lists everything still unfulfilled in the source month and lets you decide, per
            row, what happens to it in the new month.
          </DialogDescription>
        </ScrollableDialogHeader>

        {/* Months are shell-level so they survive a scope switch. */}
        <div className="flex flex-wrap items-end gap-3 border-b px-6 py-3">
          <div className="space-y-1">
            <Label htmlFor="cf-source-month" className="text-xs">
              Source month
            </Label>
            <Input
              id="cf-source-month"
              type="month"
              value={sourceMonth}
              onChange={(e) => handleSourceMonth(e.target.value)}
              className="w-[170px]"
            />
          </div>
          <ArrowRight className="mb-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
          <div className="space-y-1">
            <Label htmlFor="cf-target-month" className="text-xs">
              Target month
            </Label>
            <Input
              id="cf-target-month"
              type="month"
              value={targetMonth}
              onChange={(e) => setTargetMonth(e.target.value)}
              className="w-[170px]"
            />
          </div>

          {CARRY_SCOPES.length > 1 && (
            <div className="ml-auto flex items-end gap-1">
              {CARRY_SCOPES.map((s) => (
                <Button
                  key={s.value}
                  type="button"
                  size="sm"
                  variant={scope === s.value ? "default" : "outline"}
                  onClick={() => setScope(s.value)}
                >
                  {s.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        {scope === "demands" && (
          <DemandCarryPanel
            key={`demands-${resetToken}`}
            open={open}
            sourceMonth={sourceMonth}
            targetMonth={targetMonth}
            onClose={() => onOpenChange(false)}
            onSuccess={onSuccess}
          />
        )}
        {scope === "plans" && (
          <PlanCarryPanel
            key={`plans-${resetToken}`}
            open={open}
            sourceMonth={sourceMonth}
            targetMonth={targetMonth}
            onClose={() => onOpenChange(false)}
            onSuccess={onSuccess}
          />
        )}
                {scope === "workOrders" && (
          <WorkOrderCarryPanel
            key={`workOrders-${resetToken}`}
            sourceMonth={sourceMonth}
            targetMonth={targetMonth}
            onClose={() => onOpenChange(false)}
            onSuccess={onSuccess}
          />
        )}
      </ScrollableDialogContent>
    </Dialog>
  )
}

/** One demand settled in this session, snapshotted at the moment it settled. */
interface SettledDemand {
  demandId: number
  /** Human label as it read when handled. Never an id. */
  label: string
  action: CarryAction
  /** Insertion order, so the recap reads chronologically. */
  seq: number
}

interface ScopePanelProps {
  open: boolean
  /** Owned by the shell. A panel reads these; it must not render its own
   *  month inputs — two live controls for one value is a duplicate control. */
  sourceMonth: string
  targetMonth: string
  onClose: () => void
  onSuccess?: () => void
}

/**
 * The Demands scope. Owns the body + footer beneath the shared month header.
 * PLAN-05 / PLAN-06 panels should take the same props and follow the same
 * shape: summary strip → candidate list with a visible per-row action →
 * per-row detail pane → batch result.
 */
function DemandCarryPanel({
  open,
  sourceMonth,
  targetMonth,
  onClose,
  onSuccess,
}: ScopePanelProps) {
  const [active, setActive] = useState<Demand | null>(null)

  // Per-candidate action form state
  const [action, setAction] = useState<CarryAction>(CarryAction.CARRY_ACTION_CARRY_AS_IS)
  const [newDeadline, setNewDeadline] = useState("")
  const [carryQty, setCarryQty] = useState("")
  const [splits, setSplits] = useState<CarryForwardSplit[]>([{ qty: "", deadline: "" }])

  // Demands settled during this run: what was done to each, and the label it
  // had at the time.
  //
  // Both parts must be snapshotted here, not re-derived from `candidates`.
  // Every mutation invalidates the candidates query, and CARRY_AS_IS / PARTIAL /
  // SPLIT / CANCEL all move the demand to a status ListCarryCandidates does not
  // return — so the row vanishes from the live array the moment the refetch
  // lands. Reading the recap off `candidates` silently emptied it for every
  // action except DEFER (the only one that stays eligible), while the "Handled
  // just now" count kept climbing off this map.
  const [processed, setProcessed] = useState<Record<number, SettledDemand>>({})
  const processedIds = Object.keys(processed).map(Number)

  const [confirmDestructiveOpen, setConfirmDestructiveOpen] = useState(false)

  // Bulk state
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)
  const [bulkResult, setBulkResult] = useState<BulkCarryResult | null>(null)

  const { data: candidates, isLoading } = useCarryForwardCandidates(open ? sourceMonth : "")
  const processMutation = useProcessCarryForward()
  const bulkMutation = useBulkCarryForwardAsIs()

  // A demand handled in this session is dropped from the table outright rather
  // than left sitting there greyed out. DEFER in particular keeps the row a
  // valid candidate of this same month, so it survives the refetch and would
  // otherwise linger while the summary above already counted it as handled.
  const rows = (candidates ?? []).filter((d) => processed[d.demandId] === undefined)
  const totalRemaining = rows.reduce((sum, d) => sum + (Number(d.qtyRemaining) || 0), 0)

  // Everything settled this session, in the order it was handled. `seq` is
  // explicit because Object.values orders integer-like keys numerically — by
  // demand id — not by insertion.
  const settled = Object.values(processed).sort((a, b) => a.seq - b.seq)

  const startProcess = (demand: Demand) => {
    setBulkResult(null)
    setActive(demand)
    setAction(CarryAction.CARRY_ACTION_CARRY_AS_IS)
    setNewDeadline(demand.deadline ? demand.deadline.slice(0, 10) : "")
    setCarryQty(demand.qtyRemaining || "")
    setSplits([{ qty: "", deadline: "" }])
  }

  const isSplit = action === CarryAction.CARRY_ACTION_SPLIT
  const isPartial = action === CarryAction.CARRY_ACTION_PARTIAL_CARRY
  const producesNothing = CARRY_ACTIONS_WITHOUT_TARGET.includes(action)
  const isIrreversible = CARRY_ACTIONS_IRREVERSIBLE.includes(action)
  const needsDeadline = action === CarryAction.CARRY_ACTION_CARRY_AS_IS || isPartial

  // Deferring an already-DEFERRED demand is rejected by the backend:
  // canTransition returns false whenever from == to (state_machine.go:52).
  // Say so before the user submits rather than surfacing it as a toast.
  const alreadyDeferred =
    action === CarryAction.CARRY_ACTION_DEFER &&
    active?.status === DemandStatus.DEMAND_STATUS_DEFERRED

  const canConfirm =
    !!active &&
    !!targetMonth &&
    !alreadyDeferred &&
    (!isSplit || splits.every((s) => s.qty && s.deadline)) &&
    (!isPartial || !!carryQty)

  const submitAction = async () => {
    if (!active) return
    const req: ProcessCarryForwardRequest = {
      sourceDemandId: active.demandId,
      action,
      targetMonth,
      newDeadline: needsDeadline && newDeadline ? newDeadline : undefined,
      carryQty: isPartial && carryQty ? carryQty : undefined,
      splits: isSplit ? splits : [],
    }
    const applied = action
    const demandId = active.demandId
    // Snapshot the label now, while the row is still in hand — the refetch this
    // mutation triggers will drop it from the candidate list for every action
    // except DEFER.
    const label = demandLabel(active)
    try {
      await processMutation.mutateAsync(req)
      setProcessed((prev) => ({
        ...prev,
        [demandId]: { demandId, label, action: applied, seq: Object.keys(prev).length },
      }))
      setActive(null)
      onSuccess?.()
    } catch {
      // The mutation hook already toasts the message. Keep the pane open so the
      // user can correct the input rather than losing what they typed.
    }
  }

  // CANCEL writes off the remaining qty and CANCELLED is terminal
  // (state_machine.go:41) — it gets a confirmation, per the house rule that no
  // destructive action fires straight off its own button.
  const handleConfirm = () => {
    if (isIrreversible) {
      setConfirmDestructiveOpen(true)
      return
    }
    void submitAction()
  }

  const runBulk = async () => {
    setConfirmBulkOpen(false)
    const batch = rows.map((d) => ({ demandId: d.demandId, label: demandLabel(d) }))
    setBulkProgress({ done: 0, total: batch.length })

    // Records the carried rows. Labels come from `batch`, captured before the
    // run, so they survive the refetch that removes those rows from the
    // candidate list.
    const record = (outcomes: BulkCarryOutcome[]) => {
      setProcessed((prev) => {
        const next = { ...prev }
        let seq = Object.keys(prev).length
        for (const o of outcomes) {
          if (o.ok) next[o.demandId] = { ...o, action: CarryAction.CARRY_ACTION_CARRY_AS_IS, seq: seq++ }
        }
        return next
      })
    }

    try {
      const result = await bulkMutation.mutateAsync({
        demands: batch,
        targetMonth,
        onProgress: (done, total) => setBulkProgress({ done, total }),
      })
      setBulkResult(result)
      record(result.outcomes)
      if (result.succeeded > 0) onSuccess?.()
    } catch (error) {
      // The loop itself died rather than an individual demand failing. The hook
      // carries out the verdicts it had already collected, so this reports the
      // truth for every row it reached — no third "unknown" state is needed,
      // because there is no attempted row without a verdict. Rows it never
      // reached are simply still outstanding and stay in the candidate list.
      const partial = error instanceof BulkCarryError ? error.outcomes : []
      setBulkResult({
        outcomes: partial,
        succeeded: partial.filter((o) => o.ok).length,
        failed: partial.filter((o) => !o.ok).length,
      })
      record(partial)
      if (partial.some((o) => o.ok)) onSuccess?.()
    } finally {
      setBulkProgress(null)
    }
  }

  const columns: ColumnDef<Demand>[] = [
    {
      id: "product",
      header: "Product",
      // Whether a product is linked is decided by cpmProductSysId, not by the
      // labels: those live in finance and are decorated onto the row over gRPC,
      // so they come back blank whenever that lookup degrades. Keying "Not
      // mapped" off the labels reported a linked demand as unlinked every time
      // finance was unreachable.
      cell: (row) =>
        row.cpmProductSysId ? (
          <div className="min-w-0">
            <div className="font-medium font-mono">{row.productCode || "-"}</div>
            <div className="max-w-[200px] truncate text-xs text-muted-foreground">
              {row.productName || (
                <span className="italic">Product name unavailable</span>
              )}
            </div>
          </div>
        ) : (
          <span className="text-xs italic text-muted-foreground">Not mapped</span>
        ),
    },
    {
      id: "qtyRemaining",
      header: "Qty Remaining",
      cellClassName: "tabular-nums",
      cell: (row) => fmtQty(row.qtyRemaining),
    },
    {
      id: "deadline",
      header: "Deadline",
      hideOnMobile: true,
      cell: (row) => (row.deadline ? row.deadline.slice(0, 10) : "-"),
    },
    {
      // S-2.1: the carry action is a visible, labelled button on the row. It was
      // previously a RowAction, which the DataTable renders icon-only on desktop
      // and buries in a "…" menu on mobile — users reported the modal as having
      // "only a Close button".
      id: "carry",
      header: "",
      headerClassName: "text-right",
      cellClassName: "text-right",
      canHide: false,
      // Rows settled in this session are removed from `rows` above, so every
      // row rendered here is still outstanding.
      cell: (row) => (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => startProcess(row)}
          disabled={bulkMutation.isPending}
        >
          Carry forward
        </Button>
      ),
    },
  ]

  const updateSplit = (index: number, patch: Partial<CarryForwardSplit>) => {
    setSplits((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  const listView = (
    <>
      {/* Summary strip — S-2.1: what is here, how much of it, how far in. */}
      <div className="grid grid-cols-3 gap-3 rounded-lg border bg-muted/40 p-3 text-center">
        <div>
          <div className="text-lg font-semibold tabular-nums">{rows.length}</div>
          <div className="text-xs text-muted-foreground">Still to handle</div>
        </div>
        <div>
          <div className="text-lg font-semibold tabular-nums">
            {totalRemaining.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">Total remaining qty</div>
        </div>
        <div>
          <div className="text-lg font-semibold tabular-nums">{processedIds.length}</div>
          <div className="text-xs text-muted-foreground">Handled just now</div>
        </div>
      </div>

      {bulkProgress && (
        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carrying into {monthLabel(targetMonth)}…
            </span>
            <span className="tabular-nums text-muted-foreground">
              {bulkProgress.done} of {bulkProgress.total}
            </span>
          </div>
          <Progress
            value={bulkProgress.total ? (bulkProgress.done / bulkProgress.total) * 100 : 0}
          />
          <p className="text-xs text-muted-foreground">
            Each demand is carried on its own — closing this now would stop the rest, not undo
            what has already gone through.
          </p>
        </div>
      )}

      {bulkResult && <BulkResultPanel result={bulkResult} targetMonth={targetMonth} />}

      {/* What was done in this session, per demand. The row itself is gone from
          the table by now, so without this the user loses the audit trail of
          their own last five minutes (S-2.4: the user can tell what happened). */}
      {settled.length > 0 && (
        <div className="space-y-1 rounded-lg border p-3">
          <p className="text-xs font-medium text-muted-foreground">Handled in this session</p>
          <ul className="space-y-1 text-xs">
            {settled.map((s) => (
              // Keyed by id: demandLabel's fallback is not unique, so two
              // unmapped demands sharing qty + deadline would collide. A React
              // key is not user-visible, so this does not expose the id.
              <li key={s.demandId} className="flex items-center justify-between gap-2">
                <span className="truncate">{s.label}</span>
                <Badge variant="secondary" className="gap-1 shrink-0">
                  <CheckCircle2 className="h-3 w-3" />
                  {CARRY_ACTION_OUTCOME_LABELS[s.action] ?? "Handled"}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Order matters: a demand handled in this session is filtered out of
          `rows`, so "nothing here" and "you just finished everything" look
          identical from `rows` alone. Check the session's own tally first. */}
      {!isLoading && rows.length === 0 && processedIds.length > 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <CalendarCheck className="mx-auto mb-2 h-6 w-6 text-muted-foreground" aria-hidden />
          <p className="font-medium">Everything in {monthLabel(sourceMonth)} is handled</p>
          <p className="text-sm text-muted-foreground">
            All {processedIds.length} candidate{processedIds.length === 1 ? "" : "s"} were
            processed in this session. Nothing is left to carry.
          </p>
        </div>
      ) : !isLoading && rows.length === 0 ? (
        <EmptySourceMonth sourceMonth={sourceMonth} />
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          keyField="demandId"
          isLoading={isLoading}
          emptyMessage="No carry-forward candidates"
          emptyDescription="No unfulfilled demands remain in the selected month."
        />
      )}
    </>
  )

  const detailView = active && (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/40 p-3">
        {/* A blank label does not mean "unlinked": the product code
            and name are resolved from finance over gRPC and come back
            empty whenever that lookup degrades. cpmProductSysId is
            the field that actually says whether a product is linked. */}
        {active.cpmProductSysId ? (
          <>
            <div className="font-medium font-mono">{active.productCode || "-"}</div>
            <div className="text-sm text-muted-foreground">
              {active.productName || <span className="italic">Product name unavailable</span>}
            </div>
          </>
        ) : (
          <div className="text-sm italic text-muted-foreground">Product not mapped</div>
        )}
        <div className="mt-1 text-xs text-muted-foreground">
          Remaining: {fmtQty(active.qtyRemaining)}
          {active.deadline ? ` · due ${active.deadline.slice(0, 10)}` : ""}
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Action</Label>
        <Select value={String(action)} onValueChange={(v) => setAction(Number(v) as CarryAction)}>
          <SelectTrigger>
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            {CARRY_ACTION_SELECT.map((a) => (
              <SelectItem key={a} value={String(a)}>
                {CARRY_ACTION_LABELS[a]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* The effect, at the point of choice — the labels alone do not say
            that PARTIAL_CARRY drops the uncarried remainder, nor that DEFER
            leaves the demand in the month it is already in. */}
        <p className="pt-1 text-xs text-muted-foreground">
          {carryActionDescription(action, monthLabel(sourceMonth))}
        </p>
      </div>

      {alreadyDeferred && (
        <p className="rounded-md border border-destructive/40 p-3 text-xs text-destructive">
          This demand is already deferred, so deferring it again will be rejected. Carry it,
          split it, or cancel it instead.
        </p>
      )}

      {/* The target month lives in the shell header, which stays visible here —
          a second bound input for the same value is a duplicate control, and
          re-implementing a shell concern is exactly the leak PLAN-05/06 would
          copy. Only the not-applicable notice is scope-local. */}
      {producesNothing ? (
        <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          This action creates nothing in another month, so the target month and deadline set
          above do not apply.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Goes into <span className="font-medium">{monthLabel(targetMonth)}</span> — change the
          target month above to send it elsewhere.
        </p>
      )}

      {needsDeadline && (
        <div className="space-y-1">
          <Label htmlFor="cf-new-deadline" className="text-xs">
            New deadline
          </Label>
          <Input
            id="cf-new-deadline"
            type="date"
            value={newDeadline}
            onChange={(e) => setNewDeadline(e.target.value)}
            className="w-[200px]"
          />
          <p className="text-xs text-muted-foreground">
            Leave as-is to keep the original deadline.
          </p>
        </div>
      )}

      {isPartial && (
        <div className="space-y-1">
          <Label htmlFor="cf-carry-qty" className="text-xs">
            Carry quantity
          </Label>
          <Input
            id="cf-carry-qty"
            inputMode="decimal"
            value={carryQty}
            onChange={(e) => setCarryQty(e.target.value)}
            className="w-[200px]"
          />
          <p className="text-xs text-muted-foreground">
            Cannot exceed the {fmtQty(active.qtyRemaining)} remaining. Anything you do not carry
            is written off.
          </p>
        </div>
      )}

      {isSplit && (
        <div className="space-y-2">
          <Label className="text-xs">Splits</Label>
          <p className="text-xs text-muted-foreground">
            The splits together cannot exceed the {fmtQty(active.qtyRemaining)} remaining.
          </p>
          {splits.map((split, index) => (
            <div key={index} className="flex items-end gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Qty</Label>
                <Input
                  inputMode="decimal"
                  value={split.qty}
                  onChange={(e) => updateSplit(index, { qty: e.target.value })}
                  className="w-[140px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Deadline</Label>
                <Input
                  type="date"
                  value={split.deadline}
                  onChange={(e) => updateSplit(index, { deadline: e.target.value })}
                  className="w-[170px]"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setSplits((prev) => prev.filter((_, i) => i !== index))}
                disabled={splits.length <= 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSplits((prev) => [...prev, { qty: "", deadline: "" }])}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add split
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <>
      <ScrollableDialogBody className="space-y-4">
        {active ? detailView : listView}
      </ScrollableDialogBody>

      <ScrollableDialogFooter>
        {active ? (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setActive(null)}
              disabled={processMutation.isPending}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!canConfirm || processMutation.isPending}
              // "Cancel" alone, sitting beside "Back", reads as the universal
              // dismiss word — one misread writes off the remaining qty for
              // good. The destructive action always names its object.
              variant={isIrreversible ? "destructive" : "default"}
            >
              {processMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isIrreversible ? "Cancel this demand" : CARRY_ACTION_LABELS[action]}
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={bulkMutation.isPending}
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => setConfirmBulkOpen(true)}
              disabled={rows.length === 0 || !targetMonth || bulkMutation.isPending}
            >
              {bulkMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Carry all as-is ({rows.length})
            </Button>
          </>
        )}
      </ScrollableDialogFooter>

      <ConfirmDialog
        open={confirmBulkOpen}
        onOpenChange={setConfirmBulkOpen}
        title="Carry all remaining demands as-is?"
        description={
          `${rows.length} demand${rows.length === 1 ? "" : "s"} from ` +
          `${monthLabel(sourceMonth)} will each get a new demand in ${monthLabel(targetMonth)} ` +
          `for their full remaining qty (${totalRemaining.toLocaleString()} in total), and the ` +
          `originals will be marked Carried Over. They are carried one at a time, so this is ` +
          `not a single all-or-nothing operation.`
        }
        confirmText={`Carry ${rows.length}`}
        onConfirm={runBulk}
      />

      {/* CANCEL is terminal — no route out of CANCELLED (state_machine.go:41). */}
      <ConfirmDialog
        open={confirmDestructiveOpen}
        onOpenChange={setConfirmDestructiveOpen}
        variant="destructive"
        title="Cancel this demand?"
        description={
          active
            ? `${demandLabel(active)} will be marked Cancelled and its remaining ` +
              `${fmtQty(active.qtyRemaining)} written off. Nothing is created in another month, ` +
              `and this cannot be undone.`
            : ""
        }
        confirmText="Cancel demand"
        isLoading={processMutation.isPending}
        onConfirm={() => {
          setConfirmDestructiveOpen(false)
          void submitAction()
        }}
      />
    </>
  )
}

/**
 * Batch outcome. A loop is not atomic, so this never reports a single verdict:
 * successes and failures are both named, by label, and a partial run is called
 * a partial run.
 */
function BulkResultPanel({
  result,
  targetMonth,
}: {
  result: BulkCarryResult
  targetMonth: string
}) {
  const failures = result.outcomes.filter((o) => !o.ok)
  const allFailed = result.succeeded === 0
  const partial = result.failed > 0 && result.succeeded > 0

  return (
    <div
      className={
        result.failed > 0
          ? "space-y-2 rounded-lg border border-destructive/40 p-3"
          : "space-y-2 rounded-lg border p-3"
      }
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        {result.failed > 0 ? (
          <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden />
        )}
        {allFailed
          ? `Nothing was carried — all ${result.failed} failed`
          : partial
            ? `Partly done — ${result.succeeded} carried into ${monthLabel(targetMonth)}, ${result.failed} failed`
            : `${result.succeeded} carried into ${monthLabel(targetMonth)}`}
      </div>

      {failures.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground">
            These were left exactly as they were and can be retried or handled one at a time:
          </p>
          <ul className="space-y-1 text-xs">
            {failures.map((f) => (
              <li key={f.demandId}>
                <span className="font-medium">{f.label}</span>
                <span className="text-muted-foreground"> — {f.error}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

/**
 * Zero candidates is a legitimate result, not an error and not an empty table —
 * S-2.1 requires it to say why nothing is listed.
 */
function EmptySourceMonth({ sourceMonth }: { sourceMonth: string }) {
  return (
    <div className="rounded-lg border border-dashed p-6 text-center">
      <CalendarCheck className="mx-auto mb-2 h-6 w-6 text-muted-foreground" aria-hidden />
      <p className="font-medium">Nothing to carry from {monthLabel(sourceMonth)}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        A demand only appears here while it is confirmed, in production, partially delivered or
        deferred <em>and</em> still has quantity outstanding. Every demand in{" "}
        {monthLabel(sourceMonth)} is either fulfilled, cancelled, already carried over, or not yet
        confirmed — so there is nothing left to roll into the new month.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Pick a different source month above if you expected to see something here.
      </p>
    </div>
  )
}
