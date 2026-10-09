// Human-readable labels for cost-calc block reason codes.
// Unknown codes/free text pass through unchanged so nothing is hidden.

export const BLOCK_REASON_LABELS: Record<string, string> = {
  MISSING_SUPERBA_COST: "Superba cost not found for product shade code",
}

/**
 * Label a block reason. Matches an exact code, or a code embedded in a longer
 * backend message (e.g. "MISSING_SUPERBA_COST: shade MC-0547"), appending the
 * original detail so the shade stays visible.
 */
export function blockReasonLabel(reason: string): string {
  if (!reason) return reason
  const exact = BLOCK_REASON_LABELS[reason.trim()]
  if (exact) return exact
  for (const [code, label] of Object.entries(BLOCK_REASON_LABELS)) {
    if (reason.includes(code)) {
      const rest = reason.replace(code, "").replace(/^[\s:\-–]+/, "").trim()
      return rest ? `${label} (${rest})` : label
    }
  }
  return reason
}
