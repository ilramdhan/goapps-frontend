"use client"

import { jobIdOf } from "../erp-step-actions"
import { Card } from "@/components/ui/card"
import { useErpPushPreview, usePushErpBatch } from "@/hooks/finance/use-erp-integration"
import { usePermission } from "@/lib/hooks/use-permission"
import type { ErpBatch } from "@/types/finance/erp-integration"

import { TypedConfirm } from "../typed-confirm"

export function PushTab({ batch, onJobStarted }: { batch: ErpBatch; onJobStarted?: (jobId: string) => void }) {
  const { hasPermission } = usePermission()
  const canPush =
    batch.mode !== "SHADOW" && batch.allowedActions.includes("PUSHED") && hasPermission("finance.cost.erpintegration.push")
  const { data: pv } = useErpPushPreview(batch.batchId, canPush)
  const push = usePushErpBatch()

  if (!canPush) return <p className="text-sm text-muted-foreground">Push is not available for this batch.</p>
  return (
    <div className="space-y-4">
      <Card className="grid gap-3 p-4 sm:grid-cols-3">
        <div>
          <div className="text-xs text-muted-foreground">Rows</div>
          <div className="font-mono text-sm">{pv?.rowCount ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Sum std</div>
          <div className="font-mono text-sm">{pv?.sumStd ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Hash</div>
          <div className="break-all font-mono text-xs">{pv?.setHash ?? "—"}</div>
        </div>
      </Card>
      {pv?.warnings.map((w) => (
        <p key={w} className="text-xs text-amber-700">
          {w}
        </p>
      ))}
      <TypedConfirm
        expected={`${batch.period}/${batch.batchId}`}
        label="Push to Oracle"
        disabled={!pv || push.isPending}
        onConfirm={() =>
          pv && push.mutate(
            { batchId: batch.batchId, body: { confirmRowCount: pv.rowCount, confirmSumStd: pv.sumStd } },
            { onSuccess: (r) => { const j = jobIdOf(r); if (j) onJobStarted?.(j) } }
          )
        }
      />
    </div>
  )
}
