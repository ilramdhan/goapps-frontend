/**
 * P11/E6 layout contract for the product-master detail page header.
 *
 * The header (title + action buttons) must stay pinned while the page scrolls,
 * while the "Back to product list" button must stay OUTSIDE the sticky area.
 * These assertions pin the exact utility classes because the sticky behaviour
 * is purely class-driven — jsdom cannot observe real scrolling.
 */
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@/__tests__/utils"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/finance/product-master/1",
}))

vi.mock("@/hooks/finance/use-cost-product-master", () => ({
  useCostProductMaster: () => ({
    data: {
      productSysId: 1,
      productCode: "P-001",
      productName: "Test Product",
      productTypeId: 1,
      productTypeCode: "MB",
      productTypeName: "Masterbatch",
      shadeCode: "SH1",
      gradeCode: "GR1",
      isActive: true,
      isLocked: false,
    },
    isLoading: false,
  }),
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

import ProductMasterDetailClient from "@/app/(dashboard)/finance/product-master/[productSysId]/detail-client"

function renderPage() {
  render(<ProductMasterDetailClient productSysId={1} />)
  return screen.getByTestId("product-master-sticky-header")
}

describe("ProductMasterDetailClient — sticky header (E6)", () => {
  it("pins the header block to the top of the scroll container", () => {
    const header = renderPage()
    const cls = header.className.split(/\s+/)
    // ⛔ NOT top-0: the dashboard app header (layout.tsx:94) is itself
    // `sticky top-0 z-50 h-16`, so a top-0 page header would slide UNDER it and
    // hide the title. The offset must clear that header, and must shrink to
    // top-12 when the sidebar collapses (the app header becomes h-12 there).
    for (const c of ["sticky", "top-16", "z-20", "border-b"]) {
      expect(cls, `expected class "${c}"`).toContain(c)
    }
    expect(header.className).toMatch(/bg-background\/95/)
    expect(header.className).toMatch(/backdrop-blur/)
    expect(header.className).toMatch(
      /group-has-data-\[collapsible=icon\]\/sidebar-wrapper:top-12/,
    )
  })

  it("keeps the negative-margin bleed so the sticky bar spans the page padding", () => {
    const cls = renderPage().className.split(/\s+/)
    expect(cls).toContain("-mx-6")
    expect(cls).toContain("px-6")
  })

  it("still lays the title and actions out as a wrapping row", () => {
    const cls = renderPage().className.split(/\s+/)
    for (const c of ["flex", "flex-wrap", "items-start", "justify-between", "gap-3"]) {
      expect(cls, `expected class "${c}"`).toContain(c)
    }
  })

  it("contains the page title and keeps the Back button outside the sticky area", () => {
    const header = renderPage()
    expect(header).toHaveTextContent("P-001")

    const back = screen.getByRole("link", { name: /Back to product list/i })
    expect(back).toBeInTheDocument()
    expect(header.contains(back)).toBe(false)
  })
})
