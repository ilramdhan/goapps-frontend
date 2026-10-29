// Display helpers for route RM ratios.
//
// For products in DENIER ratio mode the backend computes each denier line's
// ratio from the line deniers in the same seq (denier / sum of deniers) — the
// value the cost calc engine actually uses. The stored routeRmRatio stays as
// entered and is ignored by calc for those lines, so the route editor must
// show computedRatio read-only instead. Numbers go through formatNumeric so
// they match the cost result RM tab exactly.

import { formatNumeric } from "@/components/finance/cost-results/format"
import type { CostRouteRm, CostRouteSeq } from "@/types/finance/cost-route"

export const DENIER_RATIO_DISABLED_HINT =
  "Calculated from denier (DENIER ratio mode). Change DENIER on the yarn product, the RM group Denier, or SPANDEX_DRAFT on this product."

export const GROUP_MISSING_DENIER_HINT =
  "RM Group belum punya denier — rasio tidak dihitung dari denier dan memakai rasio input. Isi Denier di master RM Group lalu hitung ulang."

/**
 * True when the product is in DENIER mode and a GROUP line has no denier while
 * another line in the same seq is denier-derived: the backend treats the group
 * as non-denier (keeps the stored ratio), so it is left out of the denier sum
 * and the yarn ratios no longer add up. Seqs with no denier line at all (e.g.
 * chip + additive groups) are not flagged — those groups never carry denier.
 */
export function isGroupMissingDenier(
  seq: Pick<CostRouteSeq, "rmRatioMode" | "rms"> | null | undefined,
  rm: Pick<CostRouteRm, "rmType" | "ratioSource">,
): boolean {
  return (
    seq?.rmRatioMode === "DENIER" &&
    rm.rmType === "GROUP" &&
    !isDenierLine(rm) &&
    (seq.rms ?? []).some(isDenierLine)
  )
}

/** True when the backend derived this line's ratio from denier (read-only). */
export function isDenierLine(rm: Pick<CostRouteRm, "ratioSource">): boolean {
  return rm.ratioSource === "DENIER"
}

/**
 * The ratio value the calc engine uses for this line, unformatted:
 *  - nested-MB rows (originHeadId set): effectiveRatio (flattened product)
 *  - denier-derived lines: computedRatio (stored routeRmRatio is ignored)
 *  - everything else: the stored, user-editable routeRmRatio (so local edits
 *    show immediately — effectiveRatio is only refreshed on reload).
 */
export function ratioValue(
  rm: Pick<
    CostRouteRm,
    "ratioSource" | "computedRatio" | "effectiveRatio" | "routeRmRatio" | "originHeadId"
  >,
): number {
  if (rm.originHeadId) return rm.effectiveRatio ?? rm.computedRatio ?? rm.routeRmRatio
  if (isDenierLine(rm)) return rm.computedRatio ?? 0
  return rm.routeRmRatio
}

/** Formatted ratio for display (same formatting as the cost result RM tab). */
export function displayRatio(rm: Parameters<typeof ratioValue>[0]): string {
  return formatNumeric(ratioValue(rm))
}

function trimNum(n: number): string {
  // Compact, locale-neutral rendering for the formula (max 3 decimals).
  return String(Math.round(n * 1000) / 1000)
}

/**
 * Human explanation of a denier line's ratio, e.g.
 * "150 / (150 + 13.333) = 0.918", built from sibling denier lines in the same
 * seq. Returns ratioNote when the backend supplied one (e.g. missing denier),
 * and "" for non-denier lines.
 */
export function denierFormula(
  seq: Pick<CostRouteSeq, "rms"> | null | undefined,
  rm: Pick<CostRouteRm, "ratioSource" | "computedRatio" | "denier" | "ratioNote">,
): string {
  if (!isDenierLine(rm)) return ""
  if (rm.ratioNote) return rm.ratioNote
  const deniers = (seq?.rms ?? []).filter(isDenierLine).map((r) => r.denier ?? 0)
  const total = deniers.reduce((a, b) => a + b, 0)
  const own = rm.denier ?? 0
  if (deniers.length === 0 || total === 0) {
    return `denier ${trimNum(own)} = ${trimNum(rm.computedRatio ?? 0)}`
  }
  return `${trimNum(own)} / (${deniers.map(trimNum).join(" + ")}) = ${trimNum(rm.computedRatio ?? 0)}`
}
