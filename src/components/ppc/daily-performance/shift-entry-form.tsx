"use client"

// ShiftEntryForm — tablet-first shift entry (POS-style).
//
// The operator stands at the machine with a tablet. Everything here follows from
// that: one decision per screen, every target at least 44px, every number keyed
// from an on-screen pad, and Save/Finalize pinned to the bottom so it is never
// scrolled out of reach.
//
// The submit payload is byte-for-byte what the previous desktop form sent —
// this is presentation only. runningMinutes stays 0 because the server derives
// it from downtime (v1.2).

import { useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, RotateCcw, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { TouchStepper } from "@/components/common/touch-stepper"
import { ConfirmDialog } from "@/components/shared"

import { useSubmitShiftEntry } from "@/hooks/ppc/use-daily-performance"
import { useDowntimeReasons, useWasteCategories } from "@/hooks/ppc/use-masters"
import { useMachines } from "@/hooks/ppc/use-machine"
import { usePpcShifts } from "@/hooks/ppc/use-shifts"
import { AREA_OPTIONS } from "@/types/ppc/common"
import type { AreaCode } from "@/types/generated/ppc/v1/common"
import { cn } from "@/lib/utils"

import {
  SHIFT_ENTRY_STEPS,
  emptyDraft,
  toDowntimeEntries,
  toInt,
  todayLocalIso,
  toWasteEntries,
  validateDraft,
  validateStep,
  type ShiftEntryDraft,
} from "./shift-entry-model"
import { ContextStep, DowntimeStep, PositionsStep, ReviewStep, WasteStep } from "./shift-entry-steps"

const MASTER_PAGE_SIZE = 100

export function ShiftEntryForm() {
  const submit = useSubmitShiftEntry()

  const [draft, setDraft] = useState<ShiftEntryDraft>(() =>
    emptyDraft(AREA_OPTIONS.find((o) => o.value !== 0)?.value ?? 1, todayLocalIso())
  )
  const [stepIndex, setStepIndex] = useState(0)
  const [maxReachable, setMaxReachable] = useState(0)
  // Problems only surface once the user has tried to leave the step, so a blank
  // form does not greet the operator with four red messages.
  const [showProblems, setShowProblems] = useState(false)
  const [activeNumericField, setActiveNumericField] = useState<"positionsTotal" | "positionsRunning">(
    "positionsTotal"
  )
  const [lastSaved, setLastSaved] = useState<"DRAFT" | "FINAL" | null>(null)
  const [confirmFinal, setConfirmFinal] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const step = SHIFT_ENTRY_STEPS[stepIndex]

  const machines = useMachines({
    area: draft.area as AreaCode,
    activeFilter: 1,
    pageSize: MASTER_PAGE_SIZE,
  })
  const shifts = usePpcShifts()
  const reasons = useDowntimeReasons({ area: draft.area, pageSize: MASTER_PAGE_SIZE })
  const categories = useWasteCategories({ area: draft.area, pageSize: MASTER_PAGE_SIZE })

  // pageSize 100 is a guess about master size, not a guarantee. If the server
  // says there are more, the grids say so rather than silently hiding rows.
  const reasonsTruncated = (reasons.data?.pagination.totalItems ?? 0) > MASTER_PAGE_SIZE
  const categoriesTruncated = (categories.data?.pagination.totalItems ?? 0) > MASTER_PAGE_SIZE

  const problems = useMemo(() => validateStep(step.id, draft), [step.id, draft])
  const visibleProblems = showProblems ? problems : {}
  const reviewProblems = useMemo(() => validateStep("review", draft), [draft])
  // A draft is by definition incomplete: it asks only for what the backend
  // rejects (machine, date, shift, plus any rows already added). Positions are
  // not required — see validateDraft for the contract this is derived from.
  const draftProblems = useMemo(() => validateDraft(draft), [draft])

  const canSaveDraft = Object.keys(draftProblems).length === 0 && !submit.isPending
  const canFinalise = Object.keys(reviewProblems).length === 0 && !submit.isPending

  const patch = (next: Partial<ShiftEntryDraft>) => setDraft((d) => ({ ...d, ...next }))

  const goTo = (index: number) => {
    if (index > maxReachable) return
    setShowProblems(false)
    setStepIndex(index)
  }

  const advance = () => {
    if (Object.keys(problems).length > 0) {
      setShowProblems(true)
      return
    }
    const next = Math.min(stepIndex + 1, SHIFT_ENTRY_STEPS.length - 1)
    setShowProblems(false)
    setMaxReachable((m) => Math.max(m, next))
    setStepIndex(next)
  }

  // Stepping back never touches the draft — that is the whole point of holding
  // state here rather than inside each step.
  const back = () => {
    setShowProblems(false)
    setStepIndex((i) => Math.max(0, i - 1))
  }

  async function save(finalize: boolean) {
    // The mutation's own isPending is the double-tap guard (S-3.10): the buttons
    // read it, and this second check catches a tap that lands before React
    // re-renders the disabled state. It guards both actions.
    if (submit.isPending) return
    // Draft and final are gated differently on purpose. Draft asks only for what
    // the backend rejects; final asks for the whole entry.
    const blocking = finalize ? reviewProblems : draftProblems
    if (Object.keys(blocking).length > 0) {
      setShowProblems(true)
      return
    }
    try {
      await submit.mutateAsync({
        machineId: draft.machineId,
        date: draft.date,
        shift: draft.shift,
        positionsTotal: toInt(draft.positionsTotal) ?? 0,
        positionsRunning: draft.positionsRunning || "0",
        runningMinutes: 0, // derived server-side (v1.2)
        status: finalize ? "FINAL" : "DRAFT",
        downtimeEntries: toDowntimeEntries(draft.downtime),
        wasteEntries: toWasteEntries(draft.waste),
      })
      setLastSaved(finalize ? "FINAL" : "DRAFT")
    } catch {
      // The hook already toasts. Keep the draft so the operator can retry.
    }
  }

  function resetForNext() {
    setDraft(emptyDraft(draft.area, draft.date))
    setStepIndex(0)
    setMaxReachable(0)
    setShowProblems(false)
    setLastSaved(null)
  }

  return (
    <div className="min-w-0 space-y-4">
      {/* Progress rail + the identity of what is being recorded */}
      <div className="flex min-w-0 flex-col gap-3 rounded-lg border bg-card p-3 lg:flex-row lg:items-center lg:justify-between">
        <TouchStepper
          steps={SHIFT_ENTRY_STEPS.map((s) => ({ id: s.id, label: s.label }))}
          current={stepIndex}
          maxReachable={maxReachable}
          onStepChange={goTo}
          className="flex-1"
        />
        {draft.machineNo && (
          <div className="flex shrink-0 items-center gap-2 rounded-md bg-muted px-3 py-1.5">
            <span className="font-mono text-sm font-semibold">{draft.machineNo}</span>
            <span className="text-xs text-muted-foreground">
              {draft.date}
              {draft.shiftName && ` · ${draft.shiftName}`}
            </span>
          </div>
        )}
      </div>

      {lastSaved && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm",
            lastSaved === "FINAL"
              ? "border-emerald-500/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "bg-muted/40 text-muted-foreground"
          )}
        >
          <CheckCircle2 className="size-4 shrink-0" />
          <span className="min-w-0 flex-1">
            {lastSaved === "FINAL"
              ? `Finalised. Efficiency for ${draft.machineNo} has been recomputed.`
              : `Saved as a draft. Efficiency has not been recomputed yet.`}
          </span>
          <Button type="button" variant="outline" className="h-11" onClick={() => setConfirmReset(true)}>
            <RotateCcw className="size-3.5" /> Start another
          </Button>
        </div>
      )}

      {/* Step body */}
      <Card className="min-w-0">
        <CardContent className="min-w-0 pt-6">
          {step.id === "context" && (
            <ContextStep
              draft={draft}
              problems={visibleProblems}
              areas={AREA_OPTIONS.filter((o) => o.value !== 0)}
              machines={machines.data?.data ?? []}
              machinesLoading={machines.isLoading}
              shifts={shifts.data ?? []}
              shiftsLoading={shifts.isLoading}
              onAreaChange={(area) =>
                // Switching area invalidates the machine and every area-scoped
                // reason/category already chosen. Clearing them beats submitting
                // a TXT reason against an SPG machine.
                patch({ area, machineId: 0, machineNo: "", downtime: [], waste: [] })
              }
              onMachineChange={(machineId, machineNo) => patch({ machineId, machineNo })}
              onDateChange={(date) => patch({ date })}
              onShiftChange={(shift, shiftName) => patch({ shift, shiftName })}
            />
          )}

          {step.id === "positions" && (
            <PositionsStep
              draft={draft}
              problems={visibleProblems}
              activeField={activeNumericField}
              onActiveFieldChange={setActiveNumericField}
              onValueChange={(field, value) => patch({ [field]: value } as Partial<ShiftEntryDraft>)}
            />
          )}

          {step.id === "downtime" && (
            <DowntimeStep
              draft={draft}
              problems={visibleProblems}
              reasons={reasons.data?.data ?? []}
              reasonsLoading={reasons.isLoading}
              reasonsTruncated={reasonsTruncated}
              onChange={(downtime) => patch({ downtime })}
            />
          )}

          {step.id === "waste" && (
            <WasteStep
              draft={draft}
              problems={visibleProblems}
              categories={categories.data?.data ?? []}
              categoriesLoading={categories.isLoading}
              categoriesTruncated={categoriesTruncated}
              onChange={(waste) => patch({ waste })}
            />
          )}

          {step.id === "review" && (
            <ReviewStep draft={draft} problems={reviewProblems} onJumpTo={goTo} />
          )}
        </CardContent>
      </Card>

      {/* Sticky action bar. `bottom-0` keeps it in reach without scrolling; the
          dashboard shell scrolls the content region, not the window. */}
      <div className="sticky bottom-0 z-40 -mx-1 min-w-0 border-t bg-background/95 px-1 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-12 min-w-[104px]"
            disabled={stepIndex === 0}
            onClick={back}
          >
            <ArrowLeft className="size-4" /> Back
          </Button>

          <p className="order-last min-w-0 flex-1 basis-full text-xs text-muted-foreground sm:order-none sm:basis-auto">
            {step.id === "review" ? (
              <>
                <span className="font-medium text-foreground">Save draft</span> parks it as it is — you can
                come back and finish it, and efficiency is left alone.{" "}
                <span className="font-medium text-foreground">Finalise</span> locks the numbers in and
                recomputes efficiency for this machine.
              </>
            ) : canSaveDraft ? (
              <>
                <span className="font-medium text-foreground">Save draft</span> parks it as it is — you do
                not have to finish now.
              </>
            ) : (
              "Pick the machine, date and shift to save a draft."
            )}
          </p>

          {/* Save draft is available from every step, not just review — parking
              incomplete work is the entire reason DRAFT exists. */}
          <Button
            type="button"
            variant="outline"
            className="h-12 min-w-[128px]"
            disabled={!canSaveDraft}
            onClick={() => save(false)}
          >
            {submit.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save draft
          </Button>

          {step.id !== "review" ? (
            <Button type="button" className="h-12 min-w-[128px]" onClick={advance}>
              Continue <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button
              type="button"
              className="h-12 min-w-[128px]"
              disabled={!canFinalise}
              onClick={() => setConfirmFinal(true)}
            >
              {submit.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              Finalise
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmFinal}
        onOpenChange={setConfirmFinal}
        title="Finalise this shift entry?"
        description={
          `${draft.machineNo}, ${draft.date}, ${draft.shiftName || `shift ${draft.shift}`}. ` +
          `Finalising recomputes efficiency for this machine. You can still submit the shift again to correct it.`
        }
        confirmText="Finalise"
        isLoading={submit.isPending}
        onConfirm={() => save(true)}
      />

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Start another entry?"
        description="This clears the form. What you saved stays saved."
        confirmText="Start another"
        onConfirm={resetForNext}
      />
    </div>
  )
}
