// Legacy (user-uploaded recon §8 export) vs GoApps std-cost comparison. Pure, string-decimal based.

export interface LegacyRow {
  basis: string
  item: string
  grade: string
  shade: string
  rate: string
}
export interface GoappsRow {
  basis: string
  item: string
  grade: string
  shade: string
  rate: string
}
export type CompareClass = "MATCH" | "DIFF" | "ONLY_GOAPPS" | "ONLY_LEGACY"

export interface CompareDetail {
  basis: string
  item: string
  grade: string
  shade: string
  legacyRate: string
  goappsRate: string
  cls: CompareClass
  delta: string
  deltaPct: string
  fail: boolean
}
export interface BasisSummary {
  basis: string
  combos: number
  same: number
  diff: number
  onlyGoapps: number
  onlyLegacy: number
  fail: boolean
}
export interface CompareResult {
  details: CompareDetail[]
  summary: BasisSummary[]
  anyFail: boolean
}

export const isSpBasis = (b: string) => b.toUpperCase().startsWith("SP")

const SCALE = 5
const POW = BigInt(10) ** BigInt(SCALE)

/** Parse a decimal string into a scaled BigInt (5 dp, half away from zero). Returns null if not numeric. */
export function toScaled5(v: string): bigint | null {
  const m = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(v.trim().replace(/,/g, ""))
  if (!m || (m[2] === "" && (m[3] ?? "") === "")) return null
  const neg = m[1] === "-"
  const frac = m[3] ?? ""
  let n = BigInt(m[2] || "0") * POW + BigInt((frac + "00000").slice(0, SCALE))
  if (frac.length > SCALE && frac.charCodeAt(SCALE) >= 53) n += BigInt(1) // digit >= '5'
  return neg ? -n : n
}

export function formatScaled5(n: bigint): string {
  const neg = n < BigInt(0)
  const a = neg ? -n : n
  const s = a.toString().padStart(SCALE + 1, "0")
  return `${neg ? "-" : ""}${s.slice(0, -SCALE)}.${s.slice(-SCALE)}`
}

// Join key is (item, grade, shade) per recon §8; basis only groups the result.
const keyOf = (r: { item: string; grade: string; shade: string }) =>
  [r.item.trim(), r.grade.trim(), r.shade.trim()].join("|")

function pct(delta: bigint, base: bigint): string {
  if (base === BigInt(0)) return ""
  // display only
  return ((Number(delta) / Number(base)) * 100).toFixed(2)
}

export function compareLegacyGoapps(legacy: LegacyRow[], goapps: GoappsRow[]): CompareResult {
  const g = new Map<string, GoappsRow>()
  for (const r of goapps) g.set(keyOf(r), r)
  const seen = new Set<string>()
  const details: CompareDetail[] = []
  const mk = (
    r: { basis: string; item: string; grade: string; shade: string },
    lr: string,
    gr: string,
    cls: CompareClass,
    delta = "",
    deltaPct = "",
  ): CompareDetail => ({
    basis: r.basis.trim().toUpperCase(),
    item: r.item.trim(),
    grade: r.grade.trim(),
    shade: r.shade.trim(),
    legacyRate: lr,
    goappsRate: gr,
    cls,
    delta,
    deltaPct,
    fail: cls !== "MATCH" && isSpBasis(r.basis.trim()),
  })
  for (const l of legacy) {
    const k = keyOf(l)
    if (seen.has(k)) continue
    seen.add(k)
    const o = g.get(k)
    if (!o) {
      details.push(mk(l, l.rate, "", "ONLY_LEGACY"))
      continue
    }
    const a = toScaled5(l.rate)
    const b = toScaled5(o.rate)
    if (a !== null && b !== null && a === b) details.push(mk(l, l.rate, o.rate, "MATCH"))
    else {
      const d = a !== null && b !== null ? b - a : null
      details.push(mk(l, l.rate, o.rate, "DIFF", d === null ? "" : formatScaled5(d), d === null || a === null ? "" : pct(d, a)))
    }
  }
  for (const [k, o] of g) if (!seen.has(k)) details.push(mk(o, "", o.rate, "ONLY_GOAPPS"))

  const by = new Map<string, BasisSummary>()
  for (const d of details) {
    const s = by.get(d.basis) ?? { basis: d.basis, combos: 0, same: 0, diff: 0, onlyGoapps: 0, onlyLegacy: 0, fail: false }
    s.combos++
    if (d.cls === "MATCH") s.same++
    else if (d.cls === "DIFF") s.diff++
    else if (d.cls === "ONLY_GOAPPS") s.onlyGoapps++
    else s.onlyLegacy++
    if (d.fail) s.fail = true
    by.set(d.basis, s)
  }
  const summary = [...by.values()].sort((x, y) => x.basis.localeCompare(y.basis))
  return { details, summary, anyFail: summary.some((s) => s.fail) }
}

/** Map parsed CSV rows (header case-insensitive) to LegacyRow[]. Throws if required columns are missing. */
export function legacyRowsFromCsv(rows: string[][]): LegacyRow[] {
  if (rows.length === 0) return []
  const head = rows[0].map((h) => h.trim().toLowerCase())
  const idx = (n: string) => head.indexOf(n)
  for (const need of ["basis", "item", "rate"]) if (idx(need) < 0) throw new Error(`Missing column: ${need}`)
  const cell = (r: string[], n: string) => (idx(n) >= 0 ? (r[idx(n)] ?? "").trim() : "")
  return rows.slice(1).map((r) => ({
    basis: cell(r, "basis"),
    item: cell(r, "item"),
    grade: cell(r, "grade"),
    shade: cell(r, "shade"),
    rate: cell(r, "rate"),
  }))
}
