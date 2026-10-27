import { describe, expect, it } from "vitest"

import { buildMix, buildShifts } from "@/components/bi/viewer/ot-mix-card"
import type { ChartDataResponse } from "@/types/bi"

const payload = (m: Record<string, Record<string, number>>) =>
  ({
    series: Object.entries(m).map(([name, pts]) => ({
      name,
      points: Object.entries(pts).map(([category, value]) => ({ category, value })),
    })),
  }) as unknown as ChartDataResponse

const d = payload({
  Normal: { "202608": 60, "202609": 50 },
  Off: { "202608": 25, "202609": 30 },
  Holiday: { "202608": 15, "202609": 20 },
})

describe("buildMix", () => {
  it("shares of every month sum to 100", () => {
    const { rows } = buildMix(d)
    for (const r of rows) expect(Object.values(r.share).reduce((a, b) => a + b, 0)).toBeCloseTo(100, 9)
  })
  it("sorts periods ascending, computes share from hours", () => {
    const { rows } = buildMix(d)
    expect(rows.map((r) => r.period)).toEqual(["202608", "202609"])
    expect(rows[1].share.Off).toBeCloseTo(30, 9)
    expect(rows[1].total).toBe(100)
  })
  it("ignores non-YYYYMM categories and empty payload", () => {
    expect(buildMix(payload({ A: { "2026-09": 5 } })).rows).toEqual([])
    expect(buildMix(undefined).rows).toEqual([])
  })
})

describe("buildShifts", () => {
  it("is latest minus previous share in percentage points", () => {
    const { types, rows } = buildMix(d)
    const s = Object.fromEntries(buildShifts(types, rows).map((x) => [x.type, x.shiftPp]))
    expect(s.Normal).toBeCloseTo(-10, 9)
    expect(s.Off).toBeCloseTo(5, 9)
    expect(s.Holiday).toBeCloseTo(5, 9)
  })
  it("no previous month → null shift", () => {
    const { types, rows } = buildMix(payload({ A: { "202609": 4 } }))
    expect(buildShifts(types, rows)[0]).toMatchObject({ shiftPp: null })
  })
})
