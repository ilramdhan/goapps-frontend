import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

let breakdown: { data?: unknown; isLoading: boolean; isError: boolean } = {
  data: { paramSnapshot: {} }, isLoading: false, isError: false,
}
const result = {
  costId: 1, productSysId: 1, productCode: "P1", productName: "Prod", period: "202601",
  status: "CALCULATED", rmDetails: [],
}

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock("@/components/common/dynamic-breadcrumb", () => ({ useBreadcrumbTrail: () => {} }))
vi.mock("@/components/common/user-name", () => ({ UserName: () => <span>Alice</span> }))
vi.mock("@/providers/permission-provider", () => ({
  usePermissionContext: () => ({ hasPermission: () => false }),
}))
vi.mock("@/hooks/finance/use-cost-product-master", () => ({ useCostProductMaster: () => ({ data: undefined }) }))
vi.mock("@/hooks/finance/use-erp-integration", () => ({ useErpPeriodLock: () => ({ data: undefined }) }))
vi.mock("@/hooks/finance/use-cost-calc", () => ({
  useCostResult: () => ({ data: result, isLoading: false }),
  useCostBreakdown: () => breakdown,
  useVerifyCost: () => ({ mutate: vi.fn(), isPending: false }),
  useApproveCost: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock("@/components/finance/cost-results/cost-breakdown-modal", () => ({ CostBreakdownModal: () => null }))
vi.mock("@/components/finance/cost-results/cost-history-tab", () => ({ CostHistoryTab: () => null }))

import { CostResultDetail } from "@/components/finance/cost-results/cost-result-detail"

describe("CostResultDetail conversion fields", () => {
  it("shows em dash (not 0) for missing params", () => {
    render(<CostResultDetail productSysId={1} period="202601" calcType={"ACTUAL" as never} />)
    expect(screen.getByText("Cap Cost")).toBeInTheDocument()
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(4)
  })

  it("shows values and stage when present", () => {
    breakdown = {
      data: { paramSnapshot: { TOTAL_CAP_CONV: "12.5", CAP_CONV_STAGE: "SPIN" } },
      isLoading: false, isError: false,
    }
    render(<CostResultDetail productSysId={1} period="202601" calcType={"ACTUAL" as never} />)
    expect(screen.getByText("Stage: SPIN")).toBeInTheDocument()
  })
})
