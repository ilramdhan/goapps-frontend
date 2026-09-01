"use client"

// MbRecipeBulkJobProgressDialog — orchestrates the 3-stage Bulk MB Head
// lifecycle-regenerate chain (Unvalidate → Submit → Validate) for one fixed
// selection of mbhIds, driven entirely by Phase E's hooks
// (use-mb-head-bulk.ts) — this file never talks to the API directly.
//
// 🔴 DESIGN DECISION — SAME FULL SELECTION on every stage, not a shrinking
// working set. Each of the 3 stages is called with the exact same `mbhIds`
// array the user selected, every time — stage 2 (Submit) is NOT restricted to
// only the records that succeeded stage 1 (Unvalidate), and likewise for
// stage 3. Rationale:
//   - It matches the plan's own default recommendation.
//   - It keeps the mental model simple: "regenerate exactly these N records,
//     3 steps, see per-step results for the SAME N" — there's no need to
//     cross-reference which subset made it into a later stage.
//   - A record that failed an earlier stage will very likely fail the next
//     one too (it's not in the right source status), and that failure is
//     still surfaced per-stage via useBulkMBHeadJobFailures, so nothing is
//     silently swallowed — the user sees exactly which stage a given record
//     stopped at.
//   - The backend bulk RPCs are explicitly documented as accepting 1-500 IDs
//     regardless of their current status per-item (failures are reported,
//     not a hard request-level rejection), so re-submitting the full set is
//     a supported, inexpensive no-op for records that already moved on.
//
// Close is gated on the WHOLE CHAIN reaching a terminal state — either every
// stage completed (DONE/PARTIAL) through Validate, or an earlier stage came
// back FAILED (zero succeeded) and the chain was stopped early. Either way
// counts as "settled" for the purpose of refreshing the parent list and
// clearing selection (see onSettled below) — a stopped-early chain still
// changed real data (whatever the failed stage's zero-succeeded status
// implies) and the list must reflect it.
import { useEffect, useRef, useState } from "react"
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  useBulkForceUnvalidateMBHeads,
  useBulkMBHeadJobFailures,
  useBulkMBHeadJobStatus,
  useBulkSubmitMBHeads,
  useBulkValidateMBHeads,
} from "@/hooks/finance/use-mb-head-bulk"
import { BULK_MB_HEAD_JOB_TERMINAL_STATUSES } from "@/types/finance/mb-head"

type StageKey = "unvalidate" | "submit" | "validate"

const STAGE_ORDER: StageKey[] = ["unvalidate", "submit", "validate"]

const STAGE_LABELS: Record<StageKey, string> = {
  unvalidate: "Unvalidate",
  submit: "Submit",
  validate: "Validate",
}

// Fixed reason recorded against every bulk force-unvalidate call — this is an
// admin regenerate action, not a user-authored rejection/return, so a single
// descriptive constant (rather than a reason-collection UI) matches how
// low-friction this action is meant to be for the Super Admins who hold all
// three permissions.
const UNVALIDATE_REASON = "Bulk lifecycle regenerate (Super Admin)"

interface StageResult {
  jobId: string
  jobCode: string
  status: string
  total: number
  completed: number
  failed: number
}

function isTerminal(status: string): boolean {
  return (BULK_MB_HEAD_JOB_TERMINAL_STATUSES as readonly string[]).includes(status)
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  mbhIds: string[]
  /**
   * Fired when the dialog is closed AFTER the chain reached a terminal state
   * (completed through Validate, or stopped early on a FAILED stage) — never
   * fired if the user somehow closes before that (Close is disabled until
   * then, so in practice this always corresponds to a real state change).
   */
  onSettled: () => void
}

export function MbRecipeBulkJobProgressDialog({ open, onOpenChange, mbhIds, onSettled }: Props) {
  const [stageIndex, setStageIndex] = useState(-1) // -1 = not started yet
  const [jobIds, setJobIds] = useState<(string | undefined)[]>([undefined, undefined, undefined])
  const [results, setResults] = useState<(StageResult | undefined)[]>([undefined, undefined, undefined])
  const [phase, setPhase] = useState<"idle" | "running" | "stopped" | "complete">("idle")
  const [viewFailuresStage, setViewFailuresStage] = useState<number | null>(null)

  // Guards against double-starting a stage (e.g. effect re-runs before async
  // mutate() state settles) — each stage index may only ever be started once
  // per dialog "open" lifecycle.
  const startedStages = useRef<Set<number>>(new Set())

  const unvalidateM = useBulkForceUnvalidateMBHeads()
  const submitM = useBulkSubmitMBHeads()
  const validateM = useBulkValidateMBHeads()

  const currentJobId = stageIndex >= 0 && stageIndex < 3 ? jobIds[stageIndex] : undefined
  const statusQuery = useBulkMBHeadJobStatus(currentJobId)

  const failuresJobId = viewFailuresStage !== null ? jobIds[viewFailuresStage] : undefined
  const failuresQuery = useBulkMBHeadJobFailures(failuresJobId)

  function startStage(index: number) {
    if (startedStages.current.has(index)) return
    startedStages.current.add(index)
    setStageIndex(index)
    setPhase("running")

    function onQueued(data: { jobId: string }) {
      setJobIds((prev) => {
        const next = [...prev]
        next[index] = data.jobId
        return next
      })
    }
    function onQueueError() {
      // The queueing call itself failed (network/permission/validation) —
      // there is no job to poll, so treat this the same as a hard stage
      // failure and stop the chain here.
      setPhase("stopped")
    }

    if (index === 0) {
      unvalidateM.mutate(
        { mbhIds, reason: UNVALIDATE_REASON },
        { onSuccess: onQueued, onError: onQueueError },
      )
    } else if (index === 1) {
      submitM.mutate(mbhIds, { onSuccess: onQueued, onError: onQueueError })
    } else {
      validateM.mutate(mbhIds, { onSuccess: onQueued, onError: onQueueError })
    }
  }

  // Kick off stage 0 once the dialog opens; reset all local state when it closes
  // so the next open starts a fresh chain.
  useEffect(() => {
    if (open) {
      startStage(0)
    } else {
      startedStages.current = new Set()
      setStageIndex(-1)
      setJobIds([undefined, undefined, undefined])
      setResults([undefined, undefined, undefined])
      setPhase("idle")
      setViewFailuresStage(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Record the current stage's result once its polled status goes terminal.
  useEffect(() => {
    const data = statusQuery.data
    if (!data || stageIndex < 0 || stageIndex > 2 || !isTerminal(data.status)) return
    setResults((prev) => {
      if (prev[stageIndex]) return prev
      const next = [...prev]
      next[stageIndex] = {
        jobId: data.jobId,
        jobCode: data.jobCode,
        status: data.status,
        total: data.totalChildren,
        completed: data.completedChildren,
        failed: data.failedChildren,
      }
      return next
    })
  }, [statusQuery.data, stageIndex])

  // Once a stage's result is recorded, decide whether to stop the chain or
  // advance to the next stage.
  useEffect(() => {
    if (stageIndex < 0 || stageIndex > 2) return
    const r = results[stageIndex]
    if (!r) return
    // FAILED means zero succeeded per the job status vocabulary (DONE = all
    // succeeded, PARTIAL = a mix, FAILED = none) — stop the chain rather than
    // feeding a hard-failed batch into the next stage.
    if (r.status === "FAILED") {
      setPhase("stopped")
      return
    }
    if (stageIndex < 2) {
      startStage(stageIndex + 1)
    } else {
      setPhase("complete")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, stageIndex])

  const settled = phase === "stopped" || phase === "complete"

  function handleClose() {
    if (!settled) return
    onOpenChange(false)
    onSettled()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && settled) handleClose() }}>
      <DialogContent className="sm:max-w-[560px]" onInteractOutside={(e) => { if (!settled) e.preventDefault() }}>
        <DialogHeader>
          <DialogTitle>Bulk Regenerate — {mbhIds.length} MB Head{mbhIds.length === 1 ? "" : "s"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {STAGE_ORDER.map((stage, idx) => (
            <StageRow
              key={stage}
              label={STAGE_LABELS[stage]}
              stepNumber={idx + 1}
              result={results[idx]}
              isActive={stageIndex === idx && phase === "running"}
              isPending={stageIndex < idx}
              onViewFailures={() => setViewFailuresStage(idx)}
              viewingFailures={viewFailuresStage === idx}
            />
          ))}

          {viewFailuresStage !== null && (
            <div className="rounded-md border p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Failures — Step {viewFailuresStage + 1}: {STAGE_LABELS[STAGE_ORDER[viewFailuresStage]]}
              </p>
              {failuresQuery.isLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading failures…
                </div>
              )}
              {!failuresQuery.isLoading && (failuresQuery.data?.length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground">No failures recorded.</p>
              )}
              {!failuresQuery.isLoading && (failuresQuery.data?.length ?? 0) > 0 && (
                <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
                  {failuresQuery.data?.map((f) => (
                    <li key={f.mbhId} className="flex flex-col gap-0.5 border-b pb-1 last:border-0">
                      <span className="font-mono text-xs">{f.mbCosting || f.mbhId}</span>
                      <span className="text-xs text-destructive">{f.errorMessage}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {phase === "stopped" && (
            <p className="text-sm text-muted-foreground">
              Chain stopped — a stage failed completely (zero succeeded). Records that reached an
              earlier stage successfully were not rolled back; review the failures above before
              retrying.
            </p>
          )}
          {phase === "complete" && (
            <p className="text-sm text-muted-foreground">
              All 3 stages finished. Review any per-stage failures above before closing.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={!settled}>
            {settled ? "Close" : "Running…"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StageRow({
  label,
  stepNumber,
  result,
  isActive,
  isPending,
  onViewFailures,
  viewingFailures,
}: {
  label: string
  stepNumber: number
  result: StageResult | undefined
  isActive: boolean
  isPending: boolean
  onViewFailures: () => void
  viewingFailures: boolean
}) {
  const pct = result && result.total > 0 ? Math.round(((result.completed + result.failed) / result.total) * 100) : 0

  return (
    <div className="space-y-1.5 rounded-md border p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium">
          <StageIcon result={result} isActive={isActive} isPending={isPending} />
          Step {stepNumber}/3: {label}
        </span>
        {result && (
          <span className="text-xs text-muted-foreground">
            {result.completed} completed · {result.failed} failed / {result.total} total
          </span>
        )}
      </div>
      {isActive && !result && (
        <>
          <Progress value={undefined} className="h-1.5 animate-pulse" />
          <p className="text-xs text-muted-foreground">Processing…</p>
        </>
      )}
      {result && (
        <Progress value={pct} className="h-1.5" />
      )}
      {result && result.failed > 0 && (
        <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onViewFailures}>
          {viewingFailures ? "Viewing failures" : `View ${result.failed} failure${result.failed === 1 ? "" : "s"}`}
        </Button>
      )}
    </div>
  )
}

function StageIcon({
  result,
  isActive,
  isPending,
}: {
  result: StageResult | undefined
  isActive: boolean
  isPending: boolean
}) {
  if (isPending) return <span className="h-4 w-4 shrink-0 rounded-full border border-muted-foreground/30" />
  if (isActive && !result) return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
  if (!result) return <span className="h-4 w-4 shrink-0 rounded-full border border-muted-foreground/30" />
  if (result.status === "FAILED") return <XCircle className="h-4 w-4 shrink-0 text-red-600" />
  if (result.status === "PARTIAL") return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
  return <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
}
