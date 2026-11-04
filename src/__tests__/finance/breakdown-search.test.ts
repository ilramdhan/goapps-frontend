import { describe, expect, it } from "vitest"

import {
  filterFormulaEvals,
  filterParamEntries,
  matchesQuery,
} from "@/components/finance/cost-results/breakdown/search"
import type { FormulaEval } from "@/types/finance/cost-calc"

const rows: FormulaEval[] = [
  { formulaCode: "F_CAP", formulaName: "Captive Cost", expression: "A * B", inputs: { RATE: "1.25", QTY: "3" }, outputParamCode: "CAP_OUT", outputValue: "3.75" },
  { formulaCode: "F_DEL", formulaName: "Delivery", expression: "SUM(X)", inputs: { X: "9" }, outputParamCode: "DEL_OUT", outputValue: "9" },
]

describe("matchesQuery", () => {
  it("is case-insensitive, trimmed, empty matches all", () => {
    expect(matchesQuery("  CAP ", "captive")).toBe(true)
    expect(matchesQuery("", "x")).toBe(true)
    expect(matchesQuery("zzz", "abc", undefined)).toBe(false)
  })
})

describe("filterFormulaEvals", () => {
  it("returns all for empty query", () => {
    expect(filterFormulaEvals(rows, "  ")).toHaveLength(2)
  })
  it("matches code, name, output, expression, input keys and values", () => {
    expect(filterFormulaEvals(rows, "f_cap")).toHaveLength(1)
    expect(filterFormulaEvals(rows, "deliv")).toHaveLength(1)
    expect(filterFormulaEvals(rows, "del_out")).toHaveLength(1)
    expect(filterFormulaEvals(rows, "sum(")).toHaveLength(1)
    expect(filterFormulaEvals(rows, "rate")).toHaveLength(1)
    expect(filterFormulaEvals(rows, "1.25")).toHaveLength(1)
    expect(filterFormulaEvals(rows, "nomatch")).toHaveLength(0)
  })
})

describe("filterParamEntries", () => {
  const entries: Array<[string, string]> = [["TOTAL_CAP_CONV", "10"], ["OTHER", "abc"]]
  it("matches code, value and name", () => {
    expect(filterParamEntries(entries, "total")).toHaveLength(1)
    expect(filterParamEntries(entries, "ABC")).toHaveLength(1)
    expect(filterParamEntries(entries, "route", new Map([["OTHER", "Route stuff"]]))).toHaveLength(1)
    expect(filterParamEntries(entries, "")).toHaveLength(2)
    expect(filterParamEntries(entries, "zzz")).toHaveLength(0)
  })
})
