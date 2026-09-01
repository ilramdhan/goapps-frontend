/**
 * Tests for MbRecipeBulkJobProgressDialog's stage-progression logic (Phase G
 * frontend verification pass for the Bulk MB Head Regenerate feature):
 *   - a DONE result on a stage advances to the next stage (unvalidate -> submit
 *     -> validate), all three running in sequence for the same mbhIds
 *   - a FAILED result (zero succeeded) on any stage stops the chain early and
 *     never starts a later stage
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

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("MbRecipeBulkJobProgressDialog — stage progression", () => {
  beforeEach(() => {
    resetStatusStore()
    nextJobSeq = 0
    unvalidateMutate.mockClear()
    submitMutate.mockClear()
    validateMutate.mockClear()
  })

  it("starts stage 1 (Unvalidate) immediately on open", () => {
    render(
      <MbRecipeBulkJobProgressDialog open mbhIds={["a", "b"]} onOpenChange={() => {}} onSettled={() => {}} />,
    )
    expect(unvalidateMutate).toHaveBeenCalledTimes(1)
    expect(submitMutate).not.toHaveBeenCalled()
    expect(validateMutate).not.toHaveBeenCalled()
  })

  it("advances DONE -> Submit -> DONE -> Validate for the same full mbhIds selection", () => {
    render(
      <MbRecipeBulkJobProgressDialog open mbhIds={["a", "b"]} onOpenChange={() => {}} onSettled={() => {}} />,
    )

    // Stage 1 (Unvalidate) queued — the mock's onSuccess fired synchronously
    // with a deterministic id: job-unvalidate-0.
    setJobStatus("job-unvalidate-0", done("job-unvalidate-0"))

    // Submit (stage 2) should now have been triggered, with the SAME mbhIds.
    expect(submitMutate).toHaveBeenCalledTimes(1)
    expect(submitMutate.mock.calls[0][0]).toEqual(["a", "b"])
    expect(validateMutate).not.toHaveBeenCalled()

    setJobStatus("job-submit-1", done("job-submit-1"))

    // Validate (stage 3) should now have been triggered, with the SAME mbhIds.
    expect(validateMutate).toHaveBeenCalledTimes(1)
    expect(validateMutate.mock.calls[0][0]).toEqual(["a", "b"])

    setJobStatus("job-validate-2", done("job-validate-2"))

    expect(screen.getByText(/all 3 stages finished/i)).toBeInTheDocument()
  })

  it("stops the chain early when a stage comes back fully FAILED, never starting the next stage", () => {
    render(
      <MbRecipeBulkJobProgressDialog open mbhIds={["a", "b"]} onOpenChange={() => {}} onSettled={() => {}} />,
    )

    // Stage 1 (Unvalidate) fully fails — zero succeeded.
    setJobStatus("job-unvalidate-0", failed("job-unvalidate-0"))

    expect(submitMutate).not.toHaveBeenCalled()
    expect(validateMutate).not.toHaveBeenCalled()
    expect(screen.getByText(/chain stopped/i)).toBeInTheDocument()

    // Close is enabled once settled (stopped counts as settled). Two buttons
    // match the "Close" accessible name — the footer button and the dialog's
    // default X close button (sr-only label) — so pick the footer one, which
    // is the only one this dialog gates on `settled`.
    const footerClose = screen.getAllByRole("button", { name: /^close$/i }).find((b) => !b.querySelector(".sr-only"))
    expect(footerClose).toBeEnabled()
  })

  it("stops after a FAILED Submit stage without ever starting Validate", () => {
    render(
      <MbRecipeBulkJobProgressDialog open mbhIds={["a", "b"]} onOpenChange={() => {}} onSettled={() => {}} />,
    )

    setJobStatus("job-unvalidate-0", done("job-unvalidate-0"))
    expect(submitMutate).toHaveBeenCalledTimes(1)

    setJobStatus("job-submit-1", failed("job-submit-1"))

    expect(validateMutate).not.toHaveBeenCalled()
    expect(screen.getByText(/chain stopped/i)).toBeInTheDocument()
  })
})
