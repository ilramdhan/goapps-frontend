"use client"

// MbRecipeBulkJobProgressDialog — orchestrates the (adaptive) Bulk MB Head
// lifecycle-regenerate chain (Unvalidate → Submit → Validate) for one fixed
// selection of { mbhId → entryStatus at selection time }, driven entirely by
// Phase E's hooks (use-mb-head-bulk.ts) — this file never talks to the API
// directly.
//
// 🔴 DESIGN DECISION — ADAPTIVE PER-ITEM REQUEST SETS, not the same full
// selection on every stage. Each stage is called with only the subset of the
// selection that actually needs it, computed from each item's STARTING status:
//   - VALIDATED → needs Unvalidate → Submit → Validate (all 3 stages)
//   - DRAFT     → needs Submit → Validate only (skips Unvalidate)
//   - SUBMITTED → needs Validate only (skips Unvalidate and Submit)
// Concretely:
//   - Stage 1 (Unvalidate) runs against the VALIDATED bucket only.
//   - Stage 2 (Submit) runs against DRAFT ∪ (VALIDATED items that SUCCEEDED
//     stage 1). Items that failed stage 1 are dropped, not retried here.
//   - Stage 3 (Validate) runs against SUBMITTED ∪ (whatever SUCCEEDED stage 2)
//     — i.e. everything that has reached SUBMITTED by the time this stage
//     runs, however it got there.
// A stage whose computed request set is empty is never called — it renders as
// "Skipped" instead of running a no-op API call or spinning forever waiting on
// a job that was never queued.
//
// Close is gated on the WHOLE CHAIN reaching a terminal state — every stage
// either ran to completion (DONE/PARTIAL/FAILED) or was skipped. That always
// counts as "settled" for the purpose of refreshing the parent list and
// clearing selection (see onSettled below).
import { useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, CheckCircle2, Loader2, MinusCircle, XCircle } from "lucide-react"

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
import { BULK_MB_HEAD_JOB_TERMINAL_STATUSES, type MBHeadEntryStatus } from "@/types/finance/mb-head"

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

// Client-side-only status: a stage whose computed request set came out empty
// was never sent to the API at all — distinct from any real job status.
const SKIPPED = "SKIPPED" as const

interface StageResult {
  jobId: string
  jobCode: string
  status: string // one of BulkMBHeadJobStatus, or the client-only SKIPPED marker
  total: number
  completed: number
  failed: number
}

function isTerminal(status: string): boolean {
  return (BULK_MB_HEAD_JOB_TERMINAL_STATUSES as readonly string[]).includes(status)
}

function skippedResult(): StageResult {
  return { jobId: "", jobCode: "", status: SKIPPED, total: 0, completed: 0, failed: 0 }
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** mbhId → entryStatus at the moment the row was selected. */
  selection: Map<string, MBHeadEntryStatus>
  /**
   * Fired when the dialog is closed AFTER the chain reached a terminal state
   * (every stage ran to completion or was skipped) — never fired if the user
   * somehow closes before that (Close is disabled until then, so in practice
   * this always corresponds to a real state change).
   */
  onSettled: () => void
}

/** Buckets a selection by starting status — the three status values the table allows to be selected. */
function useSelectionBuckets(selection: Map<string, MBHeadEntryStatus>) {
  return useMemo(() => {
    const validated: string[] = []
    const draft: string[] = []
    const submitted: string[] = []
    selection.forEach((status, id) => {
      if (status === "VALIDATED") validated.push(id)
      else if (status === "DRAFT") draft.push(id)
      else if (status === "SUBMITTED") submitted.push(id)
    })
    return { validated, draft, submitted }
  }, [selection])
}

export function MbRecipeBulkJobProgressDialog({ open, onOpenChange, selection, onSettled }: Props) {
  const buckets = useSelectionBuckets(selection)
  const totalSelected = selection.size

  const [jobIds, setJobIds] = useState<(string | undefined)[]>([undefined, undefined, undefined])
  const [results, setResults] = useState<(StageResult | undefined)[]>([undefined, undefined, undefined])
  const [requestSets, setRequestSets] = useState<(string[] | undefined)[]>([undefined, undefined, undefined])
  const [phase, setPhase] = useState<"idle" | "running" | "complete">("idle")
  const [viewFailuresStage, setViewFailuresStage] = useState<number | null>(null)

  // Guards against double-starting/double-skipping a stage (e.g. effect re-runs
  // before async mutate() state settles) — each stage index may only ever be
  // resolved (started OR skipped) once per dialog "open" lifecycle.
  const resolvedStages = useRef<Set<number>>(new Set())

  const unvalidateM = useBulkForceUnvalidateMBHeads()
  const submitM = useBulkSubmitMBHeads()
  const validateM = useBulkValidateMBHeads()

  // Poll whichever stage is currently in flight (has a jobId but no recorded result yet).
  const activeStageIndex = results.findIndex((r, i) => jobIds[i] && !r)
  const statusQuery = useBulkMBHeadJobStatus(activeStageIndex >= 0 ? jobIds[activeStageIndex] : undefined)

  const failuresJobId = viewFailuresStage !== null ? jobIds[viewFailuresStage] : undefined
  const failuresQuery = useBulkMBHeadJobFailures(failuresJobId)

  // Per-stage failure detail, fetched automatically (independent of the "view
  // failures" UI toggle above) whenever a stage terminates PARTIALLY — i.e.
  // some but not all of its request set failed — so the next stage's request
  // set can exclude exactly those ids. A stage that fully succeeded or fully
  // failed needs no per-item detail (see resolveSucceeded below).
  function needsFailureDetail(index: number): boolean {
    const r = results[index]
    return !!r && r.status !== SKIPPED && r.failed > 0 && r.failed < r.total
  }
  const stage0Failures = useBulkMBHeadJobFailures(needsFailureDetail(0) ? jobIds[0] : undefined)
  const stage1Failures = useBulkMBHeadJobFailures(needsFailureDetail(1) ? jobIds[1] : undefined)
  const stageFailureQueries = [stage0Failures, stage1Failures]

  // Resolves which ids in a settled stage's OWN request set succeeded.
  // Returns undefined while that determination is still pending (stage not
  // yet terminal, or its partial-failure detail hasn't loaded yet).
  function resolveSucceeded(index: number): string[] | undefined {
    const set = requestSets[index]
    const r = results[index]
    if (!set) return undefined
    if (set.length === 0 || r?.status === SKIPPED) return []
    if (!r) return undefined
    if (r.failed === 0) return set
    if (r.failed >= r.total) return [] // every item in this stage's request set failed
    const fq = stageFailureQueries[index]
    if (!fq || fq.isLoading || !fq.data) return undefined
    const failedIds = new Set(fq.data.map((f) => f.mbhId))
    return set.filter((id) => !failedIds.has(id))
  }

  function startStage(index: number, ids: string[]) {
    if (resolvedStages.current.has(index)) return
    resolvedStages.current.add(index)
    setRequestSets((prev) => {
      const next = [...prev]
      next[index] = ids
      return next
    })

    if (ids.length === 0) {
      setResults((prev) => {
        const next = [...prev]
        next[index] = skippedResult()
        return next
      })
      return
    }

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
      // there is no job to poll. Record the whole request set as failed so
      // downstream stages correctly exclude these ids.
      setResults((prev) => {
        const next = [...prev]
        next[index] = { jobId: "", jobCode: "", status: "FAILED", total: ids.length, completed: 0, failed: ids.length }
        return next
      })
    }

    if (index === 0) {
      unvalidateM.mutate({ mbhIds: ids, reason: UNVALIDATE_REASON }, { onSuccess: onQueued, onError: onQueueError })
    } else if (index === 1) {
      submitM.mutate(ids, { onSuccess: onQueued, onError: onQueueError })
    } else {
      validateM.mutate(ids, { onSuccess: onQueued, onError: onQueueError })
    }
  }

  // Kick off stage 0 (Unvalidate, against the VALIDATED bucket) once the
  // dialog opens; reset all local state when it closes so the next open
  // starts a fresh chain.
  useEffect(() => {
    if (open) {
      setPhase("running")
      startStage(0, buckets.validated)
    } else {
      resolvedStages.current = new Set()
      setJobIds([undefined, undefined, undefined])
      setResults([undefined, undefined, undefined])
      setRequestSets([undefined, undefined, undefined])
      setPhase("idle")
      setViewFailuresStage(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Record the in-flight stage's result once its polled status goes terminal.
  useEffect(() => {
    const data = statusQuery.data
    if (!data || activeStageIndex < 0 || !isTerminal(data.status)) return
    setResults((prev) => {
      if (prev[activeStageIndex]) return prev
      const next = [...prev]
      next[activeStageIndex] = {
        jobId: data.jobId,
        jobCode: data.jobCode,
        status: data.status,
        total: data.totalChildren,
        completed: data.completedChildren,
        failed: data.failedChildren,
      }
      return next
    })
  }, [statusQuery.data, activeStageIndex])

  // Advance the chain: once stage N's succeeded-ids are known, compute stage
  // N+1's request set (its own bucket plus whatever succeeded upstream) and
  // start or skip it. Once stage 2 has settled (ran or skipped), the chain is
  // complete.
  useEffect(() => {
    if (phase === "idle") return

    const succeeded0 = resolveSucceeded(0)
    if (succeeded0 !== undefined && !resolvedStages.current.has(1)) {
      startStage(1, [...buckets.draft, ...succeeded0])
      return
    }

    const succeeded1 = resolveSucceeded(1)
    if (succeeded1 !== undefined && !resolvedStages.current.has(2)) {
      startStage(2, [...buckets.submitted, ...succeeded1])
      return
    }

    if (results[2] && phase !== "complete") {
      setPhase("complete")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, requestSets, stage0Failures.data, stage1Failures.data, phase])

  const settled = phase === "complete"

  function handleClose() {
    if (!settled) return
    onOpenChange(false)
    onSettled()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && settled) handleClose() }}>
      <DialogContent className="sm:max-w-[560px]" onInteractOutside={(e) => { if (!settled) e.preventDefault() }}>
        <DialogHeader>
          <DialogTitle>Bulk Regenerate — {totalSelected} MB Head{totalSelected === 1 ? "" : "s"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {STAGE_ORDER.map((stage, idx) => (
            <StageRow
              key={stage}
              label={STAGE_LABELS[stage]}
              stepNumber={idx + 1}
              result={results[idx]}
              isActive={activeStageIndex === idx}
              isPending={!results[idx] && activeStageIndex !== idx}
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

          {phase === "complete" && (
            <p className="text-sm text-muted-foreground">
              {(() => {
                const skippedCount = results.filter((r) => r?.status === SKIPPED).length
                const ranCount = 3 - skippedCount
                return `Regenerate finished — ${ranCount} of 3 stage${ranCount === 1 ? "" : "s"} ran` +
                  (skippedCount > 0 ? ` (${skippedCount} skipped as not needed for the selected items).` : ".") +
                  " Review any per-stage failures above before closing."
              })()}
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
  const skipped = result?.status === SKIPPED
  const pct = result && result.total > 0 ? Math.round(((result.completed + result.failed) / result.total) * 100) : 0

  return (
    <div className="space-y-1.5 rounded-md border p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium">
          <StageIcon result={result} isActive={isActive} isPending={isPending} />
          Step {stepNumber}/3: {label}
        </span>
        {result && !skipped && (
          <span className="text-xs text-muted-foreground">
            {result.completed} completed · {result.failed} failed / {result.total} total
          </span>
        )}
        {skipped && <span className="text-xs text-muted-foreground">Skipped — not needed</span>}
      </div>
      {isActive && !result && (
        <>
          <Progress value={undefined} className="h-1.5 animate-pulse" />
          <p className="text-xs text-muted-foreground">Processing…</p>
        </>
      )}
      {result && !skipped && (
        <Progress value={pct} className="h-1.5" />
      )}
      {result && !skipped && result.failed > 0 && (
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
  if (result?.status === SKIPPED) return <MinusCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
  if (isPending) return <span className="h-4 w-4 shrink-0 rounded-full border border-muted-foreground/30" />
  if (isActive && !result) return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
  if (!result) return <span className="h-4 w-4 shrink-0 rounded-full border border-muted-foreground/30" />
  if (result.status === "FAILED") return <XCircle className="h-4 w-4 shrink-0 text-red-600" />
  if (result.status === "PARTIAL") return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
  return <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
}
