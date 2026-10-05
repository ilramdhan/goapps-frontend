import { describe, expect, it } from "vitest"

import { parseCsv } from "@/lib/csv"
import { compareLegacyGoapps, legacyRowsFromCsv, toScaled5 } from "@/lib/finance/erp-legacy-compare"

const r = (basis: string, item: string, rate: string) => ({ basis, item, grade: "A", shade: "S", rate })

describe("compareLegacyGoapps", () => {
  it("SP* identical passes", () => {
    const res = compareLegacyGoapps([r("SPPTY", "I1", "1.5")], [r("SPPTY", "I1", "1.50000")])
    expect(res.anyFail).toBe(false)
    expect(res.summary[0].same).toBe(1)
  })
  it("SP* diff fails", () => {
    const res = compareLegacyGoapps([r("SPITY", "I1", "1.5")], [r("SPITY", "I1", "1.6")])
    expect(res.anyFail).toBe(true)
    expect(res.details[0].delta).toBe("0.10000")
  })
  it("COST diff is info only", () => {
    const res = compareLegacyGoapps([r("COST", "I1", "1")], [r("COST", "I1", "2")])
    expect(res.anyFail).toBe(false)
    expect(res.summary[0].diff).toBe(1)
    expect(res.details[0].deltaPct).toBe("100.00")
  })
  it("counts only-legacy and only-goapps", () => {
    const res = compareLegacyGoapps([r("COST", "L", "1")], [r("COST", "G", "1")])
    expect(res.summary[0].onlyLegacy).toBe(1)
    expect(res.summary[0].onlyGoapps).toBe(1)
  })
  it("rounds to 5 dp half away from zero", () => {
    expect(toScaled5("1.000005")).toBe(toScaled5("1.00001"))
    expect(toScaled5("-1.000005")).toBe(toScaled5("-1.00001"))
    expect(toScaled5("1.000004")).toBe(toScaled5("1.00000"))
  })
  it("parses CSV with quotes and case-insensitive headers", () => {
    const rows = legacyRowsFromCsv(parseCsv('BASIS,Item,rate\nCOST,"a,b",1.5\n'))
    expect(rows[0]).toMatchObject({ basis: "COST", item: "a,b", rate: "1.5" })
  })
})
