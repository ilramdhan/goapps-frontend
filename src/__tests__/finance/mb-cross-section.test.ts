// MB Cross Section normalizers — camelCase and snake_case wire shapes, and the
// invariant that all six codes (RND, TBL, OTL, SPC, PLUS, RSD) survive intact.
import { describe, it, expect } from "vitest"

import {
  normalizeMbCrossSection,
  normalizeMbCrossSectionFactor,
  MB_CROSS_SECTION_KNOWN_CODES,
  DEFAULT_MB_CROSS_SECTION_FORM_VALUES,
  DEFAULT_MB_CROSS_SECTION_FACTOR_FORM_VALUES,
} from "@/types/finance/mb-cross-section"

describe("normalizeMbCrossSection", () => {
  it("normalizes a camelCase payload", () => {
    const out = normalizeMbCrossSection({
      mbcsId: "11111111-1111-1111-1111-111111111111",
      code: "RND",
      displayName: "Round",
      description: "Round cross section",
      isActive: true,
      displayOrder: 1,
      audit: { createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z" },
    })

    expect(out).toEqual({
      mbcsId: "11111111-1111-1111-1111-111111111111",
      code: "RND",
      displayName: "Round",
      description: "Round cross section",
      isActive: true,
      displayOrder: 1,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
    })
  })

  it("normalizes a snake_case payload", () => {
    const out = normalizeMbCrossSection({
      mbcs_id: "22222222-2222-2222-2222-222222222222",
      code: "TBL",
      display_name: "Trilobal",
      is_active: false,
      display_order: "7",
      audit: { created_at: "2026-03-04T00:00:00Z", updated_at: "2026-03-05T00:00:00Z" },
    })

    expect(out.mbcsId).toBe("22222222-2222-2222-2222-222222222222")
    expect(out.displayName).toBe("Trilobal")
    expect(out.isActive).toBe(false)
    // display_order arrives as a string on the gateway path — coerced to number.
    expect(out.displayOrder).toBe(7)
    expect(typeof out.displayOrder).toBe("number")
    expect(out.createdAt).toBe("2026-03-04T00:00:00Z")
    expect(out.updatedAt).toBe("2026-03-05T00:00:00Z")
  })

  it("falls back to safe defaults for an empty payload", () => {
    const out = normalizeMbCrossSection({})
    expect(out.mbcsId).toBe("")
    expect(out.code).toBe("")
    expect(out.displayOrder).toBe(0)
    expect(out.isActive).toBe(true)
    expect(out.createdAt).toBeUndefined()
  })

  it("passes every one of the six valid codes through verbatim, RSD included", () => {
    for (const code of MB_CROSS_SECTION_KNOWN_CODES) {
      expect(normalizeMbCrossSection({ code }).code).toBe(code)
    }
    // RSD is the legitimate sixth value and must never be dropped or remapped.
    expect(MB_CROSS_SECTION_KNOWN_CODES).toContain("RSD")
    expect(MB_CROSS_SECTION_KNOWN_CODES).toHaveLength(6)
    expect(normalizeMbCrossSection({ code: "RSD" }).code).toBe("RSD")
    expect(normalizeMbCrossSection({ code: "RSD", display_name: "" }).displayName).toBe("")
  })
})

describe("normalizeMbCrossSectionFactor", () => {
  it("normalizes a camelCase payload", () => {
    const out = normalizeMbCrossSectionFactor({
      mbcfId: "33333333-3333-3333-3333-333333333333",
      fromCode: "RND",
      toCode: "RSD",
      factor: 1.25,
      operation: "MULTIPLY",
      note: "per Finance",
      isActive: true,
      audit: { createdAt: "2026-02-02T00:00:00Z" },
    })

    expect(out.mbcfId).toBe("33333333-3333-3333-3333-333333333333")
    expect(out.fromCode).toBe("RND")
    expect(out.toCode).toBe("RSD")
    expect(out.factor).toBe(1.25)
    expect(out.operation).toBe("MULTIPLY")
    expect(out.note).toBe("per Finance")
    expect(out.createdAt).toBe("2026-02-02T00:00:00Z")
  })

  it("normalizes a snake_case payload and coerces a stringified factor", () => {
    const out = normalizeMbCrossSectionFactor({
      mbcf_id: "44444444-4444-4444-4444-444444444444",
      from_code: "RSD",
      to_code: "PLUS",
      factor: "0.8",
      operation: "DIVIDE",
      is_active: false,
      audit: { updated_at: "2026-02-09T00:00:00Z" },
    })

    expect(out.fromCode).toBe("RSD")
    expect(out.toCode).toBe("PLUS")
    expect(out.factor).toBe(0.8)
    expect(typeof out.factor).toBe("number")
    expect(out.operation).toBe("DIVIDE")
    expect(out.isActive).toBe(false)
    expect(out.updatedAt).toBe("2026-02-09T00:00:00Z")
  })

  it("keeps direction and operation independent — the reverse pair is its own row", () => {
    const forward = normalizeMbCrossSectionFactor({
      from_code: "RND",
      to_code: "TBL",
      factor: 1.1,
      operation: "MULTIPLY",
    })
    const reverse = normalizeMbCrossSectionFactor({
      from_code: "TBL",
      to_code: "RND",
      factor: 1.1,
      operation: "DIVIDE",
    })

    expect(forward.fromCode).toBe(reverse.toCode)
    expect(forward.toCode).toBe(reverse.fromCode)
    expect(forward.operation).not.toBe(reverse.operation)
  })

  it("falls back to safe defaults for an empty payload", () => {
    const out = normalizeMbCrossSectionFactor({})
    expect(out.mbcfId).toBe("")
    expect(out.fromCode).toBe("")
    expect(out.factor).toBe(0)
    expect(out.operation).toBe("")
    expect(out.isActive).toBe(true)
  })
})

describe("form defaults", () => {
  it("cross section defaults are active with an empty code", () => {
    expect(DEFAULT_MB_CROSS_SECTION_FORM_VALUES).toEqual({
      code: "",
      displayName: "",
      description: "",
      isActive: true,
      displayOrder: 0,
    })
  })

  it("factor defaults use MULTIPLY and a positive factor", () => {
    expect(DEFAULT_MB_CROSS_SECTION_FACTOR_FORM_VALUES.operation).toBe("MULTIPLY")
    expect(DEFAULT_MB_CROSS_SECTION_FACTOR_FORM_VALUES.factor).toBeGreaterThan(0)
  })
})
