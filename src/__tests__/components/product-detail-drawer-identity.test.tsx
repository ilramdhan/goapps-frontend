/**
 * P3-T3 — MB Recipe / Master Product MB frontend fix.
 *
 * cost_product_master rows auto-generated from MB Recipe now come back with
 * cpm_shade_code/cpm_shade_name populated. This file proves the compact
 * "View" drawer (product-detail-drawer.tsx) used from the product master
 * list page:
 *   - shows a "Shade Name" field
 *   - no longer shows "Type Label" at all (cpm_flex_03 is dropped from the
 *     UI per decision D1 — legacy column, always NULL for MB products)
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@/__tests__/utils"

const mockUseCostProductMaster = vi.fn()
vi.mock("@/hooks/finance/use-cost-product-master", () => ({
  useCostProductMaster: (...args: unknown[]) => mockUseCostProductMaster(...args),
}))

const mockUseCostHistory = vi.fn()
vi.mock("@/hooks/finance/use-cost-calc", () => ({
  useCostHistory: (...args: unknown[]) => mockUseCostHistory(...args),
}))

const mockUseProductRequiredParams = vi.fn()
vi.mock("@/hooks/finance/use-cost-product-parameter", () => ({
  useProductRequiredParams: (...args: unknown[]) => mockUseProductRequiredParams(...args),
}))

const mockUseRouteByProduct = vi.fn()
vi.mock("@/hooks/finance/use-cost-route", () => ({
  useRouteByProduct: (...args: unknown[]) => mockUseRouteByProduct(...args),
}))

import { ProductDetailDrawer } from "@/components/finance/cost-product-master/product-detail-drawer"

describe("ProductDetailDrawer — MB-generated product identity (P3-T3)", () => {
  beforeEach(() => {
    mockUseCostHistory.mockReturnValue({ data: { items: [] }, isLoading: false, isError: false })
    mockUseProductRequiredParams.mockReturnValue({ data: [], isLoading: false, isError: false })
    mockUseRouteByProduct.mockReturnValue({ data: undefined, isLoading: false })
  })

  it("shows Shade Name and drops Type Label", () => {
    mockUseCostProductMaster.mockReturnValue({
      data: {
        productSysId: 1,
        productCode: "MB-001",
        productName: "MB Test Product",
        productTypeId: 1,
        productTypeCode: "MB",
        productTypeName: "Masterbatch",
        shadeCode: "SH1",
        shadeName: "Deep Blue",
        gradeCode: "",
        flex01: "",
        flex02: "",
        flex03: "",
        isActive: true,
        isLocked: false,
        source: "MB_RECIPE",
      },
      isLoading: false,
      isError: false,
    })

    render(
      <ProductDetailDrawer productSysId={1} open={true} onOpenChange={() => {}} />
    )

    expect(screen.getByText("Shade Name")).toBeInTheDocument()
    expect(screen.getByText("Deep Blue")).toBeInTheDocument()

    expect(screen.queryByText("Type Label")).not.toBeInTheDocument()
  })

  it("shows a dash for empty Shade Name", () => {
    mockUseCostProductMaster.mockReturnValue({
      data: {
        productSysId: 2,
        productCode: "MB-002",
        productName: "Bare Product",
        productTypeId: 0,
        productTypeCode: "",
        productTypeName: "",
        shadeCode: "",
        shadeName: "",
        gradeCode: "AX",
        flex01: "",
        flex02: "",
        flex03: "",
        isActive: true,
        isLocked: false,
        source: "MANUAL",
      },
      isLoading: false,
      isError: false,
    })

    render(
      <ProductDetailDrawer productSysId={2} open={true} onOpenChange={() => {}} />
    )

    const shadeNameLabel = screen.getByText("Shade Name")
    const shadeNameValue = shadeNameLabel.parentElement?.querySelector("dd")
    expect(shadeNameValue).toHaveTextContent("—")

    expect(screen.queryByText("Type Label")).not.toBeInTheDocument()
  })
})
