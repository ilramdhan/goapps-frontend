"use client"

// Extracted verbatim from cost-breakdown-modal.tsx (P11 [G.6]).
// Pure extraction — the props signature is unchanged.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserName } from "@/components/common/user-name"
import { useProductRequiredParams } from "@/hooks/finance/use-cost-product-parameter"
import type { CostBreakdown } from "@/types/finance/cost-calc"

import { formatDate, formatNumeric } from "../format"
import { Field } from "./field"

// ── Summary tab ───────────────────────────────────────────────────────────────

export function SummaryTab({ breakdown, productSysId }: { breakdown: CostBreakdown; productSysId: number }) {
  const s = breakdown.summary
  const snapshotEntries = Object.entries(breakdown.paramSnapshot)

  // Fetch parameter definitions for this product (already sorted by display_group,
  // capp_display_order, param_code from the backend query).
  const { data: requiredParams = [] } = useProductRequiredParams(productSysId)

  // Walk requiredParams in backend order (sorted by display_order, param_code).
  // Params in the snapshot but NOT in requiredParams go at the end ungrouped.
  const snapshotMap = new Map(snapshotEntries)
  const seenCodes = new Set<string>()
  const orderedEntries: Array<{ code: string; value: string; group: string; order: number }> = []

  for (const p of requiredParams) {
    const value = snapshotMap.get(p.paramCode)
    if (value !== undefined) {
      orderedEntries.push({ code: p.paramCode, value, group: p.displayGroup, order: p.displayOrder })
      seenCodes.add(p.paramCode)
    }
  }
  // Remaining snapshot entries not covered by requiredParams — ungrouped at end
  for (const [k, v] of snapshotEntries) {
    if (!seenCodes.has(k)) {
      orderedEntries.push({ code: k, value: v, group: "", order: 9999 })
    }
  }

  // Group while collecting the minimum display_order seen per group.
  // This lets us sort groups by their first-appearing param's order (not alphabetically).
  const groupMinOrder: Record<string, number> = {}
  const grouped: Record<string, Array<[string, string]>> = {}
  for (const { code, value, group, order } of orderedEntries) {
    if (!grouped[group]) {
      grouped[group] = []
      groupMinOrder[group] = order
    } else {
      groupMinOrder[group] = Math.min(groupMinOrder[group], order)
    }
    grouped[group].push([code, value])
  }
  // Sort groups by their minimum display_order: named groups first (by order), ungrouped last
  const groupEntries = Object.keys(grouped)
    .sort((a, b) => {
      if (!a && !b) return 0
      if (!a) return 1   // ungrouped after all named groups
      if (!b) return -1
      return (groupMinOrder[a] ?? 9999) - (groupMinOrder[b] ?? 9999)
    })
    .map((g) => [g, grouped[g]] as [string, [string, string][]])
  const namedGroupCount = groupEntries.filter(([g]) => g !== "").length

  return (
    <div className="space-y-5">
      {s && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm md:grid-cols-4">
          <Field label="Cost per unit">
            <span className="text-xl font-semibold tabular-nums">
              {s.currencyCode ? `${s.currencyCode} ` : ""}
              {formatNumeric(s.costPerUnit)}
            </span>
          </Field>
          <Field label="Total RM cost">
            <span className="font-mono tabular-nums">{formatNumeric(s.totalRmCost)}</span>
          </Field>
          <Field label="Conversion">
            <span className="font-mono tabular-nums">{formatNumeric(s.totalConversion)}</span>
          </Field>
          <Field label="Total cost">
            <span className="font-mono font-semibold tabular-nums">{formatNumeric(s.totalCost)}</span>
          </Field>
          <Field label="Calculated">
            <span className="text-muted-foreground">{formatDate(s.calculatedAt)}</span>
          </Field>
          <Field label="By">
            {s.calculatedBy
              ? <UserName userId={s.calculatedBy} compact className="text-muted-foreground" />
              : <span className="text-muted-foreground">—</span>}
          </Field>
          {s.verifiedAt && (
            <Field label="Verified">
              <span className="text-muted-foreground">{formatDate(s.verifiedAt)}</span>
            </Field>
          )}
          {s.verifiedBy && (
            <Field label="Verified by">
              <UserName userId={s.verifiedBy} compact className="text-muted-foreground" />
            </Field>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            Parameter snapshot
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {snapshotEntries.length} params
              {namedGroupCount > 0 ? ` · ${namedGroupCount} groups` : ""}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {snapshotEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No parameters captured.</p>
          ) : (
            groupEntries.map(([groupName, entries], idx) => (
              <div key={groupName || "__ungrouped__"} className={idx > 0 ? "mt-5" : ""}>
                {groupName !== "" && (
                  <div className="mb-2 flex items-center gap-2 border-b pb-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                      {groupName}
                    </span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {entries.length}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                  {entries.map(([k, v]) => (
                    <div
                      key={k}
                      className="flex items-baseline justify-between gap-3 border-b py-1.5 last:border-0"
                    >
                      <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">{k}</span>
                      <span className="shrink-0 font-mono text-xs tabular-nums">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
