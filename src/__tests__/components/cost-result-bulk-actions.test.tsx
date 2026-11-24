import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"

let perms: string[] = []
const verifyMutate = vi.fn()
const approveMutate = vi.fn()

vi.mock("@/providers/permission-provider", () => ({
  usePermissionContext: () => ({ hasPermission: (c: string) => perms.includes(c) }),
}))
vi.mock("@/hooks/finance/use-cost-calc", async (orig) => ({
  ...(await orig<typeof import("@/hooks/finance/use-cost-calc")>()),
  useBulkVerifyCosts: () => ({ mutateAsync: verifyMutate, isPending: false }),
  useBulkApproveCosts: () => ({ mutateAsync: approveMutate, isPending: false }),
}))

import { CostResultBulkActions, failuresToCsv } from "@/components/finance/cost-results/cost-result-bulk-actions"
import { normalizeBulkOutcome } from "@/hooks/finance/use-cost-calc"

const filter = { period: "202608", calculationType: "ACTUAL" }

describe("CostResultBulkActions", () => {
  beforeEach(() => {
    perms = ["finance.cost.result.verify", "finance.cost.result.approve"]
    verifyMutate.mockReset()
    approveMutate.mockReset()
  })

  it("renders nothing without verify/approve permission", () => {
    perms = []
    const { container } = render(
      <CostResultBulkActions selectedIds={[1]} filter={filter} totalMatching={5} onClearSelection={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("shows only the permitted action", () => {
    perms = ["finance.cost.result.verify"]
    render(<CostResultBulkActions selectedIds={[1]} filter={filter} totalMatching={5} onClearSelection={vi.fn()} />)
    expect(screen.getByRole("button", { name: /Verify selected/ })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Approve/ })).not.toBeInTheDocument()
  })

  it("verifies the selected ids after confirm and shows the summary", async () => {
    verifyMutate.mockResolvedValue({
      okCount: 1, failedCount: 1, failures: [{ costId: 2, productCode: "P2", reason: "period is locked" }],
    })
    const clear = vi.fn()
    render(<CostResultBulkActions selectedIds={[1, 2]} filter={filter} totalMatching={5} onClearSelection={clear} />)
    fireEvent.click(screen.getByRole("button", { name: /Verify selected/ }))
    expect(verifyMutate).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: /^Verify$/ }))
    await waitFor(() => expect(verifyMutate).toHaveBeenCalledWith({ costIds: [1, 2] }))
    expect(await screen.findByText(/1 verified · 1 failed/)).toBeInTheDocument()
    expect(screen.getByText("period is locked")).toBeInTheDocument()
    expect(clear).toHaveBeenCalled()
  })

  it("approves all matching by filter when nothing is selected", async () => {
    approveMutate.mockResolvedValue({ okCount: 3, failedCount: 0, failures: [] })
    render(<CostResultBulkActions selectedIds={[]} filter={filter} totalMatching={3} onClearSelection={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: /Approve all matching/ }))
    fireEvent.click(screen.getByRole("button", { name: /^Approve$/ }))
    await waitFor(() => expect(approveMutate).toHaveBeenCalledWith(filter))
  })

  it("disables filter mode without a period", () => {
    render(<CostResultBulkActions selectedIds={[]} filter={{ period: "" }} totalMatching={3} onClearSelection={vi.fn()} />)
    expect(screen.getByRole("button", { name: /Verify all matching/ })).toBeDisabled()
  })
})

describe("bulk outcome helpers", () => {
  it("normalizes camel and snake case", () => {
    expect(normalizeBulkOutcome({ ok_count: 2, failed_count: 1, failures: [{ cost_id: "9", product_code: "X", reason: "r" }] }))
      .toEqual({ okCount: 2, failedCount: 1, failures: [{ costId: 9, productCode: "X", reason: "r" }] })
  })

  it("escapes CSV quotes", () => {
    expect(failuresToCsv({ okCount: 0, failedCount: 1, failures: [{ costId: 1, productCode: "A", reason: 'say "hi"' }] }))
      .toBe('cost_id,product_code,reason\n1,"A","say ""hi"""')
  })
})
