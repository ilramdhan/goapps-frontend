"use client"

// Denier RM tab on the product-master detail page.
// Lets finance override, for THIS product only, the denier used for an RM
// (upstream product or RM group) when its DENIER-mode RM ratios are computed.
// Rows come from the product's own route seqs; ratios preview client-side with
// the same rule as costroute.ComputeSeqRMRatios (see computePreviewRatios).

import { useEffect, useMemo, useRef, useState } from "react"
import { AlertCircle, Info, Loader2, Save, Trash2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/common/empty-state"
import { useRouteByProduct, useRouteGraph } from "@/hooks/finance/use-cost-route"
import {
  useDeleteRMDenierOverride,
  useRMDenierOverrides,
  useUpsertRMDenierOverride,
} from "@/hooks/finance/use-rm-denier-override"
import { PERMISSIONS } from "@/lib/rbac/permissions"
import { cn } from "@/lib/utils"
import { usePermissionContext } from "@/providers/permission-provider"
import type { CostRouteRm, CostRouteSeq } from "@/types/finance/cost-route"
import {
  computePreviewRatios,
  parseRmOverrideKey,
  rmOverrideKeyOf,
  routeRmKeyOf,
  type DuplicateProductRef,
  type RMDenierOverride,
  type RMDenierOverrideKey,
} from "@/types/finance/rm-denier-override"

interface Props {
  productSysId: number
  /** Deep-link target row, "PRODUCT:<id>" or "GROUP:<code>". */
  highlightRm?: string
}

interface Row {
  key: string
  ident: RMDenierOverrideKey
  label: string
  sublabel: string
  rm: CostRouteRm
  seq: CostRouteSeq
}

interface Draft {
  denier: string
  reason: string
}

type PendingAction =
  | { kind: "save"; ident: RMDenierOverrideKey; denier: number; reason: string }
  | { kind: "delete"; ident: RMDenierOverrideKey }

const fmtRatio = (v: number | undefined) =>
  v === undefined || !Number.isFinite(v) ? "—" : `${(v * 100).toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`
const fmtNum = (v: number | undefined) =>
  v === undefined || !Number.isFinite(v) || v <= 0 ? "—" : v.toLocaleString("id-ID", { maximumFractionDigits: 4 })

function rmLabel(rm: CostRouteRm): { label: string; sublabel: string } {
  if (rm.rmType === "PRODUCT") {
    return { label: rm.rmProductCode || `#${rm.rmProductSysId ?? 0}`, sublabel: rm.rmProductName || rm.routeRmName || "" }
  }
  return { label: rm.rmGroupCode ?? "", sublabel: rm.rmGroupName || rm.routeRmName || "" }
}

function overrideLabel(o: RMDenierOverride): { label: string; sublabel: string } {
  return o.rmType === "PRODUCT"
    ? { label: o.rmProductCode || `#${o.rmProductSysId}`, sublabel: o.rmProductName }
    : { label: o.rmGroupCode, sublabel: o.rmGroupName }
}

/** Denier-capable (PRODUCT/GROUP) RM lines of the product's own seqs, deduped by RM identity, grouped by level. */
export function buildOverrideRows(seqs: CostRouteSeq[], productSysId: number): Map<number, Row[]> {
  const seen = new Set<string>()
  const byLevel = new Map<number, Row[]>()
  const own = seqs
    .filter((s) => s.productSysId === productSysId && !s.originHeadId)
    .sort((a, b) => a.routeLevel - b.routeLevel || a.routeSeq - b.routeSeq)
  for (const seq of own) {
    for (const rm of seq.rms) {
      if (rm.originHeadId) continue
      const key = routeRmKeyOf(rm)
      if (!key || seen.has(key)) continue
      seen.add(key)
      const ident = parseRmOverrideKey(key) as RMDenierOverrideKey
      const row: Row = { key, ident, rm, seq, ...rmLabel(rm) }
      const list = byLevel.get(seq.routeLevel) ?? []
      list.push(row)
      byLevel.set(seq.routeLevel, list)
    }
  }
  return byLevel
}

function parseDenier(s: string): number | null {
  const v = Number(s.replace(",", "."))
  return s.trim() !== "" && Number.isFinite(v) && v > 0 ? v : null
}

export function RmDenierOverrideTab({ productSysId, highlightRm }: Props) {
  const { hasPermission } = usePermissionContext()
  const canEdit = hasPermission(PERMISSIONS.ProductRoutes.routeCreate)

  const { data: head, isLoading: headLoading } = useRouteByProduct(productSysId)
  const { data: graph, isLoading: graphLoading } = useRouteGraph(head?.headId)
  const { data: overrideList, isLoading: ovLoading } = useRMDenierOverrides(productSysId)
  const upsertM = useUpsertRMDenierOverride()
  const deleteM = useDeleteRMDenierOverride()

  const overrides = useMemo(() => overrideList?.items ?? [], [overrideList])
  const duplicates: DuplicateProductRef[] = overrideList?.duplicateProducts ?? []
  const savedByKey = useMemo(() => new Map(overrides.map((o) => [rmOverrideKeyOf(o), o])), [overrides])

  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [pending, setPending] = useState<PendingAction | null>(null)

  const rowsByLevel = useMemo(
    () => buildOverrideRows(graph?.seqs ?? [], productSysId),
    [graph, productSysId],
  )
  const rowKeys = useMemo(() => {
    const s = new Set<string>()
    rowsByLevel.forEach((rows) => rows.forEach((r) => s.add(r.key)))
    return s
  }, [rowsByLevel])
  const unused = overrides.filter((o) => !rowKeys.has(rmOverrideKeyOf(o)))

  const mode =
    graph?.head.rmRatioMode ??
    graph?.seqs.find((s) => s.productSysId === productSysId)?.rmRatioMode ??
    head?.rmRatioMode
  const isDenierMode = mode === "DENIER"

  const draftOf = (key: string): Draft => {
    const d = drafts[key]
    if (d) return d
    const saved = savedByKey.get(key)
    return { denier: saved ? String(saved.denier) : "", reason: saved?.reason ?? "" }
  }
  const setDraft = (key: string, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [key]: { ...draftOf(key), ...patch } }))

  // Effective overrides for preview: saved values, replaced by any valid draft.
  const effectiveOverrides = useMemo(() => {
    const m = new Map<string, number>()
    savedByKey.forEach((o, k) => m.set(k, o.denier))
    for (const [k, d] of Object.entries(drafts)) {
      const v = parseDenier(d.denier)
      if (v !== null) m.set(k, v)
      else if (d.denier.trim() === "") m.delete(k)
    }
    return m
  }, [savedByKey, drafts])

  const previewBySeq = useMemo(() => {
    const out = new Map<string, Map<string, number>>()
    rowsByLevel.forEach((rows) =>
      rows.forEach((r) => {
        if (!out.has(r.seq.uid)) out.set(r.seq.uid, computePreviewRatios(r.seq, effectiveOverrides))
      }),
    )
    return out
  }, [rowsByLevel, effectiveOverrides])

  // Deep link: scroll the highlighted row into view once rows are rendered.
  const highlightKey = useMemo(() => {
    const k = parseRmOverrideKey(highlightRm)
    return k ? rmOverrideKeyOf(k) : null
  }, [highlightRm])
  const highlightRef = useRef<HTMLTableRowElement | null>(null)
  const hasRows = rowKeys.size > 0
  useEffect(() => {
    if (hasRows) highlightRef.current?.scrollIntoView?.({ block: "center", behavior: "smooth" })
  }, [hasRows])

  async function execute(action: PendingAction, applyToDuplicates: boolean) {
    const key = rmOverrideKeyOf(action.ident)
    try {
      if (action.kind === "save") {
        await upsertM.mutateAsync({
          productSysId,
          ...action.ident,
          denier: action.denier,
          reason: action.reason,
          applyToDuplicates,
        })
      } else {
        await deleteM.mutateAsync({ productSysId, ...action.ident, applyToDuplicates })
      }
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    } catch {
      /* toast in hook */
    }
  }

  function request(action: PendingAction) {
    if (duplicates.length > 0) setPending(action)
    else void execute(action, false)
  }

  function requestSave(row: { key: string; ident: RMDenierOverrideKey }) {
    const d = draftOf(row.key)
    const denier = parseDenier(d.denier)
    if (denier === null || !d.reason.trim()) return
    request({ kind: "save", ident: row.ident, denier, reason: d.reason.trim() })
  }

  // Three-way choice: "Ya" → apply to copies, "Tidak" → parent only,
  // "Batal" / Escape → abort. Buttons capture `pending` before close clears it.
  function decide(applyToDuplicates: boolean) {
    const action = pending
    setPending(null)
    if (action) void execute(action, applyToDuplicates)
  }

  const busy = upsertM.isPending || deleteM.isPending

  if (headLoading || graphLoading || ovLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Memuat denier RM…
      </div>
    )
  }

  if (!head) {
    return (
      <EmptyState
        title="Belum ada routing"
        description="Product ini belum punya cost route, jadi belum ada RM yang bisa di-override denier-nya."
      />
    )
  }

  const levels = [...rowsByLevel.keys()].sort((a, b) => a - b)

  return (
    <div className="space-y-4">
      {!isDenierMode && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Mode rasio INPUT: override tidak berlaku</AlertTitle>
          <AlertDescription>
            Rasio RM product ini diisi manual (mode INPUT). Override denier tetap tersimpan, tetapi baru dipakai bila
            mode rasio product type diubah ke DENIER.
          </AlertDescription>
        </Alert>
      )}

      {duplicates.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Product salinan: {duplicates.map((d) => d.productCode).join(", ")}
        </p>
      )}

      {levels.length === 0 ? (
        <EmptyState
          title="Tidak ada RM yang bisa di-override"
          description="Routing product ini tidak memiliki RM bertipe PRODUCT atau GROUP. RM bertipe ITEM tidak dapat di-override."
        />
      ) : (
        levels.map((level) => (
          <Card key={level}>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-semibold">Level {level}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">RM</th>
                    <th className="py-2 pr-3 font-medium">Tipe</th>
                    <th className="py-2 pr-3 font-medium text-right">Denier normal</th>
                    <th className="py-2 pr-3 font-medium text-right">Rasio saat ini</th>
                    <th className="py-2 pr-3 font-medium">Override denier</th>
                    <th className="py-2 pr-3 font-medium">Alasan</th>
                    <th className="py-2 pr-3 font-medium text-right">Rasio baru</th>
                    <th className="py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {(rowsByLevel.get(level) ?? []).map((row) => {
                    const saved = savedByKey.get(row.key)
                    const d = draftOf(row.key)
                    const denierVal = parseDenier(d.denier)
                    const dirty =
                      !!drafts[row.key] &&
                      (d.denier !== (saved ? String(saved.denier) : "") || d.reason !== (saved?.reason ?? ""))
                    const invalidDenier = d.denier.trim() !== "" && denierVal === null
                    const canSave = canEdit && dirty && denierVal !== null && !!d.reason.trim() && !busy
                    const preview = previewBySeq.get(row.seq.uid)?.get(row.rm.uid)
                    const normalDenier = row.rm.denierOverridden ? undefined : row.rm.denier
                    const highlighted = highlightKey === row.key
                    return (
                      <tr
                        key={row.key}
                        ref={highlighted ? highlightRef : undefined}
                        data-testid={`denier-row-${row.key}`}
                        className={cn("border-b align-top last:border-0", highlighted && "bg-primary/5 ring-2 ring-primary/40")}
                      >
                        <td className="py-2 pr-3">
                          <div className="font-mono text-xs">{row.label}</div>
                          {row.sublabel && <div className="text-xs text-muted-foreground">{row.sublabel}</div>}
                          {saved && (
                            <Badge variant="outline" className="mt-1 text-[10px]">
                              OVERRIDE
                            </Badge>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-xs">{row.rm.rmType}</td>
                        <td className="py-2 pr-3 text-right tabular-nums" title={row.rm.denierOverridden ? "Sedang memakai override" : undefined}>
                          {fmtNum(normalDenier)}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">{fmtRatio(row.rm.computedRatio)}</td>
                        <td className="py-2 pr-3">
                          <Input
                            aria-label={`Override denier ${row.label}`}
                            inputMode="decimal"
                            className={cn("h-8 w-28", invalidDenier && "border-destructive")}
                            value={d.denier}
                            disabled={!canEdit}
                            placeholder="—"
                            onChange={(e) => setDraft(row.key, { denier: e.target.value })}
                          />
                          {invalidDenier && <p className="mt-1 text-xs text-destructive">Harus angka &gt; 0</p>}
                        </td>
                        <td className="py-2 pr-3">
                          <Input
                            aria-label={`Alasan override ${row.label}`}
                            className="h-8 min-w-48"
                            value={d.reason}
                            disabled={!canEdit}
                            placeholder={canEdit ? "Wajib diisi" : ""}
                            onChange={(e) => setDraft(row.key, { reason: e.target.value })}
                          />
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          {isDenierMode ? fmtRatio(preview) : "—"}
                        </td>
                        <td className="py-2">
                          {canEdit && (
                            <div className="flex flex-wrap items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!canSave}
                                onClick={() => requestSave(row)}
                                aria-label={`Simpan override ${row.label}`}
                              >
                                <Save className="mr-1 h-3.5 w-3.5" /> Simpan
                              </Button>
                              {saved && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={busy}
                                  onClick={() => request({ kind: "delete", ident: row.ident })}
                                  aria-label={`Hapus override ${row.label}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))
      )}

      {unused.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              Override tidak dipakai
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              RM berikut tidak ada lagi di routing product ini, sehingga override-nya diabaikan saat kalkulasi.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {unused.map((o) => {
              const { label, sublabel } = overrideLabel(o)
              const ident: RMDenierOverrideKey = {
                rmType: o.rmType,
                rmProductSysId: o.rmProductSysId,
                rmGroupCode: o.rmGroupCode,
              }
              return (
                <div
                  key={o.id || rmOverrideKeyOf(o)}
                  data-testid={`denier-unused-${rmOverrideKeyOf(o)}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <span className="font-mono text-xs">{label}</span>
                    {sublabel && <span className="ml-2 text-xs text-muted-foreground">{sublabel}</span>}
                    <Badge variant="secondary" className="ml-2 text-[10px]">
                      tidak dipakai
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      {o.rmType} · denier {fmtNum(o.denier)} · {o.reason}
                    </div>
                  </div>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => request({ kind: "delete", ident })}
                      aria-label={`Hapus override ${label}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terapkan override yang sama ke product salinan?</AlertDialogTitle>
            <AlertDialogDescription>
              Product ini punya salinan: {duplicates.map((d) => d.productCode).join(", ")}.{" "}
              {pending?.kind === "delete" ? "Hapus" : "Simpan"} override juga di product salinan tersebut?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-wrap gap-2">
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <Button variant="outline" onClick={() => decide(false)}>
              Tidak, hanya product ini
            </Button>
            <AlertDialogAction onClick={() => decide(true)}>Ya, terapkan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
