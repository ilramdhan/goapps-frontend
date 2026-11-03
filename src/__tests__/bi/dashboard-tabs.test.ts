import { describe, it, expect } from "vitest"
import { resolveDashboardTabs } from "@/lib/bi/dashboard-tabs"

const tab = (code: string, order: number, group: string, label = code, permission = "finance.bi.dashboard.view") => ({
  dashboardCode: code,
  displayOrder: order,
  layoutConfig: { nav_tab: { group, label, permission } },
})
const allow = () => true

describe("resolveDashboardTabs", () => {
  const all = [
    tab("PP_PACK_PRODUCT", 20, "PACKPROD", "Produk"),
    tab("PP_PACK_SUMMARY", 10, "PACKPROD", "Summary"),
    tab("HR_OT_DEPT", 10, "WORKFORCE", "Workforce"),
    tab("HR_OT_TREND", 20, "WORKFORCE", "Tren"),
    { dashboardCode: "EBITDA", displayOrder: 5, layoutConfig: {} },
  ]

  it("returns only tabs of the same group, ordered by displayOrder", () => {
    expect(resolveDashboardTabs("PP_PACK_PRODUCT", all, allow).map((t) => t.code)).toEqual([
      "PP_PACK_SUMMARY",
      "PP_PACK_PRODUCT",
    ])
  })

  it("does not mix groups", () => {
    expect(resolveDashboardTabs("HR_OT_DEPT", all, allow).map((t) => t.code)).toEqual(["HR_OT_DEPT", "HR_OT_TREND"])
  })

  it("returns nothing for a dashboard without nav_tab", () => {
    expect(resolveDashboardTabs("EBITDA", all, allow)).toEqual([])
  })

  it("filters by permission and hides a single remaining tab", () => {
    const only = (p: string) => p !== "finance.bi.denied"
    const list = [tab("A", 1, "G"), tab("B", 2, "G", "B", "finance.bi.denied")]
    expect(resolveDashboardTabs("A", list, only)).toEqual([])
  })
})

describe("resolveDashboardTabs: nav_tab tanpa group (HR Workforce)", () => {
  const legacy = (code: string, order: number) => ({
    dashboardCode: code,
    displayOrder: order,
    layoutConfig: { nav_tab: { label: code, permission: "finance.bi.workforce.view" } },
  })
  it("groups group-less tabs together and apart from named groups", () => {
    const all = [legacy("HR_OT_DEPT", 10), legacy("HR_OT_TREND", 20), tab("PP_PACK_SUMMARY", 10, "PACKPROD"), tab("PP_PACK_PRODUCT", 20, "PACKPROD")]
    expect(resolveDashboardTabs("HR_OT_DEPT", all, allow).map((t) => t.code)).toEqual(["HR_OT_DEPT", "HR_OT_TREND"])
    expect(resolveDashboardTabs("PP_PACK_SUMMARY", all, allow).map((t) => t.code)).toEqual(["PP_PACK_SUMMARY", "PP_PACK_PRODUCT"])
  })
})
