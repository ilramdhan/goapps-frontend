/**
 * MB Spin "multiple/zero variant" marker — proves the four states from
 * docs/superpowers/mbspin-tanda-varian-ganda-rancangan.md §Rencana Frontend
 * are distinguishable, and that the normalizer carries the three raw fields
 * (valueMbSpinId, mbSpinCandidateCount, hasMbSpinCandidateCount) through for
 * both camelCase and snake_case API responses.
 *
 *   (1) SUDAH TERPILIH — valueMbSpinId non-empty            -> no marker
 *   (2) AMBIGU          — empty + hasCount=true + count > 1 -> "ambiguous"
 *   (3) TIDAK DIKENALI  — empty + hasCount=true + count = 0 -> "unmatched"
 *   (4) TIDAK BERLAKU   — hasMbSpinCandidateCount = false   -> no marker
 *
 * hasMbSpinCandidateCount=false must NEVER be conflated with count===0 — the
 * whole point of the flag is to distinguish "not applicable" from "matched
 * zero variants", so tests exercise that boundary directly.
 */
import { describe, it, expect } from "vitest"
import {
  normalizeRequiredEntry,
  getMbSpinAmbiguityState,
  getMbSpinAmbiguityMessage,
  type RequiredParamEntry,
} from "@/types/finance/cost-product-parameter"

function baseEntry(overrides: Partial<RequiredParamEntry> = {}): RequiredParamEntry {
  return {
    paramId: "p-1",
    paramCode: "MB_SP_CODE",
    paramName: "SP Code",
    paramShortName: "SP Code",
    dataType: "TEXT",
    paramCategory: "REQUIRED",
    uomCode: "",
    ownerDepartment: "",
    isRequiredForCosting: true,
    lookupMasterCode: "MB_SPIN",
    lookupFillGroupCode: "",
    lookupSourceColumn: "",
    displayOrder: 1,
    displayGroup: "General",
    hasValue: true,
    valueNumeric: "",
    valueText: "CMB0000733",
    valueFlag: false,
    filledAt: "",
    filledBy: "",
    valueMbSpinId: "",
    mbSpinCandidateCount: 0,
    hasMbSpinCandidateCount: false,
  mbSpinCandidates: [],
    ...overrides,
  }
}

describe("getMbSpinAmbiguityState — four distinguishable states", () => {
  it("(1) SUDAH TERPILIH — non-empty valueMbSpinId -> no marker, regardless of count fields", () => {
    const entry = baseEntry({
      valueMbSpinId: "11111111-1111-1111-1111-111111111111",
      hasMbSpinCandidateCount: true,
      mbSpinCandidateCount: 3, // even if count says "ambiguous", a resolved id wins
    })
    expect(getMbSpinAmbiguityState(entry)).toBeNull()
  })

  it("(2) AMBIGU — empty valueMbSpinId + hasCount=true + count > 1 -> ambiguous", () => {
    const entry = baseEntry({
      valueMbSpinId: "",
      hasMbSpinCandidateCount: true,
      mbSpinCandidateCount: 3,
    })
    expect(getMbSpinAmbiguityState(entry)).toBe("ambiguous")
  })

  it("(3) TIDAK DIKENALI — empty valueMbSpinId + hasCount=true + count === 0 -> unmatched", () => {
    const entry = baseEntry({
      valueMbSpinId: "",
      hasMbSpinCandidateCount: true,
      mbSpinCandidateCount: 0,
    })
    expect(getMbSpinAmbiguityState(entry)).toBe("unmatched")
  })

  it("(4) TIDAK BERLAKU — hasMbSpinCandidateCount=false -> no marker, even though count looks like 0", () => {
    // The critical non-conflation case: count is 0 (the zero-value default a
    // ts-proto response would carry) AND hasMbSpinCandidateCount is false.
    // This must NOT be read the same as state (3).
    const entry = baseEntry({
      valueMbSpinId: "",
      hasMbSpinCandidateCount: false,
      mbSpinCandidateCount: 0,
    })
    expect(getMbSpinAmbiguityState(entry)).toBeNull()
  })

  it("(4) TIDAK BERLAKU also covers hasMbSpinCandidateCount=false with a stray non-zero count", () => {
    const entry = baseEntry({
      valueMbSpinId: "",
      hasMbSpinCandidateCount: false,
      mbSpinCandidateCount: 5,
    })
    expect(getMbSpinAmbiguityState(entry)).toBeNull()
  })

  it("count === 1 with an empty valueMbSpinId is treated as no marker (resolver bug territory, not ambiguous)", () => {
    const entry = baseEntry({
      valueMbSpinId: "",
      hasMbSpinCandidateCount: true,
      mbSpinCandidateCount: 1,
    })
    expect(getMbSpinAmbiguityState(entry)).toBeNull()
  })
})

describe("getMbSpinAmbiguityMessage — (2) and (3) must be distinct messages", () => {
  it("ambiguous message mentions choosing a variant, optionally with the count", () => {
    const msg = getMbSpinAmbiguityMessage("ambiguous", 3)
    expect(msg).toBe("Kode ini punya 3 varian — silakan pilih salah satu.")
  })

  it("ambiguous message falls back gracefully without a count", () => {
    const msg = getMbSpinAmbiguityMessage("ambiguous")
    expect(msg).toBe("Kode ini punya beberapa varian — silakan pilih salah satu.")
  })

  it("unmatched message is a different sentence about missing master data, not variant choice", () => {
    const msg = getMbSpinAmbiguityMessage("unmatched")
    expect(msg).toBe("Kode ini tidak ditemukan di data master — perlu diperbaiki lebih dulu.")
  })

  it("ambiguous and unmatched messages never share the same text", () => {
    expect(getMbSpinAmbiguityMessage("ambiguous", 2)).not.toBe(getMbSpinAmbiguityMessage("unmatched"))
  })

  it("neither message leaks technical terms (uuid/column names) or raw unexplained numbers", () => {
    const ambiguous = getMbSpinAmbiguityMessage("ambiguous", 3)
    const unmatched = getMbSpinAmbiguityMessage("unmatched")
    for (const msg of [ambiguous, unmatched]) {
      expect(msg.toLowerCase()).not.toContain("uuid")
      expect(msg.toLowerCase()).not.toContain("mb_spin_id")
      expect(msg.toLowerCase()).not.toContain("candidate_count")
    }
  })
})

describe("normalizeRequiredEntry — carries the three MB Spin fields through both casings", () => {
  it("reads camelCase fields as sent by the gRPC-backed BFF route", () => {
    const raw = {
      paramId: "p-1",
      paramCode: "MB_SP_CODE",
      dataType: "TEXT",
      valueMbSpinId: "",
      mbSpinCandidateCount: 4,
      hasMbSpinCandidateCount: true,
    }
    const normalized = normalizeRequiredEntry(raw)
    expect(normalized.valueMbSpinId).toBe("")
    expect(normalized.mbSpinCandidateCount).toBe(4)
    expect(normalized.hasMbSpinCandidateCount).toBe(true)
    expect(getMbSpinAmbiguityState(normalized)).toBe("ambiguous")
  })

  it("reads snake_case fields the same way", () => {
    const raw = {
      param_id: "p-1",
      param_code: "MB_SP_CODE",
      data_type: "TEXT",
      value_mb_spin_id: "",
      mb_spin_candidate_count: 0,
      has_mb_spin_candidate_count: true,
    }
    const normalized = normalizeRequiredEntry(raw)
    expect(normalized.valueMbSpinId).toBe("")
    expect(normalized.mbSpinCandidateCount).toBe(0)
    expect(normalized.hasMbSpinCandidateCount).toBe(true)
    expect(getMbSpinAmbiguityState(normalized)).toBe("unmatched")
  })

  it("defaults to the not-applicable state when the three fields are absent entirely", () => {
    const raw = { paramId: "p-1", paramCode: "MB_THROUGHPUT", dataType: "NUMBER" }
    const normalized = normalizeRequiredEntry(raw)
    expect(normalized.valueMbSpinId).toBe("")
    expect(normalized.mbSpinCandidateCount).toBe(0)
    expect(normalized.hasMbSpinCandidateCount).toBe(false)
    expect(getMbSpinAmbiguityState(normalized)).toBeNull()
  })

  it('does not misparse a string "false" as truthy (Boolean("false") pitfall)', () => {
    const raw = {
      paramId: "p-1",
      paramCode: "MB_SP_CODE",
      dataType: "TEXT",
      value_mb_spin_id: "",
      mb_spin_candidate_count: "0",
      has_mb_spin_candidate_count: "false",
    }
    const normalized = normalizeRequiredEntry(raw)
    expect(normalized.hasMbSpinCandidateCount).toBe(false)
    expect(getMbSpinAmbiguityState(normalized)).toBeNull()
  })

  it('parses a string "true" boolean correctly (defensive string-shaped raw input)', () => {
    const raw = {
      paramId: "p-1",
      paramCode: "MB_SP_CODE",
      dataType: "TEXT",
      value_mb_spin_id: "",
      mb_spin_candidate_count: "2",
      has_mb_spin_candidate_count: "true",
    }
    const normalized = normalizeRequiredEntry(raw)
    expect(normalized.hasMbSpinCandidateCount).toBe(true)
    expect(normalized.mbSpinCandidateCount).toBe(2)
    expect(getMbSpinAmbiguityState(normalized)).toBe("ambiguous")
  })

  it("resolved variant (state 1) stays marker-free even when camelCase count fields also arrive", () => {
    const raw = {
      paramId: "p-1",
      paramCode: "MB_SP_CODE",
      dataType: "TEXT",
      valueMbSpinId: "22222222-2222-2222-2222-222222222222",
      mbSpinCandidateCount: 1,
      hasMbSpinCandidateCount: true,
    }
    const normalized = normalizeRequiredEntry(raw)
    expect(getMbSpinAmbiguityState(normalized)).toBeNull()
  })
})
