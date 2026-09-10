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
// 🔴 DESIGN DECISION — CHUNKED, SEQUENTIALLY EXECUTED STAGES. The proto caps
// every bulk request at `max_items: 500` (finance/v1/yarn_master.proto — the
// BulkForceUnvalidate/BulkSubmit/BulkValidate request messages), and the table
// header checkbox can now select every row matching the current filter across
// all pages, so a stage's request set routinely exceeds that cap. Each stage
// is therefore split into CHUNKS of at most BULK_CHUNK_SIZE ids, and those
// chunks are queued STRICTLY ONE AT A TIME: queue chunk 0 → poll it to a
// terminal status → record its result → queue chunk 1 → … Running them
// sequentially (rather than fanning out) is what keeps exactly ONE active
// jobId and ONE active failures jobId alive at any instant, which in turn is
// what lets this component keep calling useBulkMBHeadJobStatus /
// useBulkMBHeadJobFailures an unconditional, fixed number of times — hooks are
// never called in a loop or behind a condition here.
//
// A stage's public result is the AGGREGATE of its chunks (see
// aggregateChunkResults): summed totals, DONE only if every chunk was DONE,
// FAILED only if every chunk FAILED, PARTIAL otherwise. A selection of ≤ 500
// ids produces exactly one chunk, so the whole flow — and the rendered UI —
// is byte-for-byte what it was before chunking existed.
//
// Close is gated on the WHOLE CHAIN reaching a terminal state — every stage
// either ran all of its chunks to completion (DONE/PARTIAL/FAILED) or was
// skipped. That always counts as "settled" for the purpose of refreshing the
// parent list and clearing selection (see onSettled below).
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
import {
  BULK_MB_HEAD_JOB_TERMINAL_STATUSES,
  type BulkMBHeadJobFailure,
  type MBHeadEntryStatus,
} from "@/types/finance/mb-head"

type StageKey = "unvalidate" | "submit" | "validate"

const STAGE_ORDER: StageKey[] = ["unvalidate", "submit", "validate"]

const STAGE_LABELS: Record<StageKey, string> = {
  unvalidate: "Unvalidate",
  submit: "Submit",
  validate: "Validate",
}

// Hard ceiling on ids per bulk request, mirroring the proto's
// `(buf.validate.field).repeated.max_items = 500` on the mbh_ids field of
// BulkForceUnvalidateMBHeadsRequest / BulkSubmitMBHeadsRequest /
// BulkValidateMBHeadsRequest (goapps-shared-proto/finance/v1/yarn_master.proto).
// Sending more than this is rejected at the gRPC validation interceptor with a
// message the UI cannot usefully surface, so we never send more than this.
export const BULK_CHUNK_SIZE = 500

// Fixed reason recorded against every bulk force-unvalidate call — this is an
// admin regenerate action, not a user-authored rejection/return, so a single
// descriptive constant (rather than a reason-collection UI) matches how
// low-friction this action is meant to be for the Super Admins who hold all
// three permissions.
const UNVALIDATE_REASON = "Bulk lifecycle regenerate (Super Admin)"

// Client-side-only status: a stage whose computed request set came out empty
// was never sent to the API at all — distinct from any real job status.
const SKIPPED = "SKIPPED" as const

/** The counters + status every chunk (and every aggregated stage) carries. */
export interface ChunkOutcome {
  status: string // one of BulkMBHeadJobStatus, or the client-only SKIPPED marker
  total: number
  completed: number
  failed: number
}

/** One chunk of one stage — the unit of work actually queued against the API. */
interface ChunkResult extends ChunkOutcome {
  jobId: string
  jobCode: string
  /**
   * Set only when the QUEUEING call itself failed (network/permission/
   * validation) and there is therefore no job to poll or inspect. Without this
   * the message was toasted and then lost, and "View failures" was unreachable
   * because jobId is "" — leaving a dead-end row with no diagnosis.
   */
  queueError?: string
}

/** The aggregate a StageRow renders — chunk jobIds live on the chunks, not here. */
type StageResult = ChunkOutcome

function isTerminal(status: string): boolean {
  return (BULK_MB_HEAD_JOB_TERMINAL_STATUSES as readonly string[]).includes(status)
}

function skippedResult(): StageResult {
  return { status: SKIPPED, total: 0, completed: 0, failed: 0 }
}

/**
 * Splits a stage's request set into API-legal chunks.
 *
 * An EMPTY input yields ZERO chunks — that is the representation of a skipped
 * stage (nothing was ever queued), not "one empty chunk".
 */
export function chunkIds(ids: string[], size: number = BULK_CHUNK_SIZE): string[][] {
  if (size <= 0) throw new RangeError("chunkIds: size must be a positive integer")
  const chunks: string[][] = []
  for (let i = 0; i < ids.length; i += size) chunks.push(ids.slice(i, i + size))
  return chunks
}

/**
 * Rolls a stage's chunk outcomes up into the single result the UI shows.
 *
 * Counters simply sum. The status is deliberately conservative: DONE only when
 * EVERY chunk is DONE, FAILED only when EVERY chunk is FAILED, and PARTIAL for
 * every mixed shape (including a DONE chunk next to a FAILED one) — because a
 * mixed stage did partially succeed, which is exactly what PARTIAL means to
 * the operator reading the row. Zero chunks means the stage was never queued.
 */
export function aggregateChunkResults(chunks: ChunkOutcome[]): ChunkOutcome {
  if (chunks.length === 0) return skippedResult()
  let total = 0
  let completed = 0
  let failed = 0
  for (const c of chunks) {
    total += c.total
    completed += c.completed
    failed += c.failed
  }
  const status = chunks.every((c) => c.status === "DONE")
    ? "DONE"
    : chunks.every((c) => c.status === "FAILED")
      ? "FAILED"
      : "PARTIAL"
  return { status, total, completed, failed }
}

/** Stable map key for "chunk C of stage S" — used by every per-chunk record below. */
function chunkKey(stage: number, chunk: number): string {
  return `${stage}:${chunk}`
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

  // plans[s] === undefined  → stage s's request set is not computed yet
  // plans[s] === []         → stage s is skipped (its request set was empty)
  // plans[s] === [[…], […]] → stage s runs these chunks, in this order
  const [plans, setPlans] = useState<(string[][] | undefined)[]>([undefined, undefined, undefined])
  // Per-chunk records, keyed by chunkKey(stage, chunk). Flat records (rather
  // than nested arrays) keep every state update a one-line immutable spread.
  const [chunkJobIds, setChunkJobIds] = useState<Record<string, string>>({})
  const [chunkResults, setChunkResults] = useState<Record<string, ChunkResult>>({})
  // Per-chunk failure detail, fetched at most once per chunk. Doubles as the
  // source for the "View failures" panel (see failure handling below), so the
  // panel needs no query of its own and can show failures ACROSS a stage's
  // chunks — the alternative (re-fetching each chunk jobId on demand when the
  // panel opens) needs the same one-at-a-time cursor plus a second accumulator,
  // so accumulating once, here, is the cleaner of the two options.
  const [chunkFailures, setChunkFailures] = useState<Record<string, BulkMBHeadJobFailure[]>>({})
  // Chunks whose failure detail could not be fetched at all. Without this the
  // chain would wait forever on a detail that is never coming (Close stays
  // disabled); instead we treat such a chunk as contributing NO succeeded ids,
  // which is the safe direction — it never pushes an id into a stage it is not
  // eligible for.
  const [failuresErrored, setFailuresErrored] = useState<Record<string, true>>({})
  // The single chunk whose failures we are fetching right now (or null).
  const [failuresRequest, setFailuresRequest] = useState<{ stage: number; chunk: number } | null>(null)
  const [phase, setPhase] = useState<"idle" | "running" | "complete">("idle")
  const [viewFailuresStage, setViewFailuresStage] = useState<number | null>(null)

  // Guards against double-starting a chunk (e.g. effect re-runs before the
  // async mutate() state settles) — each `${stage}:${chunk}` may only ever be
  // started once per dialog "open" lifecycle.
  const startedChunks = useRef<Set<string>>(new Set())

  const unvalidateM = useBulkForceUnvalidateMBHeads()
  const submitM = useBulkSubmitMBHeads()
  const validateM = useBulkValidateMBHeads()

  // The one chunk currently in flight: it has a jobId but no recorded result
  // yet. Sequential execution guarantees there is at most one such chunk, so
  // this drives the single status poll below.
  const activeChunk = useMemo(() => {
    for (let s = 0; s < 3; s++) {
      const plan = plans[s]
      if (!plan) break
      for (let c = 0; c < plan.length; c++) {
        const key = chunkKey(s, c)
        if (chunkJobIds[key] && !chunkResults[key]) return { stage: s, chunk: c }
      }
    }
    return null
  }, [plans, chunkJobIds, chunkResults])

  const statusQuery = useBulkMBHeadJobStatus(
    activeChunk ? chunkJobIds[chunkKey(activeChunk.stage, activeChunk.chunk)] : undefined,
  )

  // Exactly ONE failures query is ever alive, pointed at whichever chunk the
  // chain (or the "View failures" panel) currently needs detail for.
  const failuresQuery = useBulkMBHeadJobFailures(
    failuresRequest ? chunkJobIds[chunkKey(failuresRequest.stage, failuresRequest.chunk)] : undefined,
  )

  // Aggregated, render-ready result per stage. undefined while the stage is
  // still planning or still has unfinished chunks.
  const stageResults = useMemo<(StageResult | undefined)[]>(() => {
    return [0, 1, 2].map((s) => {
      const plan = plans[s]
      if (!plan) return undefined
      const outcomes: ChunkResult[] = []
      for (let c = 0; c < plan.length; c++) {
        const r = chunkResults[chunkKey(s, c)]
        if (!r) return undefined
        outcomes.push(r)
      }
      return aggregateChunkResults(outcomes)
    })
  }, [plans, chunkResults])

  // A chunk needs per-item failure detail when it terminated PARTIALLY — some
  // but not all of its own request set failed — because only then is per-id
  // detail required to work out which ids may advance to the next stage. A
  // chunk that fully succeeded or fully failed is decided by its counters
  // alone (see stageSucceeded below).
  function chunkNeedsFailureDetail(stage: number, chunk: number): boolean {
    const r = chunkResults[chunkKey(stage, chunk)]
    return !!r && r.status !== SKIPPED && r.failed > 0 && r.failed < r.total
  }

  /** First chunk of `stage` that is missing failure detail it needs, or -1. */
  function pendingChainFailureChunk(stage: number): number {
    const plan = plans[stage]
    if (!plan) return -1
    for (let c = 0; c < plan.length; c++) {
      const key = chunkKey(stage, c)
      if (chunkNeedsFailureDetail(stage, c) && !chunkFailures[key] && !failuresErrored[key]) return c
    }
    return -1
  }

  /** First chunk of `stage` with failures the panel has not loaded yet, or -1. */
  function pendingPanelFailureChunk(stage: number): number {
    const plan = plans[stage]
    if (!plan) return -1
    for (let c = 0; c < plan.length; c++) {
      const key = chunkKey(stage, c)
      const r = chunkResults[key]
      if (!r || r.failed === 0 || !r.jobId) continue
      if (!chunkFailures[key] && !failuresErrored[key]) return c
    }
    return -1
  }

  // Resolves which ids in a settled stage's OWN request set succeeded, as the
  // union across its chunks of (chunk request set minus that chunk's failed
  // ids). Returns undefined while that determination is still pending (a chunk
  // is not terminal yet, or its partial-failure detail hasn't loaded yet).
  function stageSucceeded(stage: number): string[] | undefined {
    const plan = plans[stage]
    if (!plan) return undefined
    const succeeded: string[] = []
    for (let c = 0; c < plan.length; c++) {
      const key = chunkKey(stage, c)
      const r = chunkResults[key]
      if (!r) return undefined
      if (r.failed === 0) {
        succeeded.push(...plan[c]) // whole chunk cleared
        continue
      }
      if (r.failed >= r.total) continue // every item in this chunk failed
      if (failuresErrored[key]) continue // detail unavailable → advance none of it
      const detail = chunkFailures[key]
      if (!detail) return undefined
      const failedIds = new Set(detail.map((f) => f.mbhId))
      succeeded.push(...plan[c].filter((id) => !failedIds.has(id)))
    }
    return succeeded
  }

  function startChunk(stage: number, chunk: number, ids: string[]) {
    const key = chunkKey(stage, chunk)
    if (startedChunks.current.has(key)) return
    startedChunks.current.add(key)

    setPhase("running")

    function onQueued(data: { jobId: string }) {
      setChunkJobIds((prev) => ({ ...prev, [key]: data.jobId }))
    }
    function onQueueError(error: Error) {
      // The queueing call itself failed — there is no job to poll. Record THIS
      // CHUNK (not the whole stage) as fully failed, keep the message so the
      // row can explain itself, and let the driver move on to the next chunk:
      // one rejected batch must not abandon the other 6 of 7.
      setChunkResults((prev) => ({
        ...prev,
        [key]: {
          jobId: "",
          jobCode: "",
          status: "FAILED",
          total: ids.length,
          completed: 0,
          failed: ids.length,
          queueError: error.message || "Failed to queue this batch",
        },
      }))
    }

    if (stage === 0) {
      unvalidateM.mutate({ mbhIds: ids, reason: UNVALIDATE_REASON }, { onSuccess: onQueued, onError: onQueueError })
    } else if (stage === 1) {
      submitM.mutate(ids, { onSuccess: onQueued, onError: onQueueError })
    } else {
      validateM.mutate(ids, { onSuccess: onQueued, onError: onQueueError })
    }
  }

  // Plan stage 0 (Unvalidate, against the VALIDATED bucket) once the dialog
  // opens; reset all local state when it closes so the next open starts a
  // fresh chain.
  useEffect(() => {
    if (open) {
      setPhase("running")
      setPlans([chunkIds(buckets.validated), undefined, undefined])
    } else {
      startedChunks.current = new Set()
      setPlans([undefined, undefined, undefined])
      setChunkJobIds({})
      setChunkResults({})
      setChunkFailures({})
      setFailuresErrored({})
      setFailuresRequest(null)
      setPhase("idle")
      setViewFailuresStage(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Record the in-flight chunk's result once its polled status goes terminal.
  useEffect(() => {
    const data = statusQuery.data
    if (!data || !activeChunk || !isTerminal(data.status)) return
    const key = chunkKey(activeChunk.stage, activeChunk.chunk)
    setChunkResults((prev) => {
      if (prev[key]) return prev
      return {
        ...prev,
        [key]: {
          jobId: data.jobId,
          jobCode: data.jobCode,
          status: data.status,
          total: data.totalChildren,
          completed: data.completedChildren,
          failed: data.failedChildren,
        },
      }
    })
  }, [statusQuery.data, activeChunk])

  // Park a fetched (or un-fetchable) chunk's failure detail and release the
  // single failures slot for the next requester.
  useEffect(() => {
    if (!failuresRequest) return
    const key = chunkKey(failuresRequest.stage, failuresRequest.chunk)
    if (failuresQuery.data) {
      const data = failuresQuery.data
      setChunkFailures((prev) => (prev[key] ? prev : { ...prev, [key]: data }))
      setFailuresRequest(null)
    } else if (failuresQuery.isError) {
      setFailuresErrored((prev) => ({ ...prev, [key]: true }))
      setFailuresRequest(null)
    }
  }, [failuresQuery.data, failuresQuery.isError, failuresRequest])

  // Point the single failures query at whichever chunk needs detail. The chain
  // wins over the panel: stages 0 and 1 need detail to compute the NEXT
  // stage's request set, so blocking on that is what keeps the chain moving.
  // (Stage 2 never feeds another stage, so its detail is fetched on demand
  // only — exactly as before chunking.)
  useEffect(() => {
    if (phase === "idle" || failuresRequest) return
    for (const stage of [0, 1]) {
      const chunk = pendingChainFailureChunk(stage)
      if (chunk >= 0) {
        setFailuresRequest({ stage, chunk })
        return
      }
    }
    if (viewFailuresStage !== null) {
      const chunk = pendingPanelFailureChunk(viewFailuresStage)
      if (chunk >= 0) setFailuresRequest({ stage: viewFailuresStage, chunk })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, failuresRequest, plans, chunkResults, chunkFailures, failuresErrored, viewFailuresStage])

  // The driver. Walks the chain in order and performs exactly ONE action per
  // run, then returns: start the next chunk of the current stage, or — once a
  // stage's chunks have all settled — plan the next stage from its own bucket
  // plus whatever succeeded upstream. Once stage 2 has settled (ran or
  // skipped), the chain is complete.
  useEffect(() => {
    if (phase === "idle") return

    for (let s = 0; s < 3; s++) {
      const plan = plans[s]
      if (!plan) return // waiting on the previous stage to plan this one

      const nextChunk = plan.findIndex((_, c) => !chunkResults[chunkKey(s, c)])
      if (nextChunk >= 0) {
        startChunk(s, nextChunk, plan[nextChunk])
        return
      }

      // Every chunk of stage s has settled (a zero-chunk plan settles instantly).
      if (s === 2) {
        if (phase !== "complete") setPhase("complete")
        return
      }

      const succeeded = stageSucceeded(s)
      if (succeeded === undefined) return // blocked on failure detail; the effect above is fetching it

      if (plans[s + 1] === undefined) {
        const nextIds = s === 0 ? [...buckets.draft, ...succeeded] : [...buckets.submitted, ...succeeded]
        setPlans((prev) => {
          const next = [...prev]
          next[s + 1] = chunkIds(nextIds)
          return next
        })
        return
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, plans, chunkResults, chunkFailures, failuresErrored])

  const settled = phase === "complete"

  // Accumulated failure detail for the stage whose panel is open, in chunk order.
  const panelFailures = useMemo<BulkMBHeadJobFailure[]>(() => {
    if (viewFailuresStage === null) return []
    const plan = plans[viewFailuresStage]
    if (!plan) return []
    const out: BulkMBHeadJobFailure[] = []
    for (let c = 0; c < plan.length; c++) {
      const detail = chunkFailures[chunkKey(viewFailuresStage, c)]
      if (detail) out.push(...detail)
    }
    return out
  }, [viewFailuresStage, plans, chunkFailures])
  const panelLoading = viewFailuresStage !== null && pendingPanelFailureChunk(viewFailuresStage) >= 0

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
              result={stageResults[idx]}
              isActive={activeChunk?.stage === idx}
              isPending={!stageResults[idx] && activeChunk?.stage !== idx}
              chunkCount={plans[idx]?.length ?? 0}
              activeChunkIndex={activeChunk?.stage === idx ? activeChunk.chunk : undefined}
              queueErrors={collectQueueErrors(idx, plans[idx], chunkResults)}
              onViewFailures={() => setViewFailuresStage(idx)}
              viewingFailures={viewFailuresStage === idx}
            />
          ))}

          {viewFailuresStage !== null && (
            <div className="rounded-md border p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Failures — Step {viewFailuresStage + 1}: {STAGE_LABELS[STAGE_ORDER[viewFailuresStage]]}
              </p>
              {panelLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading failures…
                </div>
              )}
              {!panelLoading && panelFailures.length === 0 && (
                <p className="text-sm text-muted-foreground">No failures recorded.</p>
              )}
              {!panelLoading && panelFailures.length > 0 && (
                <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
                  {panelFailures.map((f) => (
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
                const skippedCount = stageResults.filter((r) => r?.status === SKIPPED).length
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

/** Queue-failure messages recorded against a stage's chunks, in chunk order. */
function collectQueueErrors(
  stage: number,
  plan: string[][] | undefined,
  chunkResults: Record<string, ChunkResult>,
): string[] {
  if (!plan) return []
  const out: string[] = []
  for (let c = 0; c < plan.length; c++) {
    const err = chunkResults[chunkKey(stage, c)]?.queueError
    if (err) out.push(plan.length > 1 ? `Batch ${c + 1}/${plan.length}: ${err}` : err)
  }
  return out
}

function StageRow({
  label,
  stepNumber,
  result,
  isActive,
  isPending,
  chunkCount,
  activeChunkIndex,
  queueErrors,
  onViewFailures,
  viewingFailures,
}: {
  label: string
  stepNumber: number
  result: StageResult | undefined
  isActive: boolean
  isPending: boolean
  /** How many API batches this stage was split into (0 while unplanned/skipped). */
  chunkCount: number
  /** 0-based index of the batch currently in flight, when this stage is active. */
  activeChunkIndex: number | undefined
  queueErrors: string[]
  onViewFailures: () => void
  viewingFailures: boolean
}) {
  const skipped = result?.status === SKIPPED
  const pct = result && result.total > 0 ? Math.round(((result.completed + result.failed) / result.total) * 100) : 0
  // Batch progress is additive noise for the single-chunk case (≤ 500 ids),
  // which is the overwhelming majority — so it only ever appears when the
  // stage genuinely had to be split.
  const batchSuffix = chunkCount > 1 && activeChunkIndex !== undefined
    ? ` (batch ${activeChunkIndex + 1}/${chunkCount})`
    : ""

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
          <p className="text-xs text-muted-foreground">Processing…{batchSuffix}</p>
        </>
      )}
      {result && !skipped && (
        <Progress value={pct} className="h-1.5" />
      )}
      {queueErrors.map((err, i) => (
        <p key={i} className="text-xs text-destructive">Could not queue — {err}</p>
      ))}
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
