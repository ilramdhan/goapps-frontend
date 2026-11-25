import { describe, it, expect } from "vitest"

import { LATEST_AUTO, pickDefaultPeriod } from "@/components/finance/mb-recipe/mb-cost-calc-export-dialog"
import { normalizeMbBatchErrors } from "@/types/finance/mb-batch"

describe("pickDefaultPeriod", () => {
  it("defaults to the first (latest) period", () => {
    expect(pickDefaultPeriod(["202611", "202610"])).toBe("202611")
  })
  it("falls back to auto when no periods", () => {
    expect(pickDefaultPeriod([])).toBe(LATEST_AUTO)
  })
})

describe("normalizeMbBatchErrors", () => {
  it("reads camelCase and snake_case", () => {
    expect(
      normalizeMbBatchErrors([
        { mbhId: "a", error: "MB1: boom" },
        { mbh_id: "b", error: "MB2: bad" },
      ]),
    ).toEqual([
      { mbhId: "a", error: "MB1: boom" },
      { mbhId: "b", error: "MB2: bad" },
    ])
  })
  it("tolerates missing/invalid input", () => {
    expect(normalizeMbBatchErrors(undefined)).toEqual([])
    expect(normalizeMbBatchErrors([null])).toEqual([{ mbhId: "", error: "" }])
  })
})
