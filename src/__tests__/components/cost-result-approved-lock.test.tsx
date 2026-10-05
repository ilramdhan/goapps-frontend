import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"

let perms: string[] = []
let lock = { locked: true }
const result = {
  costId: 1, productSysId: 1, productCode: "P1", productName: "Prod", period: "202601",
  status: "APPROVED", approvedBy: "u1", approvedAt: "2026-01-05T00:00:00Z", rmDetails: [],
}
const lockSpy = vi.fn()

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock("@/components/common/dynamic-breadcrumb", () => ({ useBreadcrumbTrail: () => {} }))
vi.mock("@/components/common/user-name", () => ({ UserName: () => <span>Alice</span> }))
vi.mock("@/providers/permission-provider", () => ({
  usePermissionContext: () => ({ hasPermission: (c: string) => perms.includes(c) }),
}))
vi.mock("@/hooks/finance/use-cost-product-master", () => ({ useCostProductMaster: () => ({ data: undefined }) }))
vi.mock("@/hooks/finance/use-erp-integration", () => ({
  useErpPeriodLock: (p: string) => { lockSpy(p); return { data: p ? lock : undefined } },
}))
vi.mock("@/hooks/finance/use-cost-calc", () => ({
  useCostResult: () => ({ data: result, isLoading: false }),
  useVerifyCost: () => ({ mutate: vi.fn(), isPending: false }),
  useApproveCost: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock("@/components/finance/cost-results/cost-breakdown-modal", () => ({ CostBreakdownModal: () => null }))
vi.mock("@/components/finance/cost-results/cost-history-tab", () => ({ CostHistoryTab: () => null }))

import { CostResultDetail } from "@/components/finance/cost-results/cost-result-detail"

describe("CostResultDetail approved trail + lock badge", () => {
  beforeEach(() => { perms = []; lock = { locked: true }; lockSpy.mockClear() })

  it("shows the approved trail", () => {
    render(<CostResultDetail productSysId={1} period="202601" calcType={"ACTUAL" as never} />)
    expect(screen.getByText(/Approved by/)).toBeInTheDocument()
    expect(screen.getByText("Alice")).toBeInTheDocument()
  })

  it("shows the lock badge with permission", () => {
    perms = ["finance.cost.erpintegration.view"]
    render(<CostResultDetail productSysId={1} period="202601" calcType={"ACTUAL" as never} />)
    expect(screen.getByText("Period locked")).toBeInTheDocument()
  })

  it("hides the badge without permission", () => {
    render(<CostResultDetail productSysId={1} period="202601" calcType={"ACTUAL" as never} />)
    expect(screen.queryByText("Period locked")).toBeNull()
  })
})
