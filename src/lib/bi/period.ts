// FE period label formatting. Backend is authoritative for query windows
// (chartdata/period.go); preset → date range resolution lives only there.

/** Format a YYYYMM / date string into a human label per grain. */
export function periodLabel(raw: string, grain: string): string {
  // ISO week label, e.g. "2026-W42" (backend format) — pass through.
  if (/^\d{4}-W\d{2}$/.test(raw)) return raw
  if (grain === "WEEKLY") return isoWeekLabel(raw) ?? raw
  // raw may be "202604" (monthly), "2026-04-15" (daily), "2026-Q2", "2026".
  if (/^\d{6}$/.test(raw)) {
    const year = raw.slice(0, 4)
    const month = parseInt(raw.slice(4, 6), 10)
    return `${MONTHS[month - 1] ?? "?"} ${year}`
  }
  if (grain === "QUARTERLY" || /Q/.test(raw)) return raw
  if (grain === "YEARLY") return raw
  return raw
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** "2026-10-15" → "2026-W42" (ISO 8601 week; year is the ISO week-year). */
function isoWeekLabel(raw: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw)
  if (!m) return null
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day) // Thursday of this week
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`
}
