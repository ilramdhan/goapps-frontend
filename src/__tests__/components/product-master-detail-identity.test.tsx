/**
 * P3-T1 — MB Recipe / Master Product MB frontend fix.
 *
 * cost_product_master rows auto-generated from MB Recipe now come back with
 * cpm_shade_code/cpm_shade_name populated and cpm_grade_code left NULL/empty
 * (instead of the legacy forced "AX"). This file proves the detail page:
 *   - shows a "Shade Name" field (and no longer shows "Type Label" at all —
 *     cpm_flex_03 is dropped from the UI per decision D1)
 *   - renders Grade as "—" when gradeCode is empty, without forcing "AX"
 *   - builds the header subtitle from only the non-empty parts, joined by
 *     " · ", so an empty shade/grade never leaves a dangling separator
 */
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@/__tests__/utils"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/finance/product-master/1",
}))

vi.mock("@/providers/permission-provider", () => ({
  usePermissionContext: () => ({ hasPermission: () => true }),
}))

// Sibling tabs and dialogs are not the unit under test.
vi.mock("@/components/finance/calc-jobs/calculate-button", () => ({
  CalculateButton: () => null,
}))
vi.mock("@/components/finance/cost-product-master/parameters-tab", () => ({
  ProductParametersTab: () => null,
}))
vi.mock("@/components/finance/cost-product-master/routing-tab", () => ({
  ProductRoutingTab: () => null,
}))
vi.mock("@/components/finance/cost-product-master/audit-tab", () => ({
  ProductAuditTab: () => null,
}))
vi.mock("@/components/finance/cost-results/cost-history-tab", () => ({
  CostHistoryTab: () => null,
}))
vi.mock("@/components/finance/cost-product-master/unlock-dialog", () => ({
  UnlockProductMasterDialog: () => null,
}))
vi.mock("@/components/finance/cost-product-master/mb-recipe-link-card", () => ({
  MbRecipeLinkCard: () => null,
}))

const mockUseCostProductMaster = vi.fn()
vi.mock("@/hooks/finance/use-cost-product-master", () => ({
  useCostProductMaster: (...args: unknown[]) => mockUseCostProductMaster(...args),
}))

import ProductMasterDetailClient from "@/app/(dashboard)/finance/product-master/[productSysId]/detail-client"

describe("ProductMasterDetailClient — MB-generated product identity (P3-T1)", () => {
  it("shows Shade Name, drops Type Label, and shows a dash for empty Grade", () => {
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
    })

    render(<ProductMasterDetailClient productSysId={1} />)

    expect(screen.getByText("Shade Name")).toBeInTheDocument()
    expect(screen.getByText("Deep Blue")).toBeInTheDocument()

    expect(screen.queryByText("Type Label")).not.toBeInTheDocument()

    const gradeLabel = screen.getByText("Grade")
    const gradeValue = gradeLabel.parentElement?.querySelector("div.text-sm")
    expect(gradeValue).toHaveTextContent("—")
  })

  it("builds the subtitle from non-empty parts only, without dangling separators", () => {
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
    })

    render(<ProductMasterDetailClient productSysId={1} />)

    // Grade is empty, so it must not appear, and there must be no dangling
    // " / —" or trailing " · " left over from the old fixed-template format.
    expect(screen.getByText("Masterbatch · SH1 — Deep Blue")).toBeInTheDocument()
  })

  it("falls back gracefully when shade/type are also missing", () => {
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
    })

    render(<ProductMasterDetailClient productSysId={2} />)

    // Only the grade part is present — no leading/trailing " · ". "AX" shows
    // up twice (subtitle + Grade field), so assert on both occurrences.
    expect(screen.getAllByText("AX").length).toBeGreaterThanOrEqual(2)
  })
})
