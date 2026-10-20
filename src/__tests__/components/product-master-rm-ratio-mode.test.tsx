import { describe, it, expect } from "vitest"
import { normalizeCostProductMaster } from "@/types/finance/cost-product-master"

describe("normalizeCostProductMaster rm ratio mode", () => {
  it("reads camelCase", () => {
    const p = normalizeCostProductMaster({ rmRatioModeOverride: "DENIER", effectiveRmRatioMode: "DENIER" })
    expect(p.rmRatioModeOverride).toBe("DENIER")
    expect(p.effectiveRmRatioMode).toBe("DENIER")
  })
  it("reads snake_case", () => {
    const p = normalizeCostProductMaster({ rm_ratio_mode_override: "INPUT", effective_rm_ratio_mode: "INPUT" })
    expect(p.rmRatioModeOverride).toBe("INPUT")
    expect(p.effectiveRmRatioMode).toBe("INPUT")
  })
  it("defaults to empty and rejects unknown values", () => {
    expect(normalizeCostProductMaster({}).rmRatioModeOverride).toBe("")
    expect(normalizeCostProductMaster({ rmRatioModeOverride: "BOGUS" }).rmRatioModeOverride).toBe("")
  })
})
