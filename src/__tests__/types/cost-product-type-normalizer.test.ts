import { describe, it, expect } from "vitest"
import { normalizeCostProductType } from "@/types/finance/cost-product-type"

describe("normalizeCostProductType rmRatioMode", () => {
  it("reads camelCase", () => {
    expect(normalizeCostProductType({ typeId: 1, rmRatioMode: "DENIER" }).rmRatioMode).toBe("DENIER")
  })
  it("reads snake_case", () => {
    expect(normalizeCostProductType({ type_id: 1, rm_ratio_mode: "DENIER" }).rmRatioMode).toBe("DENIER")
  })
  it("defaults to INPUT when empty or unknown", () => {
    expect(normalizeCostProductType({ typeId: 1 }).rmRatioMode).toBe("INPUT")
    expect(normalizeCostProductType({ typeId: 1, rmRatioMode: "" }).rmRatioMode).toBe("INPUT")
  })
})
