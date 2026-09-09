"use client"

// BulkProductParamJobProgressDialog (F4, product-route-fork-attach-bulk) —
// polls a single already-queued CostProductParamBulkService job to
// completion and offers to view per-product failures. Simpler than
// mb-recipe-bulk-job-progress-dialog.tsx (one job, not an adaptive 3-stage
// chain) but mirrors its polling/progress/failures-list UX: Close is gated on
// the job reaching a terminal status, and the failures list is fetched on
// demand via a "View failures" link.
import { useState } from "react"
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  useBulkProductParamJobFailures,
  useBulkProductParamJobStatus,
} from "@/hooks/finance/use-bulk-edit-product-params"
import { BULK_PRODUCT_PARAM_JOB_TERMINAL_STATUSES } from "@/types/finance/cost-product-param-bulk"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string | undefined
  jobCode?: string
  /** Fired when the dialog is closed AFTER the job reached a terminal status. */
  onSettled: () => void
}

function isTerminal(status: string | undefined): boolean {
  return !!status && (BULK_PRODUCT_PARAM_JOB_TERMINAL_STATUSES as readonly string[]).includes(status)
}

export function BulkProductParamJobProgressDialog({ open, onOpenChange, jobId, jobCode, onSettled }: Props) {
  const statusQuery = useBulkProductParamJobStatus(open ? jobId : undefined)
  const status = statusQuery.data?.status
  const settled = isTerminal(status)

  // Reset the "view failures" toggle whenever the dialog is (re)opened for a
  // (possibly new) job, so a stale "viewing failures" panel from a previous
  // job never carries over into the next one. Adjusted during render (the
  // React-recommended alternative to an effect for "reset state when a prop
  // changes") rather than in a useEffect, which would call setState
  // synchronously inside the effect body and trigger a cascading re-render.
  const [viewFailures, setViewFailures] = useState(false)
  const [resetKey, setResetKey] = useState<string>(`${open}:${jobId ?? ""}`)
  const currentKey = `${open}:${jobId ?? ""}`
  if (open && currentKey !== resetKey) {
    setResetKey(currentKey)
    setViewFailures(false)
  }
  const failuresQuery = useBulkProductParamJobFailures(viewFailures ? jobId : undefined)

  const total = statusQuery.data?.totalChildren ?? 0
  const completed = statusQuery.data?.completedChildren ?? 0
  const failed = statusQuery.data?.failedChildren ?? 0
  const pct = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0

  function handleClose() {
    if (!settled) return
    onOpenChange(false)
    onSettled()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && settled) handleClose() }}>
      <DialogContent
        className="sm:max-w-[480px]"
        onInteractOutside={(e) => { if (!settled) e.preventDefault() }}
        showCloseButton={settled}
      >
        <DialogHeader>
          <DialogTitle>Bulk edit parameters {jobCode ? `— ${jobCode}` : ""}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium">
              <StatusIcon status={status} />
              {statusLabel(status)}
            </span>
            {statusQuery.data && (
              <span className="text-xs text-muted-foreground">
                {completed} completed · {failed} failed / {total} total
              </span>
            )}
          </div>

          {!settled && (
            <>
              <Progress value={statusQuery.data ? pct : undefined} className="h-1.5" />
              <p className="text-xs text-muted-foreground">Processing…</p>
            </>
          )}
          {settled && total > 0 && <Progress value={pct} className="h-1.5" />}

          {settled && failed > 0 && (
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setViewFailures(true)}>
              {viewFailures ? "Viewing failures" : `View ${failed} failure${failed === 1 ? "" : "s"}`}
            </Button>
          )}

          {viewFailures && (
            <div className="rounded-md border p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Failed products</p>
              {failuresQuery.isLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading failures…
                </div>
              )}
              {!failuresQuery.isLoading && (failuresQuery.data?.length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground">No failures recorded.</p>
              )}
              {!failuresQuery.isLoading && (failuresQuery.data?.length ?? 0) > 0 && (
                <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
                  {failuresQuery.data?.map((f) => (
                    <li key={f.productSysId} className="flex flex-col gap-0.5 border-b pb-1 last:border-0">
                      <span className="font-mono text-xs">{f.productCode}</span>
                      <span className="text-xs text-destructive">{f.errorMessage}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {settled && (
            <p className="text-sm text-muted-foreground">
              {status === "DONE" && "All products updated successfully."}
              {status === "PARTIAL" && "Finished with some failures — review them above."}
              {status === "FAILED" && "The job failed — review the failures above."}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={!settled}>
            {settled ? "Close" : "Running…"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StatusIcon({ status }: { status: string | undefined }) {
  if (!status || status === "QUEUED" || status === "PROCESSING") {
    return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
  }
  if (status === "FAILED") return <XCircle className="h-4 w-4 shrink-0 text-red-600" />
  if (status === "PARTIAL") return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
  return <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
}

function statusLabel(status: string | undefined): string {
  if (!status) return "Queuing…"
  if (status === "QUEUED") return "Queued"
  if (status === "PROCESSING") return "Processing…"
  if (status === "DONE") return "Done"
  if (status === "PARTIAL") return "Partially completed"
  if (status === "FAILED") return "Failed"
  return status
}
