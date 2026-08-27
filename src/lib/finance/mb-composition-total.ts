// MB Composition total-percentage helpers (R22).
//
// Mirrors the backend's composition-sum invariant so the UI and the (currently
// flag-gated) backend gate agree on what counts toward the total:
//   - goapps-backend/services/finance/internal/domain/mbcomposition/sum_rule.go
//     (ValidateSum, SumTolerance) — the rule is "non-carrier rows must sum to
//     100% within a 0.01 tolerance", not "must not exceed 100%".
//   - goapps-backend/services/finance/internal/application/mbcomposition/
//     sum_enforcement.go (pctDelta) — carrier rows contribute 0 to the sum.
//
// This module intentionally exposes a SEPARATE "exceeds 100%" check
// (`exceedsMbCompositionTotal`) rather than reusing the backend's "must equal
// 100%" rule for UI blocking: R22 only asked for blocking on "total > 100%",
// and the backend's stricter equality rule is a decision gate (see R22 report)
// that has not been resolved by the user — this file must not silently adopt it.
import type { MbComposition } from "@/types/finance/mb-composition"

// Same absolute tolerance as the backend's SumTolerance (percentage points).
export const MB_COMPOSITION_SUM_TOLERANCE = 0.01

// Absorbs float64 representation error at the tolerance boundary (mirrors the
// backend's boundarySlack, sum_rule.go G23) so a total sitting exactly on the
// boundary (e.g. 100 + MB_COMPOSITION_SUM_TOLERANCE) is not rejected by a
// sub-percent floating-point artifact.
const BOUNDARY_SLACK = 1e-9

/**
 * Sums the non-carrier composition percentages — the same quantity the backend
 * checks against 100%. Carrier rows are excluded, matching pctDelta server-side.
 */
export function sumMbCompositionPct(
  items: Pick<MbComposition, "compositionPct" | "isCarrier">[],
): number {
  return items.reduce((sum, c) => (c.isCarrier ? sum : sum + (Number(c.compositionPct) || 0)), 0)
}

/** True when the total is more than SumTolerance above 100% (real overage, not float drift). */
export function exceedsMbCompositionTotal(total: number): boolean {
  return total - 100 > MB_COMPOSITION_SUM_TOLERANCE + BOUNDARY_SLACK
}

/** True when the total is not within SumTolerance of 100% (either side). */
export function isOffMbCompositionTotal(total: number): boolean {
  return Math.abs(total - 100) > MB_COMPOSITION_SUM_TOLERANCE + BOUNDARY_SLACK
}
