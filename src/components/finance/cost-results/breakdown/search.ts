// Pure client-side search helpers for the cost breakdown modal tabs.
import type { FormulaEval } from "@/types/finance/cost-calc"

/** Case-insensitive, trimmed substring match. Empty query matches everything. */
export function matchesQuery(q: string, ...haystacks: Array<string | null | undefined>): boolean {
  const needle = q.trim().toLowerCase()
  if (needle === "") return true
  return haystacks.some((h) => (h ?? "").toLowerCase().includes(needle))
}

export function filterFormulaEvals(rows: FormulaEval[], q: string): FormulaEval[] {
  if (q.trim() === "") return rows
  return rows.filter((f) =>
    matchesQuery(
      q,
      f.formulaCode,
      f.formulaName,
      f.outputParamCode,
      f.expression,
      ...Object.keys(f.inputs ?? {}),
      ...Object.values(f.inputs ?? {}),
    ),
  )
}

/** Entries are [paramCode, value] tuples; nameByCode optionally adds param names. */
export function filterParamEntries(
  entries: Array<[string, string]>,
  q: string,
  nameByCode?: Map<string, string> | Record<string, string>,
): Array<[string, string]> {
  if (q.trim() === "") return entries
  const nameOf = (code: string) =>
    nameByCode instanceof Map ? nameByCode.get(code) : nameByCode?.[code]
  return entries.filter(([code, value]) => matchesQuery(q, code, nameOf(code), value))
}
