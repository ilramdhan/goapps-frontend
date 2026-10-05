"use client"

import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import * as api from "@/services/finance/erp-integration-api"
import { parseCsv, toCsv } from "@/lib/csv"
import {
  compareLegacyGoapps,
  legacyRowsFromCsv,
  type CompareClass,
  type CompareResult,
  type GoappsRow,
} from "@/lib/finance/erp-legacy-compare"

const PAGE_SIZE = 1000
const MAX_PAGES = 200

async function fetchAllStd(batchId: number): Promise<GoappsRow[]> {
  const out: GoappsRow[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await api.listStdCost(batchId, { page, pageSize: PAGE_SIZE })
    for (const r of res.items) out.push({ basis: r.basis, item: r.erpItemCode, grade: r.gradeCode ?? "", shade: r.shadeCode ?? "", rate: r.stdCost })
    if (page >= (res.pagination.totalPages || 1) || res.items.length === 0) break
  }
  return out
}

const readText = (f: File): Promise<string> =>
  typeof f.text === "function"
    ? f.text()
    : new Promise((resolve, reject) => {
        const fr = new FileReader()
        fr.onload = () => resolve(String(fr.result ?? ""))
        fr.onerror = () => reject(fr.error)
        fr.readAsText(f)
      })

export function LegacyComparePanel({ batchId }: { batchId: number }) {
  const [result, setResult] = useState<CompareResult | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [cls, setCls] = useState<"" | CompareClass>("")

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError("")
    try {
      const legacy = legacyRowsFromCsv(parseCsv(await readText(file)))
      const goapps = await fetchAllStd(batchId)
      setResult(compareLegacyGoapps(legacy, goapps))
    } catch (e) {
      setResult(null)
      setError(e instanceof Error ? e.message : "Compare failed")
    } finally {
      setBusy(false)
    }
  }

  const details = useMemo(() => (result?.details ?? []).filter((d) => !cls || d.cls === cls), [result, cls])

  const download = () => {
    if (!result) return
    const csv = toCsv([
      ["basis", "item", "grade", "shade", "legacy_rate", "goapps_rate", "class", "delta", "delta_pct", "fail"],
      ...result.details.map((d) => [d.basis, d.item, d.grade, d.shade, d.legacyRate, d.goappsRate, d.cls, d.delta, d.deltaPct, d.fail ? "FAIL" : ""]),
    ])
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    const a = document.createElement("a")
    a.href = url
    a.download = `erp_legacy_compare_${batchId}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="text-sm font-medium">Legacy vs GoApps comparison</div>
      <p className="text-xs text-muted-foreground">
        Legacy file = your read-only export of recon §8; nothing is read from PROD by the app. CSV columns:
        basis,item,grade,shade,rate_variants,rate,qty_kg,val. SP* bases must match at 5 dp.
      </p>
      <input
        type="file"
        accept=".csv,text/csv"
        aria-label="Legacy CSV"
        disabled={busy}
        onChange={(e) => void onFile(e.target.files?.[0])}
        className="text-xs"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {result && (
        <>
          {result.anyFail && <p className="text-sm font-medium text-destructive">FAIL: SP* bases differ from legacy.</p>}
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left">
                <th>Basis</th><th>Combos</th><th>Same</th><th>Diff</th><th>Only GoApps</th><th>Only legacy</th><th>Result</th>
              </tr>
            </thead>
            <tbody>
              {result.summary.map((s) => (
                <tr key={s.basis} className={s.fail ? "text-destructive" : ""}>
                  <td>{s.basis}</td><td>{s.combos}</td><td>{s.same}</td><td>{s.diff}</td><td>{s.onlyGoapps}</td><td>{s.onlyLegacy}</td>
                  <td>{s.fail ? "FAIL" : "ok"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center gap-2">
            <select aria-label="Class filter" className="rounded border bg-background px-2 py-1 text-xs" value={cls} onChange={(e) => setCls(e.target.value as "" | CompareClass)}>
              <option value="">All classes</option>
              <option value="MATCH">MATCH</option>
              <option value="DIFF">DIFF</option>
              <option value="ONLY_GOAPPS">ONLY_GOAPPS</option>
              <option value="ONLY_LEGACY">ONLY_LEGACY</option>
            </select>
            <Button size="sm" variant="outline" onClick={download}>Download comparison CSV</Button>
          </div>
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left"><th>Basis</th><th>Item</th><th>Grade</th><th>Shade</th><th>Legacy</th><th>GoApps</th><th>Class</th><th>Δ</th><th>Δ%</th></tr>
              </thead>
              <tbody>
                {details.map((d, i) => (
                  <tr key={i} className={d.fail ? "bg-destructive/10 text-destructive" : ""}>
                    <td>{d.basis}</td><td>{d.item}</td><td>{d.grade}</td><td>{d.shade}</td>
                    <td className="font-mono">{d.legacyRate}</td><td className="font-mono">{d.goappsRate}</td>
                    <td>{d.cls}</td><td className="font-mono">{d.delta}</td><td className="font-mono">{d.deltaPct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
