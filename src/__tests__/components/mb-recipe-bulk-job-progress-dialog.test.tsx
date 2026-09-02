/**
 * Tests for MbRecipeBulkJobProgressDialog's ADAPTIVE stage-progression logic
 * (Bulk MB Head Regenerate, widened selection eligibility):
 *   - a selection is bucketed by each item's STARTING entryStatus (DRAFT /
 *     SUBMITTED / VALIDATED)
 *   - stage 1 (Unvalidate) only runs against the VALIDATED bucket; empty ->
 *     skipped, never called
 *   - stage 2 (Submit) runs against DRAFT ∪ (VALIDATED items that succeeded
 *     stage 1); empty -> skipped
 *   - stage 3 (Validate) runs against SUBMITTED ∪ (whatever succeeded stage 2)
 *   - ids that fail a stage are dropped, never carried into the next stage's
 *     request set
 *
 * Mocks `@/hooks/finance/use-mb-head-bulk` directly, mirroring the module-mock
 * convention used by mb-recipe-action-bar-return-to-draft.test.tsx. The polling
 * status hook (`useBulkMBHeadJobStatus`) is reimplemented as a tiny reactive
 * stub backed by a manual pubsub + useState, since the real hook's
 * refetchInterval polling behavior isn't what's under test here — only the
 * dialog's reaction to terminal status data is.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import { useEffect, useState } from "react"

import type { MBHeadEntryStatus } from "@/types/finance/mb-head"

// ─── Reactive status store (pubsub) ────────────────────────────────────────

type JobStatusData = {
  jobId: string
  jobCode: string
  status: string
  totalChildren: number
  completedChildren: number
  failedChildren: number
}

let statusStore: Record<string, JobStatusData | undefined> = {}
let listeners: Array<() => void> = []

function setJobStatus(jobId: string, data: JobStatusData) {
  act(() => {
    statusStore[jobId] = data
    listeners.forEach((l) => l())
  })
}

function resetStatusStore() {
  statusStore = {}
  listeners = []
}

// ─── Module mocks ───────────────────────────────────────────────────────────

let nextJobSeq = 0
const unvalidateMutate = vi.fn((_vars, opts?: { onSuccess?: (d: { jobId: string }) => void }) => {
  opts?.onSuccess?.({ jobId: `job-unvalidate-${nextJobSeq++}` })
})
const submitMutate = vi.fn((_vars, opts?: { onSuccess?: (d: { jobId: string }) => void }) => {
  opts?.onSuccess?.({ jobId: `job-submit-${nextJobSeq++}` })
})
const validateMutate = vi.fn((_vars, opts?: { onSuccess?: (d: { jobId: string }) => void }) => {
  opts?.onSuccess?.({ jobId: `job-validate-${nextJobSeq++}` })
})

vi.mock("@/hooks/finance/use-mb-head-bulk", () => ({
  useBulkForceUnvalidateMBHeads: () => ({ mutate: unvalidateMutate, isPending: false }),
  useBulkSubmitMBHeads: () => ({ mutate: submitMutate, isPending: false }),
  useBulkValidateMBHeads: () => ({ mutate: validateMutate, isPending: false }),
  useBulkMBHeadJobStatus: (jobId: string | undefined) => {
    const [, force] = useState(0)
    useEffect(() => {
      const l = () => force((x) => x + 1)
      listeners.push(l)
      return () => {
        listeners = listeners.filter((x) => x !== l)
      }
    }, [])
    return { data: jobId ? statusStore[jobId] : undefined, isLoading: false }
  },
  useBulkMBHeadJobFailures: () => ({ data: [], isLoading: false }),
}))

// ─── Import under test (after all mocks are registered) ──────────────────────

import { MbRecipeBulkJobProgressDialog } from "@/components/finance/mb-recipe/mb-recipe-bulk-job-progress-dialog"

// ─── Helpers ────────────────────────────────────────────────────────────────

function done(jobId: string, total = 2): JobStatusData {
  return { jobId, jobCode: jobId, status: "DONE", totalChildren: total, completedChildren: total, failedChildren: 0 }
}

function failed(jobId: string, total = 2): JobStatusData {
  return { jobId, jobCode: jobId, status: "FAILED", totalChildren: total, completedChildren: 0, failedChildren: total }
}

function selectionOf(entries: Array<[string, MBHeadEntryStatus]>): Map<string, MBHeadEntryStatus> {
  return new Map(entries)
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("MbRecipeBulkJobProgressDialog — adaptive stage progression", () => {
  beforeEach(() => {
    resetStatusStore()
    nextJobSeq = 0
    unvalidateMutate.mockClear()
    submitMutate.mockClear()
    validateMutate.mockClear()
  })

  it("starts stage 1 (Unvalidate) immediately for a VALIDATED-only selection", () => {
    render(
      <MbRecipeBulkJobProgressDialog
        open
        selection={selectionOf([["a", "VALIDATED"], ["b", "VALIDATED"]])}
        onOpenChange={() => {}}
        onSettled={() => {}}
      />,
    )
    expect(unvalidateMutate).toHaveBeenCalledTimes(1)
    expect(unvalidateMutate.mock.calls[0][0]).toEqual({ mbhIds: ["a", "b"], reason: expect.any(String) })
    expect(submitMutate).not.toHaveBeenCalled()
    expect(validateMutate).not.toHaveBeenCalled()
  })

  it("skips stage 1 and starts stage 2 (Submit) immediately for a DRAFT-only selection", () => {
    render(
      <MbRecipeBulkJobProgressDialog
        open
        selection={selectionOf([["d1", "DRAFT"]])}
        onOpenChange={() => {}}
        onSettled={() => {}}
      />,
    )
    expect(unvalidateMutate).not.toHaveBeenCalled()
    expect(submitMutate).toHaveBeenCalledTimes(1)
    expect(submitMutate.mock.calls[0][0]).toEqual(["d1"])
    expect(screen.getByText(/skipped/i)).toBeInTheDocument()
  })

  it("skips stages 1 and 2, starts stage 3 (Validate) immediately for a SUBMITTED-only selection", () => {
    render(
      <MbRecipeBulkJobProgressDialog
        open
        selection={selectionOf([["s1", "SUBMITTED"]])}
        onOpenChange={() => {}}
        onSettled={() => {}}
      />,
    )
    expect(unvalidateMutate).not.toHaveBeenCalled()
    expect(submitMutate).not.toHaveBeenCalled()
    expect(validateMutate).toHaveBeenCalledTimes(1)
    expect(validateMutate.mock.calls[0][0]).toEqual(["s1"])
  })

  it("advances DONE -> Submit -> DONE -> Validate for a VALIDATED-only selection, carrying the same ids forward on full success", () => {
    render(
      <MbRecipeBulkJobProgressDialog
        open
        selection={selectionOf([["a", "VALIDATED"], ["b", "VALIDATED"]])}
        onOpenChange={() => {}}
        onSettled={() => {}}
      />,
    )

    // Stage 1 (Unvalidate) queued — the mock's onSuccess fired synchronously
    // with a deterministic id: job-unvalidate-0.
    setJobStatus("job-unvalidate-0", done("job-unvalidate-0"))

    // Submit (stage 2) should now have been triggered, with the SAME ids.
    expect(submitMutate).toHaveBeenCalledTimes(1)
    expect(submitMutate.mock.calls[0][0]).toEqual(["a", "b"])
    expect(validateMutate).not.toHaveBeenCalled()

    setJobStatus("job-submit-1", done("job-submit-1"))

    // Validate (stage 3) should now have been triggered, with the SAME ids.
    expect(validateMutate).toHaveBeenCalledTimes(1)
    expect(validateMutate.mock.calls[0][0]).toEqual(["a", "b"])

    setJobStatus("job-validate-2", done("job-validate-2"))

    expect(screen.getByText(/regenerate finished/i)).toBeInTheDocument()
  })

  it("drops ids that fully failed a stage, skipping downstream stages when nothing remains", () => {
    render(
      <MbRecipeBulkJobProgressDialog
        open
        selection={selectionOf([["a", "VALIDATED"], ["b", "VALIDATED"]])}
        onOpenChange={() => {}}
        onSettled={() => {}}
      />,
    )

    // Stage 1 (Unvalidate) fully fails — zero succeeded, and this selection has
    // no DRAFT/SUBMITTED items to fall back on, so stages 2 and 3 both end up
    // with an empty request set and are SKIPPED rather than called.
    setJobStatus("job-unvalidate-0", failed("job-unvalidate-0"))

    expect(submitMutate).not.toHaveBeenCalled()
    expect(validateMutate).not.toHaveBeenCalled()
    expect(screen.getByText(/regenerate finished/i)).toBeInTheDocument()

    // Close is enabled once the whole chain has settled (every stage ran or was
    // skipped). Two buttons match the "Close" accessible name — the footer
    // button and the dialog's default X close button (sr-only label) — so pick
    // the footer one, which is the only one this dialog gates on `settled`.
    const footerClose = screen.getAllByRole("button", { name: /^close$/i }).find((b) => !b.querySelector(".sr-only"))
    expect(footerClose).toBeEnabled()
  })

  it("a fully-failed Submit stage still lets Validate run against the SUBMITTED bucket", () => {
    render(
      <MbRecipeBulkJobProgressDialog
        open
        selection={selectionOf([["a", "VALIDATED"], ["s1", "SUBMITTED"]])}
        onOpenChange={() => {}}
        onSettled={() => {}}
      />,
    )

    setJobStatus("job-unvalidate-0", done("job-unvalidate-0", 1))
    expect(submitMutate).toHaveBeenCalledTimes(1)
    expect(submitMutate.mock.calls[0][0]).toEqual(["a"])

    setJobStatus("job-submit-1", failed("job-submit-1", 1))

    // "a" failed Submit and is dropped, but "s1" (originally SUBMITTED) still
    // reaches Validate — the two buckets are independent.
    expect(validateMutate).toHaveBeenCalledTimes(1)
    expect(validateMutate.mock.calls[0][0]).toEqual(["s1"])
  })
})
