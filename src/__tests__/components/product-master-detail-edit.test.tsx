/**
 * Product master detail page — "Edit Product" header action reuses the list page's
 * ProductMasterFormDialog; gated on finance.product.master.update.
 */
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen } from "@/__tests__/utils"
import userEvent from "@testing-library/user-event"

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
vi.mock("@/components/finance/cost-product-master/audit-tab", () => ({ ProductAuditTab: () => null }))
vi.mock("@/components/finance/cost-results/cost-history-tab", () => ({ CostHistoryTab: () => null }))
vi.mock("@/components/finance/cost-product-master/mb-recipe-link-card", () => ({ MbRecipeLinkCard: () => null }))
vi.mock("@/components/finance/cost-product-master/unlock-dialog", () => ({ UnlockProductMasterDialog: () => null }))
vi.mock("@/components/finance/cost-product-master/product-master-form-dialog", () => ({
  ProductMasterFormDialog: ({ open, product }: { open: boolean; product?: { productCode: string } | null }) =>
    open ? <div>edit-dialog-open:{product?.productCode}</div> : null,
}))

import ProductMasterDetailClient from "@/app/(dashboard)/finance/product-master/[productSysId]/detail-client"

afterEach(() => {
  permissionState.hasPermission = () => true
})

describe("ProductMasterDetailClient Edit Product", () => {
  it("renders the button when permitted and opens the shared dialog prefilled with the product", async () => {
    const user = userEvent.setup()
    render(<ProductMasterDetailClient productSysId={5} />)
    await user.click(screen.getByRole("button", { name: /edit product/i }))
    expect(screen.getByText("edit-dialog-open:CST001")).toBeInTheDocument()
  })

  it("hides the button without finance.product.master.update", () => {
    permissionState.hasPermission = (c) => c !== "finance.product.master.update"
    render(<ProductMasterDetailClient productSysId={5} />)
    expect(screen.queryByRole("button", { name: /edit product/i })).not.toBeInTheDocument()
  })
})
