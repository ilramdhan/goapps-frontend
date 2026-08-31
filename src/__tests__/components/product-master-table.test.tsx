/**
 * P3-T2: cost-product-master table column contract.
 *
 * - "Shade Code" and "Shade Name" both render as separate columns.
 * - "Shade Name" is NOT sortable: the backend's cpmSortColumn map
 *   (goapps-backend/services/finance/internal/infrastructure/postgres/
 *   cost_product_master_repository.go) has no "shade_name" case, so sending
 *   sort_by=shade_name would silently fall through to sorting by
 *   product_code instead. Clicking the header must therefore never call
 *   onSort with "shade_name".
 * - "Type Label" column is gone entirely.
 */
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@/__tests__/utils"

import {
  ProductMasterTable,
  PRODUCT_MASTER_COLUMNS,
} from "@/components/finance/cost-product-master/product-master-table"
import type { CostProductMaster } from "@/types/finance/cost-product-master"

const items: CostProductMaster[] = [
  {
    productSysId: 1,
    productCode: "P-001",
    productName: "Test Product",
    productTypeId: 1,
    productTypeCode: "MB",
    shadeCode: "SH1",
    shadeName: "Midnight Blue",
    gradeCode: "GR1",
    isActive: true,
  } as CostProductMaster,
]

function renderTable(onSort = vi.fn()) {
  const visibility = Object.fromEntries(PRODUCT_MASTER_COLUMNS.map((c) => [c.id, true]))
  render(
    <ProductMasterTable
      items={items}
      onEdit={vi.fn()}
      onDeactivate={vi.fn()}
      onView={vi.fn()}
      onSort={onSort}
      visibility={visibility}
    />,
  )
  return onSort
}

describe("ProductMasterTable columns", () => {
  it("registers Shade Code and Shade Name as separate columns, with no Type Label column", () => {
    const ids = PRODUCT_MASTER_COLUMNS.map((c) => c.id)
    expect(ids).toContain("shade_code")
    expect(ids).toContain("shade_name")
    expect(ids).not.toContain("type_label")
  })

  it("renders Shade Code and Shade Name headers and cell values, and no Type Label", () => {
    renderTable()
    expect(screen.getByText("Shade Code")).toBeInTheDocument()
    expect(screen.getByText("Shade Name")).toBeInTheDocument()
    expect(screen.queryByText("Type Label")).not.toBeInTheDocument()

    expect(screen.getByText("SH1")).toBeInTheDocument()
    expect(screen.getByText("Midnight Blue")).toBeInTheDocument()
  })

  it("makes Shade Code sortable (calls onSort with shade_code) but Shade Name not sortable", () => {
    const onSort = renderTable()

    screen.getByText("Shade Code").click()
    expect(onSort).toHaveBeenCalledWith("shade_code")

    onSort.mockClear()
    screen.getByText("Shade Name").click()
    expect(onSort).not.toHaveBeenCalled()
  })
})
