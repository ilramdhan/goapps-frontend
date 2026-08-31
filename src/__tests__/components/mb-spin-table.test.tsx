/**
 * P4-T3: MB Spin table column contract.
 *
 * - "Cost Code" column is renamed to "Shade Code" (id `mbsCc` unchanged).
 * - New "Shade Name" column renders `mbsShadeName`.
 * - "Rate MKT" column (id `mbsCostRateMkt`) is removed entirely.
 * - "Final Product" column is untouched and still renders.
 *
 * Neither "Shade Code" nor "Shade Name" declare a `sortKey` — this table
 * doesn't wire DataTable's `onSort`/`sortBy` props at all (mirrors the
 * non-sortable decision already made for the analogous `shade_name` column
 * on the Master Product list table, P3-T2), so no unsupported sort_by value
 * can ever reach the backend's resolveSort for MB Spins.
 */
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@/__tests__/utils"
import userEvent from "@testing-library/user-event"

vi.mock("@/providers/permission-provider", () => ({
  usePermissionContext: () => ({ hasPermission: () => true }),
}))

const mockPush = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), refresh: vi.fn() }),
}))

import { MBSpinTable } from "@/components/finance/mb-spin/mb-spin-table"
import type { MBSpin } from "@/types/finance/mb-spin"

const items: MBSpin[] = [
  {
    mbsId: "11111111-1111-1111-1111-111111111111",
    mbsMbhId: "22222222-2222-2222-2222-222222222222",
    mbsMgtName: "Sample spin",
    mbsFinalProduct: "Final Product X",
    mbsCc: "SC1",
    mbsShadeName: "Midnight Blue",
    mbsDenier: 150,
    mbsFilament: 48,
    mbsIsActive: true,
  } as MBSpin,
]

function renderTable() {
  render(
    <MBSpinTable
      data={items}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
    />,
  )
}

describe("MBSpinTable columns", () => {
  it("renders 'Shade Code' and 'Shade Name' headers with real data, and no 'Cost Code' or 'Rate MKT' headers", () => {
    renderTable()

    expect(screen.getByText("Shade Code")).toBeInTheDocument()
    expect(screen.getByText("Shade Name")).toBeInTheDocument()
    expect(screen.queryByText("Cost Code")).not.toBeInTheDocument()
    expect(screen.queryByText("Rate MKT")).not.toBeInTheDocument()

    expect(screen.getByText("SC1")).toBeInTheDocument()
    expect(screen.getByText("Midnight Blue")).toBeInTheDocument()
  })

  it("still renders the untouched 'Final Product' column", () => {
    renderTable()
    expect(screen.getByText("Final Product")).toBeInTheDocument()
    expect(screen.getByText("Final Product X")).toBeInTheDocument()
  })
})

describe("MBSpinTable row actions", () => {
  it("navigates to the detail page when 'View' is clicked, placed before Edit", async () => {
    mockPush.mockClear()
    const user = userEvent.setup()
    renderTable()

    const viewButton = screen.getByTitle("View")
    const editButton = screen.getByTitle("Edit")
    // View must come first in DOM order (View → Edit → Duplicate → Delete).
    expect(
      viewButton.compareDocumentPosition(editButton) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()

    await user.click(viewButton)
    expect(mockPush).toHaveBeenCalledWith(
      "/finance/yarn-master/mb-spins/11111111-1111-1111-1111-111111111111"
    )
  })
})
