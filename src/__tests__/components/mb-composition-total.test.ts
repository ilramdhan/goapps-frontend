/**
 * R22 — unit tests for the shared composition-total helpers used by both
 * MbCompositionTab (display) and MbRecipeActionBar (submit gate).
 *
 * Pins:
 *   1. Carrier rows are excluded from the sum, mirroring the backend's
 *      pctDelta (services/finance/internal/application/mbcomposition/sum_enforcement.go).
 *   2. exceedsMbCompositionTotal only fires on a REAL overage beyond SumTolerance
 *      (0.01), not on ordinary float drift at the 100% boundary.
 *   3. exceedsMbCompositionTotal does NOT fire when the total is under 100% —
 *      R22 only asked for blocking on "exceeds 100%".
 */
import { describe, it, expect } from "vitest"

import {
  sumMbCompositionPct,
  exceedsMbCompositionTotal,
  isOffMbCompositionTotal,
  MB_COMPOSITION_SUM_TOLERANCE,
} from "@/lib/finance/mb-composition-total"
import type { MbComposition } from "@/types/finance/mb-composition"

function line(compositionPct: string, isCarrier = false): Pick<MbComposition, "compositionPct" | "isCarrier"> {
  return { compositionPct, isCarrier }
}

describe("sumMbCompositionPct", () => {
  it("sums non-carrier rows only, excluding carrier rows", () => {
    const items = [line("60"), line("40"), line("25", true)]
    expect(sumMbCompositionPct(items)).toBe(100)
  })

  it("returns 0 for an empty composition", () => {
    expect(sumMbCompositionPct([])).toBe(0)
  })

  it("treats an unparsable percentage as 0 rather than NaN", () => {
    expect(sumMbCompositionPct([line("60"), line("not-a-number")])).toBe(60)
  })
})

describe("exceedsMbCompositionTotal", () => {
  it("does not fire exactly at 100%", () => {
    expect(exceedsMbCompositionTotal(100)).toBe(false)
  })

  it("does not fire within tolerance above 100% (float-drift boundary)", () => {
    expect(exceedsMbCompositionTotal(100 + MB_COMPOSITION_SUM_TOLERANCE)).toBe(false)
  })

  it("fires on a real overage beyond tolerance", () => {
    expect(exceedsMbCompositionTotal(105)).toBe(true)
  })

  it("does NOT fire when the total is under 100% — R22 only blocks on exceeding", () => {
    expect(exceedsMbCompositionTotal(60)).toBe(false)
    expect(exceedsMbCompositionTotal(0)).toBe(false)
  })
})

describe("isOffMbCompositionTotal", () => {
  it("is false when the total is within tolerance of 100%", () => {
    expect(isOffMbCompositionTotal(100)).toBe(false)
    expect(isOffMbCompositionTotal(99.995)).toBe(false)
  })

  it("is true when the total is under 100% beyond tolerance", () => {
    expect(isOffMbCompositionTotal(60)).toBe(true)
  })

  it("is true when the total is over 100% beyond tolerance", () => {
    expect(isOffMbCompositionTotal(105)).toBe(true)
  })
})
