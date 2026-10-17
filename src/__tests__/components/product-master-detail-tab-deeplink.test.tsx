/** Product master detail page — `?tab=` deep link selects the initial tab (Denier RM). */
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@/__tests__/utils"

const permissionState: { hasPermission: (code: string) => boolean } = { hasPermission: () => true }

const PRODUCT = {
  productSysId: 5,
  productCode: "CST001",
  productName: "Yarn A",
  productTypeId: 1,
  productTypeName: "Type",
  shadeCode: "S1",
  shadeName: "Blue",
  gradeCode: "AX",
  isActive: true,
  isLocked: false,
  source: "MANUAL",
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))
vi.mock("@/providers/permission-provider", () => ({
  usePermissionContext: () => ({ hasPermission: permissionState.hasPermission }),
}))
vi.mock("@/hooks/finance/use-cost-product-master", () => ({
  useCostProductMaster: () => ({ data: PRODUCT, isLoading: false }),
}))
vi.mock("@/components/finance/calc-jobs/calculate-button", () => ({ CalculateButton: () => null }))
vi.mock("@/components/finance/cost-product-master/parameters-tab", () => ({ ProductParametersTab: () => null }))
vi.mock("@/components/finance/cost-product-master/routing-tab", () => ({ ProductRoutingTab: () => null }))
vi.mock("@/components/finance/cost-product-master/rm-denier-override-tab", () => ({
  RmDenierOverrideTab: ({ highlightRm }: { highlightRm?: string }) => <div>denier-tab:{highlightRm ?? ""}</div>,
}))
vi.mock("@/components/finance/cost-product-master/audit-tab", () => ({ ProductAuditTab: () => null }))
vi.mock("@/components/finance/cost-results/cost-history-tab", () => ({ CostHistoryTab: () => null }))
vi.mock("@/components/finance/cost-product-master/mb-recipe-link-card", () => ({ MbRecipeLinkCard: () => null }))
vi.mock("@/components/finance/cost-product-master/unlock-dialog", () => ({ UnlockProductMasterDialog: () => null }))
vi.mock("@/components/finance/cost-product-master/product-master-form-dialog", () => ({
  ProductMasterFormDialog: ({ open, product }: { open: boolean; product?: { productCode: string } | null }) =>
    open ? <div>edit-dialog-open:{product?.productCode}</div> : null,
}))

import ProductMasterDetailClient from "@/app/(dashboard)/finance/product-master/[productSysId]/detail-client"

describe("ProductMasterDetailClient tab deep link", () => {
  it("defaults to Parameters", () => {
    render(<ProductMasterDetailClient productSysId={5} />)
    expect(screen.getByRole("tab", { name: "Parameters" })).toHaveAttribute("aria-selected", "true")
    expect(screen.queryByText(/denier-tab:/)).not.toBeInTheDocument()
  })

  it("opens Denier RM with the highlighted RM", () => {
    render(<ProductMasterDetailClient productSysId={5} initialTab="denier-rm" highlightRm="GROUP:SPX" />)
    expect(screen.getByRole("tab", { name: "Denier RM" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByText("denier-tab:GROUP:SPX")).toBeInTheDocument()
  })

  it("falls back to Parameters for an unknown tab", () => {
    render(<ProductMasterDetailClient productSysId={5} initialTab="bogus" />)
    expect(screen.getByRole("tab", { name: "Parameters" })).toHaveAttribute("aria-selected", "true")
  })
})
