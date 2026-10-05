"use client"

import { jobIdOf } from "../erp-step-actions"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useErpAdjPreview, useExecuteErpAdj, usePreviewErpAdj } from "@/hooks/finance/use-erp-integration"
import { usePermission } from "@/lib/hooks/use-permission"
import type { ErpBatch } from "@/types/finance/erp-integration"

import { TypedConfirm } from "../typed-confirm"

const OPS: { op: string; perm: string }[] = [
  { op: "VALUATE", perm: "valuate" },
  { op: "APPROVE", perm: "approve" },
  { op: "RESTORE", perm: "restore" },
]

export function AdjValuationTab({ batch, onJobStarted }: { batch: ErpBatch; onJobStarted?: (jobId: string) => void }) {
  const { hasPermission } = usePermission()
  const ops = OPS.filter((o) => hasPermission(`finance.cost.erpintegration.${o.perm}`))
  const [op, setOp] = useState(ops[0]?.op ?? "")
  const [previewId, setPreviewId] = useState("")
  const build = usePreviewErpAdj()
  const exec = useExecuteErpAdj()
  const { data: pv } = useErpAdjPreview(previewId)

  if (batch.mode === "SHADOW" || ops.length === 0) {
    return <p className="text-sm text-muted-foreground">ADJ operations are not available.</p>
  }
  const v07Bad = pv?.v07 !== undefined && pv.v07.ok === false

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">This is one period-wide VALUATE_ADJ(P_BATCH_ID) call.</p>
      <div className="flex items-center gap-2">
        <select
          aria-label="Operation"
          value={op}
          onChange={(e) => setOp(e.target.value)}
          className="h-9 rounded-md border bg-background px-2 text-sm"
        >
          {ops.map((o) => (
            <option key={o.op} value={o.op}>
              {o.op}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant="outline"
          disabled={!op || build.isPending}
          onClick={() =>
            build.mutate(
              { batchId: batch.batchId, operation: op },
              {
                onSuccess: (r) => {
                  setPreviewId(r.previewId ?? "")
                  const j = jobIdOf(r)
                  if (j) onJobStarted?.(j)
                },
              }
            )
          }
        >
          Build preview
        </Button>
      </div>
      {pv && (
        <>
          <Card className="grid gap-3 p-4 sm:grid-cols-4">
            <div>Heads: <span className="font-mono">{pv.headCount}</span></div>
            <div>Excluded: <span className="font-mono">{pv.excludedCount}</span></div>
            <div>Total: <span className="font-mono">{pv.totalAmount}</span></div>
            <div className="break-all text-xs">Hash: <span className="font-mono">{pv.setHash}</span></div>
          </Card>
          <ul className="space-y-1 text-xs">
            {pv.heads.map((h) => (
              <li key={h.headId} className="font-mono">
                {h.headId} {h.itemCode} qty={h.qty} amt={h.amount}
                {h.excluded ? ` (excluded: ${h.excludeReason})` : ""}
              </li>
            ))}
          </ul>
          {v07Bad && (
            <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              V-07 check failed. Offending heads:
              <ul className="list-disc pl-4 font-mono text-xs">
                {pv.v07?.offendingHeadIds.map((id) => (
                  <li key={id}>{id}</li>
                ))}
              </ul>
            </div>
          )}
          <TypedConfirm
            key={pv.previewId}
            expected={`${batch.period}/${batch.batchId}`}
            expiresAt={pv.expiresAt || undefined}
            label={`Execute ${pv.operation || op}`}
            disabled={v07Bad || exec.isPending}
            onConfirm={() =>
              exec.mutate(
                {
                  batchId: batch.batchId,
                  previewId: pv.previewId,
                  confirmSetHash: pv.setHash,
                  confirmText: `${batch.period}/${batch.batchId}`,
                },
                { onSuccess: (r) => { const j = jobIdOf(r); if (j) onJobStarted?.(j) } }
              )
            }
          />
        </>
      )}
    </div>
  )
}
