/**
 * MB Dozing normalizers.
 *
 * The load-bearing invariant: `result_ldr` is OPTIONAL on the wire and is LEFT
 * UNSET when no conversion factor exists (D13). "no result" (absent) and "the
 * result is zero" (0) are DIFFERENT answers and must never collapse into each
 * other — a `?? 0` here would silently invent a number.
 */
import { describe, it, expect } from "vitest"

import {
  normalizeDozingCalculation,
  normalizeDozingImpact,
  MB_DOZING_MODES,
  MB_DOZING_MODE_OPTIONS,
} from "@/types/finance/mb-dozing"

describe("normalizeDozingCalculation — absent vs zero result_ldr", () => {
  it("keeps an ABSENT result_ldr absent (never 0)", () => {
    const out = normalizeDozingCalculation({
      base: { isSuccess: true, message: "no conversion factor for RND -> RSD" },
      formula_code: "F_MB_LDR_XSECTION",
      calculation_trace: "",
      factor_available: false,
    })

    expect(out.resultLdr).toBeUndefined()
    expect(out.resultLdr).not.toBe(0)
    expect("resultLdr" in out && out.resultLdr === 0).toBe(false)
    expect(out.factorAvailable).toBe(false)
    expect(out.message).toBe("no conversion factor for RND -> RSD")
  })

  it("keeps an EXPLICIT result_ldr of 0 as 0", () => {
    const out = normalizeDozingCalculation({
      base: { isSuccess: true, message: "ok" },
      result_ldr: 0,
      formula_code: "F_MB_LDR_SCALE",
      calculation_trace: "0 * sqrt(1) = 0",
      factor_available: true,
    })

    expect(out.resultLdr).toBe(0)
    expect(out.resultLdr).not.toBeUndefined()
    expect(out.factorAvailable).toBe(true)
  })

  it("never substitutes a 1.0 fallback when the factor is unavailable", () => {
    const out = normalizeDozingCalculation({ factor_available: false })
    expect(out.resultLdr).toBeUndefined()
    expect(out.resultLdr).not.toBe(1)
  })
})

describe("normalizeDozingCalculation — wire spellings", () => {
  it("normalizes a camelCase payload", () => {
    const out = normalizeDozingCalculation({
      base: { isSuccess: true, message: "ok" },
      resultLdr: 12.5,
      formulaCode: "F_MB_LDR_SCALE",
      calculationTrace: "10 * sqrt(300/150 * 48/72)",
      factorAvailable: true,
    })

    expect(out).toEqual({
      resultLdr: 12.5,
      formulaCode: "F_MB_LDR_SCALE",
      calculationTrace: "10 * sqrt(300/150 * 48/72)",
      factorAvailable: true,
      message: "ok",
    })
  })

  it("normalizes a snake_case payload identically", () => {
    const out = normalizeDozingCalculation({
      base: { isSuccess: true, message: "ok" },
      result_ldr: 12.5,
      formula_code: "F_MB_LDR_SCALE",
      calculation_trace: "10 * sqrt(300/150 * 48/72)",
      factor_available: true,
    })

    expect(out).toEqual({
      resultLdr: 12.5,
      formulaCode: "F_MB_LDR_SCALE",
      calculationTrace: "10 * sqrt(300/150 * 48/72)",
      factorAvailable: true,
      message: "ok",
    })
  })

  it("accepts result_ldr delivered as a string", () => {
    expect(normalizeDozingCalculation({ result_ldr: "7.25" }).resultLdr).toBe(7.25)
  })
})

describe("normalizeDozingImpact", () => {
  it("normalizes camelCase and Number()s the int64 totals", () => {
    const out = normalizeDozingImpact({
      base: { isSuccess: true },
      data: [
        {
          cpmProductSysId: 101,
          cpmProductCode: "P-101",
          cpmProductName: "Product 101",
          cpmIsLocked: true,
          frozenDozing: 3.5,
        },
      ],
      totalAffected: "42",
      totalLocked: "7",
      truncated: true,
      note: "2 products missing costing",
    })

    expect(out.totalAffected).toBe(42)
    expect(out.totalLocked).toBe(7)
    expect(typeof out.totalAffected).toBe("number")
    expect(out.truncated).toBe(true)
    expect(out.note).toBe("2 products missing costing")
    expect(out.rows[0]).toEqual({
      cpmProductSysId: 101,
      cpmProductCode: "P-101",
      cpmProductName: "Product 101",
      cpmIsLocked: true,
      frozenDozing: 3.5,
    })
  })

  it("normalizes snake_case identically", () => {
    const out = normalizeDozingImpact({
      data: [
        {
          cpm_product_sys_id: "202",
          cpm_product_code: "P-202",
          cpm_product_name: "Product 202",
          cpm_is_locked: false,
          frozen_dozing: 0,
        },
      ],
      total_affected: "1",
      total_locked: "0",
    })

    expect(out.totalAffected).toBe(1)
    expect(out.totalLocked).toBe(0)
    expect(out.rows[0].cpmProductSysId).toBe(202)
    expect(out.rows[0].cpmProductCode).toBe("P-202")
    // An explicit frozen dozing of 0 survives as 0.
    expect(out.rows[0].frozenDozing).toBe(0)
  })

  it("keeps an absent frozen_dozing absent rather than 0", () => {
    const out = normalizeDozingImpact({
      data: [{ cpm_product_sys_id: 3, cpm_product_code: "P-3", cpm_product_name: "Three" }],
    })
    expect(out.rows[0].frozenDozing).toBeUndefined()
    expect(out.rows[0].frozenDozing).not.toBe(0)
    expect(out.totalAffected).toBe(0)
  })
})

describe("dozing modes — STRENGTH is on hold (G6-C3)", () => {
  it("exposes SCALE and XSECTION only", () => {
    expect(MB_DOZING_MODES).toEqual(["SCALE", "XSECTION"])
    expect(MB_DOZING_MODE_OPTIONS).toHaveLength(2)
  })

  it("contains no STRENGTH mode or option", () => {
    expect(MB_DOZING_MODES as readonly string[]).not.toContain("STRENGTH")
    for (const opt of MB_DOZING_MODE_OPTIONS) {
      expect(opt.value).not.toBe("STRENGTH")
      expect(opt.label.toUpperCase()).not.toContain("STRENGTH")
    }
  })
})
