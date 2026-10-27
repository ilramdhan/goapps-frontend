import { describe, expect, it } from "vitest"

import { buildPareto } from "@/components/bi/viewer/ot-pareto-card"

const m = (top: number, total: number) => new Map([["TOP_10PCT", top], ["TOTAL", total]])

describe("buildPareto", () => {
  it("pct = TOP/TOTAL×100, Δ pp vs previous month", () => {
    const rows = buildPareto({ "202608": m(30, 100), "202609": m(25, 100) })
    expect(rows.map((r) => r.pct)).toEqual([30, 25])
    expect(rows[0].deltaPp).toBeNull()
    expect(rows[1].deltaPp).toBeCloseTo(-5, 9)
  })
  it("skips months without TOTAL (never 0%) and sorts ascending", () => {
    const rows = buildPareto({ "202609": new Map([["TOP_10PCT", 5]]), "202608": null, "202607": m(4, 20) })
    expect(rows.map((r) => r.period)).toEqual(["202607"])
    expect(rows[0].pct).toBeCloseTo(20, 9)
  })
  it("ignores non-YYYYMM keys and empty input", () => {
    expect(buildPareto({ "2026-09": m(1, 2) })).toEqual([])
    expect(buildPareto({})).toEqual([])
  })
})
