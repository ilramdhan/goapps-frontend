import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { RmTab } from "@/components/finance/cost-results/breakdown/rm-tab"
import { formatNumeric } from "@/components/finance/cost-results/format"
import { CalcNotesCallout } from "@/components/finance/calc-jobs/tabs/calc-notes-callout"
import { parseCalcNotes } from "@/components/finance/calc-jobs/tabs/calc-job-tab-utils"
import { normalizeCostRmDetail } from "@/types/finance/cost-calc"

const base = { rmType: "GROUP", refCode: "A", refLabel: "L", shadeCode: "", unitCost: "1", ratio: "0.5", contribution: "1", routeLevel: 1 }

describe("normalizeCostRmDetail denier", () => {
  it("reads camel and snake", () => {
    expect(normalizeCostRmDetail({ denier: 40, ratioSource: "DENIER" })).toMatchObject({ denier: 40, ratioSource: "DENIER" })
    expect(normalizeCostRmDetail({ denier: 30, ratio_source: "SPANDEX_DRAFT" })).toMatchObject({ denier: 30, ratioSource: "SPANDEX_DRAFT" })
    expect(normalizeCostRmDetail({})).toMatchObject({ denier: 0, ratioSource: "" })
  })
})

describe("RmTab denier columns", () => {
  it("hidden when no row has ratioSource", () => {
    render(<RmTab rows={[{ ...base, denier: 0, ratioSource: "" }]} />)
    expect(screen.queryByText("Denier")).toBeNull()
    expect(screen.queryByText("Ratio Src")).toBeNull()
  })
  it("shown when any row has ratioSource", () => {
    render(<RmTab rows={[{ ...base, denier: 40, ratioSource: "DENIER" }]} />)
    expect(screen.getByText("Denier")).toBeTruthy()
    expect(screen.getByText("Ratio Src")).toBeTruthy()
    // Denier is formatted with formatNumeric, same as the ratio column.
    expect(screen.getByText(formatNumeric(40))).toBeTruthy()
  })
})

describe("calc notes", () => {
  it("parses notes", () => {
    expect(parseCalcNotes('{"notes":["a","b"]}')).toEqual(["a", "b"])
    expect(parseCalcNotes("bad")).toEqual([])
    expect(parseCalcNotes('{"x":1}')).toEqual([])
  })
  it("callout renders notes or nothing", () => {
    const { container, rerender } = render(<CalcNotesCallout notes={[]} />)
    expect(container.firstChild).toBeNull()
    rerender(<CalcNotesCallout notes={["missing denier"]} />)
    expect(screen.getByText("missing denier")).toBeTruthy()
  })
})
