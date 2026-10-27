// Employee Overtime table (table_mode=employee_ot, HD-18): helpers over the "employee_ot" block the
// backend adds to the response config (group options, subtotals, truncated flag, column ranges).

import type { ChartDataResponse, PeriodPreset } from "@/types/bi"

export const EMPLOYEE_OT_MODE = "employee_ot"

/** Presets the backend accepts for employee_ot (payroll periods only; week/day presets are rejected). */
export const EMPLOYEE_OT_PRESETS: PeriodPreset[] = ["THIS_MONTH", "LAST_MONTH", "THIS_QTR", "THIS_YEAR", "L12M"]

export interface EmployeeOTSubtotal {
  group: string
  employees: number
  PERIOD_HOURS: number
  EXCESS: number
  /** Sum of limit hours per week column, keyed by the week key "W:YYYY-MM-DD" (HD-25). */
  weekSums: Record<string, number>
  /** Average period hours per employee, 1 decimal (HD-24). */
  avg_period_hours: number
  /** Share of employees with EXCESS > 0, percent, 1 decimal (HD-24). */
  over_pct: number
}

/** Previous-window comparison of the KPI strip (HD-24). Deltas are null when there is nothing to compare. */
export interface EmployeeOTPrev {
  totalPeriodHours: number
  employees: number
  hoursDeltaPct: number | null
  employeesDeltaPct: number | null
}

export interface EmployeeOTSummary {
  employees: number
  totalPeriodHours: number
  overLimit: number
  chronic: number
  /** Absent/null when no listed employee has hours in the previous window. */
  prev?: EmployeeOTPrev | null
}

/** One week column of the R1 window (HD-25). `key` is the series name; labels W1..Wn repeat per payroll period. */
export interface EmployeeOTWeek {
  key: string
  label: string
  period: string
  from: string
  to: string
  /** The week is still running (its Sunday is after today), so its hours are incomplete. */
  partial: boolean
}

/** Weekly OT limit in hours; a week cell above it is flagged (HD-25). */
export const WEEK_LIMIT_HOURS = 14

/** Tooltip of a week column header (HD-25). */
export const WEEK_HEADER_TOOLTIP = "Jam hitung batas: jam OT yang dihitung ke batas 14 jam per minggu (Senin–Minggu)."

const WEEK_PREFIX = "W:"

export interface EmployeeOTRanges {
  periodFrom: string
  periodTo: string
  lastPeriodFrom: string
  dayFrom: string
  weekFrom: string
  weekTo: string
  weekLabel: string
  prevFrom?: string
  prevTo?: string
}

export interface EmployeeOTBlock {
  groupBy: string
  groupOptions: string[]
  truncated: boolean
  /** Week columns were cut to the latest N of M weeks of the window (HD-26, H053). */
  weeksTruncated: boolean
  weeksTotal: number
  maxRows: number
  subtotals: EmployeeOTSubtotal[]
  summary?: EmployeeOTSummary
  weeks: EmployeeOTWeek[]
  ranges?: EmployeeOTRanges
}

export const GROUP_BY_LABELS: Record<string, string> = {
  DIVISION: "Divisi",
  DEPT: "Dept",
  COMPANY: "Company",
}

const str = (v: unknown) => (typeof v === "string" ? v : "")
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0)
const numOrNull = (v: unknown) => (typeof v === "number" ? v : null)

/** Change from prev to cur in percent, 1 decimal; null when prev <= 0 (shown as "–", never 0% or ∞). */
export function pctDelta(cur: number, prev: number): number | null {
  return prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : null
}

/** "▲ 12,5%" / "▼ 3,0%" / "0,0%" for a delta; "–" when null (nothing to compare). */
export function fmtDelta(d: number | null | undefined): string {
  if (d === null || d === undefined) return "–"
  const abs = Math.abs(d).toFixed(1).replace(".", ",")
  return d > 0 ? `▲ ${abs}%` : d < 0 ? `▼ ${abs}%` : `${abs}%`
}

function readPrev(raw: unknown): EmployeeOTPrev | null {
  if (!raw || typeof raw !== "object") return null
  const p = raw as Record<string, unknown>
  return {
    totalPeriodHours: num(p.total_period_hours),
    employees: num(p.employees),
    hoursDeltaPct: numOrNull(p.hours_delta_pct),
    employeesDeltaPct: numOrNull(p.employees_delta_pct),
  }
}

function readWeeks(raw: unknown): EmployeeOTWeek[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((w: Record<string, unknown>) => ({
      key: str(w.key), label: str(w.label), period: str(w.period), from: str(w.from), to: str(w.to), partial: w.partial === true,
    }))
    .filter((w) => w.key !== "")
}

function weekSumsOf(src: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(src)) if (k.startsWith(WEEK_PREFIX)) out[k] = num(v)
  return out
}

/** Read the employee_ot block from a response config; undefined when absent (day drill, other modes). */
export function readEmployeeOTBlock(config: Record<string, unknown> | undefined): EmployeeOTBlock | undefined {
  const raw = config?.["employee_ot"] ?? config?.["employeeOt"]
  if (!raw || typeof raw !== "object") return undefined
  const b = raw as Record<string, unknown>
  const r = b.ranges as Record<string, unknown> | undefined
  const sm = b.summary && typeof b.summary === "object" ? (b.summary as Record<string, unknown>) : undefined
  return {
    groupBy: str(b.group_by),
    groupOptions: Array.isArray(b.group_options) ? b.group_options.filter((x): x is string => typeof x === "string") : [],
    truncated: b.truncated === true,
    weeksTruncated: b.weeks_truncated === true,
    weeksTotal: num(b.weeks_total),
    maxRows: num(b.max_rows),
    subtotals: (Array.isArray(b.subtotals) ? b.subtotals : []).map((s: Record<string, unknown>) => ({
      group: str(s.group),
      employees: num(s.employees),
      PERIOD_HOURS: num(s.PERIOD_HOURS),
      EXCESS: num(s.EXCESS),
      weekSums: weekSumsOf(s),
      avg_period_hours: num(s.avg_period_hours),
      over_pct: num(s.over_pct),
    })),
    weeks: readWeeks(b.weeks),
    summary: sm
      ? {
          employees: num(sm.employees),
          totalPeriodHours: num(sm.total_period_hours),
          overLimit: num(sm.over_limit),
          chronic: num(sm.chronic),
          prev: readPrev(sm.prev),
        }
      : undefined,
    ranges: r
      ? {
          periodFrom: str(r.period_from),
          periodTo: str(r.period_to),
          lastPeriodFrom: str(r.last_period_from),
          dayFrom: str(r.day_from),
          weekFrom: str(r.week_from),
          weekTo: str(r.week_to),
          weekLabel: str(r.week_label),
          prevFrom: str(r.prev_from),
          prevTo: str(r.prev_to),
        }
      : undefined,
  }
}

/** Round half-up to 1 decimal, same as the backend (math.Round on non-negative values). */
const round1 = (v: number) => Math.round(v * 10) / 10

/** Row shape localSubtotals needs: point values plus the group carried by the adapter. */
type OTRow = Record<string, unknown>

/** Subtotals per group over the given rows, first-seen order. Used when rows are filtered client-side. */
export function localSubtotals(rows: OTRow[]): EmployeeOTSubtotal[] {
  const n = (r: OTRow, k: string) => (typeof r[k] === "number" ? (r[k] as number) : 0)
  const by = new Map<string, EmployeeOTSubtotal & { over: number }>()
  for (const r of rows) {
    const g = String(r.__group ?? "")
    const s = by.get(g) ?? {
      group: g, employees: 0, PERIOD_HOURS: 0, EXCESS: 0, weekSums: {}, avg_period_hours: 0, over_pct: 0, over: 0,
    }
    s.employees++
    s.PERIOD_HOURS += n(r, "PERIOD_HOURS")
    for (const k of Object.keys(r)) if (k.startsWith(WEEK_PREFIX)) s.weekSums[k] = (s.weekSums[k] ?? 0) + n(r, k)
    s.EXCESS += n(r, "EXCESS")
    if (n(r, "EXCESS") > 0) s.over++
    by.set(g, s)
  }
  return [...by.values()].map(({ over, ...s }) => ({
    ...s,
    avg_period_hours: round1(s.PERIOD_HOURS / s.employees),
    over_pct: round1((over / s.employees) * 100),
  }))
}

/** Summary over the given rows, same definitions as the backend (HD-24): over-limit = EXCESS > 0,
 *  chronic = CHRONIC > 0, both counted per person. Used when rows are filtered client-side. */
export function localSummary(rows: OTRow[]): EmployeeOTSummary {
  const n = (r: OTRow, k: string) => (typeof r[k] === "number" ? (r[k] as number) : 0)
  return {
    employees: rows.length,
    totalPeriodHours: round1(rows.reduce((a, r) => a + n(r, "PERIOD_HOURS"), 0)),
    overLimit: rows.filter((r) => n(r, "EXCESS") > 0).length,
    chronic: rows.filter((r) => n(r, "CHRONIC") > 0).length,
    // The previous-window total covers all employees of the window, which the filtered rows cannot
    // give, so a client-side filter shows "–" instead of a misleading delta (HD-24).
    prev: null,
  }
}

/** Distinct group values in the table rows (point meta.group), sorted. Source of the group filter (HD-18). */
export function employeeOTGroupValues(data: ChartDataResponse | undefined): string[] {
  const seen = new Set<string>()
  for (const p of data?.series?.[0]?.points ?? []) {
    const g = p.meta?.["group"]
    if (typeof g === "string") seen.add(g)
  }
  return [...seen].sort()
}

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

/** "2026-09-26" → "26 Sep 2026". Unparseable input is returned as-is. */
export function fmtDay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  return `${Number(m[3])} ${MONTHS_ID[Number(m[2]) - 1] ?? ""} ${m[1]}`
}

export interface HiddenOverWeek {
  from: string
  hours: number
}

/** Over-limit weeks that have no column, from the row meta (`__hidden_over`, newest first; H053). */
export function readHiddenOver(row: Record<string, unknown>): { items: HiddenOverWeek[]; count: number } {
  const raw = row.__hidden_over
  const items = (Array.isArray(raw) ? raw : []).map((w: Record<string, unknown>) => ({ from: str(w.from), hours: num(w.hours) }))
  const count = typeof row.__hidden_over_count === "number" ? row.__hidden_over_count : items.length
  return { items, count }
}

/** "20 Jul (24,6 jam)" list text for the Kelebihan cell tooltip; "" when nothing is hidden. */
export function fmtHiddenOver(row: Record<string, unknown>, fmtHours: (v: number) => string): string {
  const { items, count } = readHiddenOver(row)
  if (items.length === 0) return ""
  const list = items.map((w) => `${fmtDay(w.from).replace(/ \d{4}$/, "")} (${fmtHours(w.hours)} jam)`).join(", ")
  const more = count > items.length ? `, +${count - items.length} lainnya` : ""
  return `Over di luar kolom: ${list}${more}`
}

/** Compact lines for the Kelebihan cell: "20 Jul · 24,6 j", at most `max`, plus how many more remain (H053). */
export function hiddenOverLines(row: Record<string, unknown>, fmtHours: (v: number) => string, max = 2): { lines: string[]; more: number } {
  const { items, count } = readHiddenOver(row)
  const lines = items.slice(0, max).map((w) => `${fmtDay(w.from).replace(/ \d{4}$/, "")} · ${fmtHours(w.hours)} j`)
  return { lines, more: Math.max(0, count - lines.length) }
}

/** "26 Sep 2026 – 25 Okt 2026"; empty when either end is missing. */
export function fmtRange(from: string, to: string): string {
  return from && to ? `${fmtDay(from)} – ${fmtDay(to)}` : ""
}

/** Payroll period label (YYYYMM, window 26..25, K3/HD-06) a date belongs to; "" when not a date. */
export function payrollLabelOf(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return ""
  const idx = Number(m[1]) * 12 + Number(m[2]) - 1 + (Number(m[3]) > 25 ? 1 : 0)
  return `${Math.floor(idx / 12)}${String((idx % 12) + 1).padStart(2, "0")}`
}

/** Up to `count` payroll periods (YYYYMM) before the one `periodFrom` falls in, newest first. */
export function comparePeriodOptions(periodFrom: string, count = 12): string[] {
  const cur = payrollLabelOf(periodFrom)
  if (!cur) return []
  const base = Number(cur.slice(0, 4)) * 12 + Number(cur.slice(4)) - 1
  return Array.from({ length: count }, (_, i) => {
    const idx = base - 1 - i
    return `${Math.floor(idx / 12)}${String((idx % 12) + 1).padStart(2, "0")}`
  })
}

/** "Okt 2026" for a YYYYMM label. */
export function fmtPayrollLabel(p: string): string {
  return /^\d{6}$/.test(p) ? `${MONTHS_ID[Number(p.slice(4)) - 1] ?? ""} ${p.slice(0, 4)}` : p
}

/** Consecutive weeks over the limit from which a row counts as chronic (HD-18, H047). Single source for the table. */
export const CHRONIC_WEEKS_THRESHOLD = 2

export type OTLevel = "none" | "over" | "chronic"

/** Warning level of a row: chronic wins over a plain excess; no excess and no chronic run is "none". */
export function otLevel(excess: number, chronic: number): OTLevel {
  if (chronic >= CHRONIC_WEEKS_THRESHOLD) return "chronic"
  return excess > 0 ? "over" : "none"
}

/** Bar width in percent (0–100, 1 decimal) relative to the largest displayed row, not the total. */
export function barPercent(value: number, max: number): number {
  if (!(max > 0) || !(value > 0)) return 0
  return Math.min(100, round1((value / max) * 100))
}
