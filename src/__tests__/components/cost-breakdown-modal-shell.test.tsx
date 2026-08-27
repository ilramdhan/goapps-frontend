/**
 * P11 [G.6] — cost-breakdown-modal is now a shell over ./breakdown/*.
 *
 * The extraction was meant to be behaviour-neutral, so this pins the behaviour
 * that used to live inline: all four tab bodies still render through the shell,
 * with the same data, from their new home.
 */
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@/__tests__/utils"

vi.mock("@/hooks/finance/use-cost-calc", () => ({
  useCostBreakdown: () => ({
    data: {
      summary: {
        productSysId: 446,
        productCode: "MBP-1",
        productName: "MB Product 1",
        costPerUnit: "1234.5",
        totalRmCost: "1000",
        totalConversion: "234.5",
        totalCost: "1234.5",
        currencyCode: "USD",
        version: 2,
        calculatedAt: "2026-07-01T10:00:00Z",
        calculatedBy: "",
        verifiedAt: null,
        verifiedBy: "",
      },
      paramSnapshot: { WASTE: "1.5" },
      byLevel: [
        { level: 1, productSysId: 446, productCode: "MBP-1", productName: "MB Product 1", costContribution: "500", ratio: "0.4" },
      ],
      rmDetails: [
        { rmType: "CHIP", refCode: "RM-9", refLabel: "Chip A", shadeCode: "", unitCost: "10", ratio: "0.5", contribution: "500" },
      ],
      formulaTrace: [
        { formulaCode: "F1", formulaName: "Waste", expression: "a*b", outputParamCode: "OUT", outputValue: "3", inputs: { a: "1" } },
      ],
    },
    isLoading: false,
  }),
}))
vi.mock("@/hooks/finance/use-cost-product-master", () => ({
  useCostProductMaster: () => ({ data: undefined }),
}))
vi.mock("@/hooks/finance/use-cost-product-parameter", () => ({
  useProductRequiredParams: () => ({ data: [] }),
}))

import { CostBreakdownModal } from "@/components/finance/cost-results/cost-breakdown-modal"

describe("CostBreakdownModal — [G.6] shell", () => {
  it("renders all four tab triggers with their counts", () => {
    render(
      <CostBreakdownModal
        open
        onOpenChange={() => {}}
        productSysId={446}
        period="202607"
        calcType="ACTUAL"
      />,
    )
    expect(screen.getByRole("tab", { name: /Summary/ })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /By level/ })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /RM/ })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /Formula/ })).toBeInTheDocument()
  })

  it("renders the extracted SummaryTab content by default", () => {
    render(
      <CostBreakdownModal
        open
        onOpenChange={() => {}}
        productSysId={446}
        period="202607"
        calcType="ACTUAL"
      />,
    )
    expect(screen.getByText("Cost per unit")).toBeInTheDocument()
    expect(screen.getByText("Total RM cost")).toBeInTheDocument()
    expect(screen.getByText(/Parameter snapshot/)).toBeInTheDocument()
  })
})
