import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"

const dashboards = vi.fn()
const granted = new Set<string>()

vi.mock("@/hooks/bi", () => ({ useAccessibleDashboards: () => ({ data: dashboards() }) }))
vi.mock("@/lib/hooks/use-permission", () => ({ usePermission: () => ({ hasPermission: (p: string) => granted.has(p) }) }))

import { DashboardTabs } from "@/components/bi/viewer/dashboard-tabs"

const dash = (code: string, order: number, nav?: { label: string; permission: string }) => ({
  dashboardCode: code,
  displayOrder: order,
  layoutConfig: nav ? { nav_tab: nav } : {},
})

beforeEach(() => {
  granted.clear()
  granted.add("a.view")
  dashboards.mockReset()
})

describe("DashboardTabs (nav_tab tanpa group = grup bawaan Workforce)", () => {
  it("orders tabs by displayOrder, drops dashboards without nav_tab", () => {
    dashboards.mockReturnValue([
      dash("B", 2, { label: "Kedua", permission: "a.view" }),
      dash("X", 0),
      dash("A", 1, { label: "Pertama", permission: "a.view" }),
    ])
    render(<DashboardTabs code="A" />)
    const links = screen.getAllByRole("link").map((l) => l.textContent)
    expect(links).toEqual(["Pertama", "Kedua"])
    expect(screen.getByText("Pertama").getAttribute("aria-current")).toBe("page")
  })

  it("filters tabs by nav_tab.permission", () => {
    dashboards.mockReturnValue([
      dash("A", 1, { label: "Pertama", permission: "a.view" }),
      dash("B", 2, { label: "Kedua", permission: "a.view" }),
      dash("C", 3, { label: "Karyawan", permission: "emp.view" }),
    ])
    render(<DashboardTabs code="A" />)
    expect(screen.queryByText("Karyawan")).toBeNull()
  })

  it("renders nothing for a dashboard outside the nav group", () => {
    dashboards.mockReturnValue([
      dash("A", 1, { label: "Pertama", permission: "a.view" }),
      dash("B", 2, { label: "Kedua", permission: "a.view" }),
    ])
    const { container } = render(<DashboardTabs code="OTHER" />)
    expect(container.firstChild).toBeNull()
  })
})
