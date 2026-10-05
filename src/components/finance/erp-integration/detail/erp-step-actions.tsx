"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  useAbandonErpBatch,
  useLoadErpDemand,
  useLockErpBatch,
  useReconErpBatch,
  useRunErpCoverage,
  useRunErpDerive,
  useValidateErpBatch,
} from "@/hooks/finance/use-erp-integration"
import { usePermission } from "@/lib/hooks/use-permission"
import type { ErpBatch } from "@/types/finance/erp-integration"

const P = "finance.cost.erpintegration."

/** Extracts the job id from a step mutation result (undefined when absent). */
export function jobIdOf(r: unknown): string | undefined {
  const id = (r as { jobId?: string } | undefined)?.jobId
  return id || undefined
}

interface Props {
  batch: ErpBatch
  /** Called with the job id when a step enqueues a background job. */
  onJobStarted?: (jobId: string) => void
}

/** Step buttons; each needs the target status in allowedActions AND the permission. No "run all". */
export function ErpStepActions({ batch, onJobStarted }: Props) {
  const { hasPermission } = usePermission()
  const [reason, setReason] = useState("")
  const [abandoning, setAbandoning] = useState(false)
  const load = useLoadErpDemand()
  const cover = useRunErpCoverage()
  const derive = useRunErpDerive()
  const validate = useValidateErpBatch()
  const recon = useReconErpBatch()
  const lock = useLockErpBatch()
  const abandon = useAbandonErpBatch()

  if (batch.mode === "SHADOW") return null
  const id = batch.batchId
  const started = (r: unknown) => {
    const j = jobIdOf(r)
    if (j) onJobStarted?.(j)
  }
  const can = (target: string, perm: string) => batch.allowedActions.includes(target) && hasPermission(P + perm)

  const steps = [
    { target: "DEMAND_LOADED", perm: "trigger", label: "Load demand", run: () => load.mutate({ batchId: id }, { onSuccess: started }), busy: load.isPending },
    { target: "COVERED", perm: "trigger", label: "Run coverage", run: () => cover.mutate({ batchId: id }, { onSuccess: started }), busy: cover.isPending },
    { target: "DERIVED", perm: "trigger", label: "Derive", run: () => derive.mutate({ batchId: id }, { onSuccess: started }), busy: derive.isPending },
    { target: "VALIDATED", perm: "validate", label: "Validate", run: () => validate.mutate({ batchId: id }, { onSuccess: started }), busy: validate.isPending },
    { target: "RECONCILED", perm: "trigger", label: "Reconcile", run: () => recon.mutate({ batchId: id }, { onSuccess: started }), busy: recon.isPending },
    { target: "LOCKED", perm: "lock", label: "Lock batch", run: () => lock.mutate(id), busy: lock.isPending },
  ].filter((s) => can(s.target, s.perm))

  const canAbandon = can("FAILED", "trigger")

  return (
    <div className="space-y-3" data-testid="erp-step-actions">
      <div className="flex flex-wrap gap-2">
        {steps.map((s) => (
          <Button key={s.target} size="sm" variant="outline" disabled={s.busy} onClick={s.run}>
            {s.label}
          </Button>
        ))}
        {canAbandon && !abandoning && (
          <Button size="sm" variant="destructive" onClick={() => setAbandoning(true)}>
            Abandon
          </Button>
        )}
      </div>
      {canAbandon && abandoning && (
        <div className="max-w-md space-y-2">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (min 10 characters)" />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={reason.trim().length < 10 || abandon.isPending}
              onClick={() => abandon.mutate(id, { onSuccess: () => setAbandoning(false) })}
            >
              Confirm abandon
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAbandoning(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
