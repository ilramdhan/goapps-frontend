import { describe, expect, it } from "vitest"

import { buildDeltaRows, comparePeriod, toTotals } from "@/components/bi/viewer/ot-compare-card"
import type { ChartDataResponse } from "@/types/bi"

const payload = (m: Record<string, number>) =>
  ({ series: Object.entries(m).map(([name, value]) => ({ name, points: [{ category: "", value }] })) }) as unknown as ChartDataResponse

describe("toTotals", () => {
  it("reads one series with a point per bucket (real /computed shape)", () => {
    const d = { series: [{ name: "Tren OT", points: [{ category: "Texturising", value: 660.7 }, { category: "Twisting", value: 491.9 }] }] } as unknown as ChartDataResponse
    expect([...toTotals(d)!.entries()]).toEqual([["Texturising", 660.7], ["Twisting", 491.9]])
  })
  it("empty payload is null", () => expect(toTotals({ series: [] } as unknown as ChartDataResponse)).toBeNull())
})

describe("comparePeriod", () => {
  it("MoM crosses year boundary", () => expect(comparePeriod("202601", "MoM")).toBe("202512"))
  it("YoY shifts 12 months", () => expect(comparePeriod("202610", "YoY")).toBe("202510"))
})

describe("buildDeltaRows", () => {
  it("sorts by largest increase first", () => {
    const rows = buildDeltaRows(toTotals(payload({ A: 10, B: 50, C: 5 })), toTotals(payload({ A: 8, B: 20, C: 9 })))
    expect(rows.map((r) => r.key)).toEqual(["B", "A", "C"])
    expect(rows[0]).toMatchObject({ delta: 30, pct: 150 })
  })
  it("missing comparison period is null, not 0", () => {
    const rows = buildDeltaRows(toTotals(payload({ A: 10 })), toTotals(undefined))
    expect(rows[0]).toMatchObject({ prev: null, delta: null, pct: null })
  })
  it("0 vs 0 gives delta 0 and no pct", () => {
    const rows = buildDeltaRows(toTotals(payload({ H: 0 })), toTotals(payload({ H: 0 })))
    expect(rows[0]).toMatchObject({ delta: 0, pct: null })
  })
})
