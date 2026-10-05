import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

import { JobStatus } from "@/types/generated/finance/v1/oracle_sync"

const { job } = vi.hoisted(() => ({ job: { current: undefined as unknown } }))
vi.mock("@/hooks/finance/use-erp-integration", () => ({
  useErpJob: () => ({ data: job.current ? { data: job.current } : undefined }),
}))

import { ErpJobProgress } from "@/components/finance/erp-integration/detail/erp-job-progress"
import { jobIdOf } from "@/components/finance/erp-integration/detail/erp-step-actions"

beforeEach(() => { job.current = undefined })

describe("ErpJobProgress", () => {
  it("shows status and percentage while processing", () => {
    job.current = { status: JobStatus.JOB_STATUS_PROCESSING, progress: 42, errorMessage: "" }
    render(<ErpJobProgress jobId="j1" batchId={7} onDone={() => {}} />)
    expect(screen.getByTestId("job-progress")).toBeInTheDocument()
    expect(screen.getByText("42%")).toBeInTheDocument()
  })
  it("hides and clears on a terminal success status", () => {
    job.current = { status: JobStatus.JOB_STATUS_SUCCESS, progress: 100, errorMessage: "" }
    const onDone = vi.fn()
    render(<ErpJobProgress jobId="j1" batchId={7} onDone={onDone} />)
    expect(screen.queryByTestId("job-progress")).not.toBeInTheDocument()
    expect(onDone).toHaveBeenCalled()
  })
  it("shows the job error on FAILED", () => {
    job.current = { status: JobStatus.JOB_STATUS_FAILED, progress: 10, errorMessage: "oracle unreachable" }
    const onDone = vi.fn()
    render(<ErpJobProgress jobId="j1" batchId={7} onDone={onDone} />)
    expect(screen.getByText("oracle unreachable")).toBeInTheDocument()
    expect(onDone).not.toHaveBeenCalled()
  })
})

describe("jobIdOf", () => {
  it("extracts a job id from a mutation result", () => {
    expect(jobIdOf({ jobId: "abc", batchId: 1 })).toBe("abc")
    expect(jobIdOf({})).toBeUndefined()
    expect(jobIdOf(undefined)).toBeUndefined()
  })
})
