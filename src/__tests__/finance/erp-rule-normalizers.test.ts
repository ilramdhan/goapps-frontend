import { describe, it, expect } from "vitest"

import { normalizeValLossRule, normalizeSellPrice, normalizeGradeGroup, normalizeRuleChange } from "@/types/finance/erp-rule"

describe("erp-rule normalizers", () => {
  it("camelCase and snake_case give the same ValLossRule; decimals stay strings", () => {
    const a = normalizeValLossRule({ id: "5", fgType: "F", valLoss: "0.12500", isActive: true })
    const b = normalizeValLossRule({ id: 5, fg_type: "F", val_loss: "0.12500", is_active: true })
    expect(a).toEqual(b)
    expect(a.valLoss).toBe("0.12500")
    expect(a.id).toBe(5)
  })

  it("missing optional fields default safely", () => {
    expect(normalizeSellPrice({ basis: "B" }).price).toBe("")
    expect(normalizeGradeGroup({ grade_code: "G" }).gradeGroup).toBe("")
    const c = normalizeRuleChange({ subject: "s" })
    expect(c.before).toEqual([])
    expect(c.after).toEqual([])
  })
})
