"use client"

// LookupSyncJobProgressDialog - polls a queued lookup-sync job to completion.
// Sibling of bulk-product-param-job-progress-dialog.tsx.
import { useState } from "react"
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { isLookupSyncJobTerminal } from "@/types/finance/lookup-sync"
import { useLookupSyncJobFailures, useLookupSyncJobStatus } from "./use-lookup-sync"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string | undefined
  jobCode?: string
  /** Fired when closed AFTER the job reached a terminal status. */
  onSettled: () => void
}

export function LookupSyncJobProgressDialog({ open, onOpenChange, jobId, jobCode, onSettled }: Props) {
  const statusQuery = useLookupSyncJobStatus(open ? jobId : undefined)
  const data = statusQuery.data
  const status = data?.status
  const settled = isLookupSyncJobTerminal(status)

  const [viewFailures, setViewFailures] = useState(false)
  const [resetKey, setResetKey] = useState(`${open}:${jobId ?? ""}`)
  const currentKey = `${open}:${jobId ?? ""}`
  if (open && currentKey !== resetKey) {
    setResetKey(currentKey)
    setViewFailures(false)
  }
  const failuresQuery = useLookupSyncJobFailures(viewFailures ? jobId : undefined)

  const total = data?.totalChildren ?? 0
  const completed = data?.completedChildren ?? 0
  const failed = data?.failedChildren ?? 0
  const skipped = data?.skippedChildren ?? 0
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
          <DialogTitle>Sinkronisasi master lookup {jobCode ? `— ${jobCode}` : ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium">
              <StatusIcon status={status} />
              {statusLabel(status)}
            </span>
            {data && (
              <span className="text-xs text-muted-foreground">
                {completed} selesai · {failed} gagal · {skipped} dilewati / {total}
              </span>
            )}
          </div>
          {!settled && <Progress value={data ? pct : undefined} className="h-1.5" />}
          {settled && total > 0 && <Progress value={pct} className="h-1.5" />}
          {data && <p className="text-xs text-muted-foreground">{data.valuesWritten} nilai ditulis</p>}

          {settled && (failed > 0 || skipped > 0) && (
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setViewFailures(true)}>
              {viewFailures ? "Menampilkan detail" : "Lihat gagal / dilewati"}
            </Button>
          )}
          {viewFailures && (
            <div className="rounded-md border p-3">
              {failuresQuery.isLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Memuat…
                </div>
              )}
              {!failuresQuery.isLoading && (failuresQuery.data?.length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground">Tidak ada catatan.</p>
              )}
              {(failuresQuery.data?.length ?? 0) > 0 && (
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={!settled}>
            {settled ? "Tutup" : "Berjalan…"}
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
  if (!status) return "Mengantre…"
  if (status === "QUEUED") return "Antre"
  if (status === "PROCESSING") return "Memproses…"
  if (status === "DONE") return "Selesai"
  if (status === "PARTIAL") return "Selesai sebagian"
  if (status === "FAILED") return "Gagal"
  return status
}
