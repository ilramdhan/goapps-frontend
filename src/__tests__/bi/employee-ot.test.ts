import { describe, it, expect } from "vitest"
import { readEmployeeOTBlock, localSubtotals, localSummary, pctDelta, fmtDelta, barPercent, otLevel, CHRONIC_WEEKS_THRESHOLD, payrollLabelOf, comparePeriodOptions, fmtPayrollLabel, fmtHiddenOver } from "@/lib/bi/employee-ot"

const row = (group: string, period: number, excess: number, chronic = 0) => ({
  __group: group, PERIOD_HOURS: period, EXCESS: excess, CHRONIC: chronic,
})

describe("readEmployeeOTBlock (HD-24)", () => {
  it("reads summary and the new subtotal fields", () => {
    const b = readEmployeeOTBlock({
      employee_ot: {
        subtotals: [{ group: "A", employees: 2, PERIOD_HOURS: 30, avg_period_hours: 15, over_pct: 50 }],
        summary: { employees: 2, total_period_hours: 30, over_limit: 1, chronic: 1 },
      },
    })
    expect(b?.subtotals[0]).toMatchObject({ avg_period_hours: 15, over_pct: 50 })
    expect(b?.summary).toEqual({ employees: 2, totalPeriodHours: 30, overLimit: 1, chronic: 1, prev: null })
  })
  it("tolerates an older backend without summary", () => {
    const b = readEmployeeOTBlock({ employee_ot: { subtotals: [{ group: "A", employees: 1 }] } })
    expect(b?.summary).toBeUndefined()
    expect(b?.subtotals[0]).toMatchObject({ avg_period_hours: 0, over_pct: 0 })
  })
})

describe("localSubtotals", () => {
  it("computes avg and over_pct per group", () => {
    const s = localSubtotals([row("A", 10, 2), row("A", 21, 0), row("B", 5, 1)])
    expect(s).toHaveLength(2)
    expect(s[0]).toMatchObject({ group: "A", employees: 2, PERIOD_HOURS: 31, avg_period_hours: 15.5, over_pct: 50 })
    expect(s[1]).toMatchObject({ group: "B", avg_period_hours: 5, over_pct: 100 })
  })
  it("rounds half-up to 1 decimal", () => {
    const s = localSubtotals([row("A", 1, 0), row("A", 0, 0), row("A", 0, 0)])
    expect(s[0].avg_period_hours).toBe(0.3)
    expect(s[0].over_pct).toBe(0)
  })
  it("is empty for no rows", () => expect(localSubtotals([])).toEqual([]))
})

describe("localSummary", () => {
  it("counts per person", () => {
    expect(localSummary([row("", 10.04, 2, 3), row("", 5.02, 0, 0)])).toEqual({
      employees: 2, totalPeriodHours: 15.1, overLimit: 1, chronic: 1, prev: null,
    })
  })
})

describe("comparison with the previous period (HD-24, H046)", () => {
  it("pctDelta is null when prev is 0 or negative", () => {
    expect(pctDelta(10, 0)).toBeNull()
    expect(pctDelta(0, 0)).toBeNull()
    expect(pctDelta(30, 20)).toBe(50)
    expect(pctDelta(8, 16)).toBe(-50)
    expect(pctDelta(0, 10)).toBe(-100)
  })
  it("fmtDelta shows arrows and a dash for nothing to compare", () => {
    expect(fmtDelta(12.5)).toBe("▲ 12,5%")
    expect(fmtDelta(-3)).toBe("▼ 3,0%")
    expect(fmtDelta(0)).toBe("0,0%")
    expect(fmtDelta(null)).toBe("–")
    expect(fmtDelta(undefined)).toBe("–")
  })
  it("reads summary.prev and the prev range; null prev stays null", () => {
    const b = readEmployeeOTBlock({
      employee_ot: {
        subtotals: [],
        summary: {
          employees: 4, total_period_hours: 53, over_limit: 0, chronic: 0,
          prev: { total_period_hours: 36, employees: 2, hours_delta_pct: 47.2, employees_delta_pct: null },
        },
        ranges: { prev_from: "2026-08-26", prev_to: "2026-09-25" },
      },
    })
    expect(b?.summary?.prev).toEqual({ totalPeriodHours: 36, employees: 2, hoursDeltaPct: 47.2, employeesDeltaPct: null })
    expect(b?.ranges?.prevTo).toBe("2026-09-25")
    expect(readEmployeeOTBlock({ employee_ot: { subtotals: [], summary: { employees: 1, prev: null } } })?.summary?.prev).toBeNull()
  })
  it("localSummary has no comparison: the previous total needs rows that are filtered out", () => {
    expect(localSummary([{ ...row("A", 30, 0), __prev_hours: 20 }]).prev).toBeNull()
  })
})

describe("barPercent (H047)", () => {
  it("scales against the max of displayed rows", () => {
    expect(barPercent(50, 100)).toBe(50)
    expect(barPercent(100, 100)).toBe(100)
    expect(barPercent(1, 3)).toBe(33.3)
  })
  it("is 0 for zero/negative values or no max, and never above 100", () => {
    expect(barPercent(0, 10)).toBe(0)
    expect(barPercent(-1, 10)).toBe(0)
    expect(barPercent(5, 0)).toBe(0)
    expect(barPercent(20, 10)).toBe(100)
  })
})

describe("otLevel (H047)", () => {
  it("classifies by excess and chronic threshold", () => {
    expect(otLevel(0, 0)).toBe("none")
    expect(otLevel(0, CHRONIC_WEEKS_THRESHOLD - 1)).toBe("none")
    expect(otLevel(2, 1)).toBe("over")
    expect(otLevel(2, CHRONIC_WEEKS_THRESHOLD)).toBe("chronic")
    expect(otLevel(0, CHRONIC_WEEKS_THRESHOLD + 3)).toBe("chronic")
  })
})

describe("compare period helpers (HD-25)", () => {
  it("payrollLabelOf: 26th rolls into next label", () => {
    expect(payrollLabelOf("2026-09-26")).toBe("202610")
    expect(payrollLabelOf("2026-10-25")).toBe("202610")
    expect(payrollLabelOf("2026-12-26")).toBe("202701")
    expect(payrollLabelOf("x")).toBe("")
  })
  it("comparePeriodOptions: newest first, crosses year, excludes current", () => {
    expect(comparePeriodOptions("2026-09-26", 3)).toEqual(["202609", "202608", "202607"])
    expect(comparePeriodOptions("2026-12-26", 2)).toEqual(["202612", "202611"])
    expect(comparePeriodOptions("2026-01-26", 2)).toEqual(["202601", "202512"])
    expect(comparePeriodOptions("")).toEqual([])
  })
  it("fmtPayrollLabel", () => expect(fmtPayrollLabel("202610")).toBe("Okt 2026"))
})

describe("hidden over weeks (H053)", () => {
  const row = { __hidden_over: [{ from: "2026-07-20", hours: 24.6 }], __hidden_over_count: 3 }
  it("formats the list newest first with the remainder", () => {
    expect(fmtHiddenOver(row, (v) => String(v))).toBe("Over di luar kolom: 20 Jul (24.6 jam), +2 lainnya")
    expect(fmtHiddenOver({}, String)).toBe("")
  })
  it("reads weeks_total and weeks_truncated", () => {
    const b = readEmployeeOTBlock({ employee_ot: { weeks_truncated: true, weeks_total: 52, weeks: [] } })
    expect(b?.weeksTruncated).toBe(true)
    expect(b?.weeksTotal).toBe(52)
  })
})
