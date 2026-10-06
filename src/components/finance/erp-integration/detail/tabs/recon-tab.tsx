"use client"

import { jobIdOf } from "../erp-step-actions"
import { Button } from "@/components/ui/button"
import { useExportErpRecon, useReconErpBatch } from "@/hooks/finance/use-erp-integration"
import { usePermission } from "@/lib/hooks/use-permission"
import { LegacyComparePanel } from "../legacy-compare-panel"
import type { ErpBatch } from "@/types/finance/erp-integration"

export function ReconTab({ batch, onJobStarted }: { batch: ErpBatch; onJobStarted?: (jobId: string) => void }) {
  const { hasPermission } = usePermission()
  const recon = useReconErpBatch()
  const exportRecon = useExportErpRecon()
  const canExport = hasPermission("finance.cost.erpintegration.export")
  const can =
    batch.mode !== "SHADOW" && batch.allowedActions.includes("RECONCILED") && hasPermission("finance.cost.erpintegration.trigger")
  let summary: unknown = null
  try {
    summary = (JSON.parse(batch.summaryJson || "{}") as Record<string, unknown>).recon ?? null
  } catch {
    summary = null
  }
  return (
    <div className="space-y-3">
      {can && (
        <Button size="sm" variant="outline" disabled={recon.isPending} onClick={() => recon.mutate({ batchId: batch.batchId }, { onSuccess: (r) => { const j = jobIdOf(r); if (j) onJobStarted?.(j) } })}>
          Run reconciliation
        </Button>
      )}
      {canExport && (
        <Button size="sm" variant="outline" disabled={exportRecon.isPending} onClick={() => exportRecon.mutate(batch.batchId)}>
          Export recon (xlsx)
        </Button>
      )}
      <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">
        {summary ? JSON.stringify(summary, null, 2) : "No reconciliation summary yet."}
      </pre>
      <LegacyComparePanel batchId={batch.batchId} />
    </div>
  )
}
