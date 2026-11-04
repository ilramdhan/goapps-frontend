import { describe, expect, it } from "vitest"

import { getConversionCostFields } from "@/components/finance/cost-results/conversion-cost"

describe("getConversionCostFields", () => {
  it("returns values and stages", () => {
    const r = getConversionCostFields({
      CAPTIVE_COST_QLTY_LOSS: "1.5",
      DELIVERY_COST_QLTY_LOSS: "2.5",
      TOTAL_CAP_CONV: "10",
      TOTAL_DEL_CONV: "12",
      CAP_CONV_STAGE: "SPIN",
      DEL_CONV_STAGE: "TWIST",
    })
    expect(r).toEqual({
      capCost: "1.5",
      delCost: "2.5",
      totalCapConv: "10",
      totalDelConv: "12",
      capConvStage: "SPIN",
      delConvStage: "TWIST",
    })
  })
  it("returns null for missing, blank, or undefined snapshot", () => {
    const r = getConversionCostFields({ TOTAL_CAP_CONV: "  ", CAP_CONV_STAGE: "" })
    expect(Object.values(r).every((v) => v === null)).toBe(true)
    expect(Object.values(getConversionCostFields(undefined)).every((v) => v === null)).toBe(true)
  })
  it("keeps a real zero", () => {
    expect(getConversionCostFields({ TOTAL_DEL_CONV: "0" }).totalDelConv).toBe("0")
  })
})
