// Shared formatting helpers for cost-results UI.

// Friendly calculation-type labels — shared by the list table, the detail page
// and its breadcrumb so the wording never drifts between them.
export const CALC_TYPE_LABELS: Record<string, string> = {
  ACTUAL: "Actual (Valuation Rate)",
  FORECAST: "Forecast (Marketing Rate)",
  SELLING: "Selling (Simulation Rate)",
}

export function calcTypeLabel(calcType: string): string {
  return CALC_TYPE_LABELS[calcType] ?? calcType
}

export function formatNumeric(s: string | number | null | undefined): string {
  if (s == null || s === "") return "—"
  const n = typeof s === "number" ? s : Number(s)
  if (!Number.isFinite(n)) return String(s)
  return n.toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })
}

export function formatDate(s: string | null | undefined): string {
  if (!s) return "—"
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleString()
}
