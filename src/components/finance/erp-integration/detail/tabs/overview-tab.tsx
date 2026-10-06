"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useExportErpManualSample } from "@/hooks/finance/use-erp-integration"
import { usePermission } from "@/lib/hooks/use-permission"
import type { ErpBatch } from "@/types/finance/erp-integration"

import { ErpCurrencySanityCard } from "../erp-currency-sanity-card"

function parseSummary(json: string): Record<string, unknown> {
  try {
    const v = JSON.parse(json || "{}")
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export function OverviewTab({ batch }: { batch: ErpBatch }) {
  const { hasPermission } = usePermission()
  const exportSample = useExportErpManualSample()
  const entries = Object.entries(parseSummary(batch.summaryJson))
  return (
    <div className="space-y-4">
      {batch.failedReason && <p className="text-sm text-destructive">Failed: {batch.failedReason}</p>}
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No summary yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {entries.map(([k, v]) => (
            <Card key={k} className="p-3">
              <div className="text-xs text-muted-foreground">{k}</div>
              <div className="break-all font-mono text-sm">{typeof v === "object" ? JSON.stringify(v) : String(v)}</div>
            </Card>
          ))}
        </div>
      )}
      {hasPermission("finance.cost.erpintegration.export") && (
        <div className="space-y-1">
          <Button size="sm" variant="outline" disabled={exportSample.isPending} onClick={() => exportSample.mutate(batch.batchId)}>
            Export manual sample (xlsx)
          </Button>
          <p className="text-xs text-muted-foreground">≥30 stratified combos for Finance&apos;s hand calculation; pass = 5-dp match</p>
        </div>
      )}
      <ErpCurrencySanityCard period={batch.period} />
    </div>
  )
}
