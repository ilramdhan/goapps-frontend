"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { LookupSyncScope } from "@/types/finance/lookup-sync"
import { LookupSyncJobProgressDialog } from "./lookup-sync-job-progress-dialog"
import {
  useApplyLookupSync,
  useInvalidateAfterLookupSync,
  useLookupSyncPreview,
} from "./use-lookup-sync"

export interface LookupSyncPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scope: LookupSyncScope
  title?: string
}

const SKIP_LABELS: Record<string, string> = {
  LOCKED: "Terkunci",
  KEY_EMPTY: "Key kosong",
  KEY_NOT_FOUND: "Key tidak ditemukan",
  MB_SPIN_AMBIGUOUS: "MB Spin ambigu",
}

export function LookupSyncPreviewDialog({ open, onOpenChange, scope, title }: LookupSyncPreviewDialogProps) {
  const [page, setPage] = useState(1)
  const [onlyActionable, setOnlyActionable] = useState(true)
  const [job, setJob] = useState<{ id: string; code: string } | undefined>()
  const [progressOpen, setProgressOpen] = useState(false)

  const preview = useLookupSyncPreview(scope, page, onlyActionable, { enabled: open })
  const apply = useApplyLookupSync()
  const invalidate = useInvalidateAfterLookupSync()

  const summary = preview.data?.summary
  const items = preview.data?.items ?? []
  const totalPages = preview.data?.pagination.totalPages ?? 1
  const nothingToApply = !summary || summary.totalValueChanges === 0

  async function handleConfirm() {
    if (!summary) return
    try {
      const res = await apply.mutateAsync({ scope, planFingerprint: summary.planFingerprint })
      if (res.drifted) {
        toast.error("Data berubah sejak preview. Preview dimuat ulang, silakan tinjau lagi.")
        await preview.refetch()
        return
      }
      setJob({ id: res.job?.jobId ?? "", code: res.job?.jobCode ?? "" })
      onOpenChange(false)
      setProgressOpen(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menerapkan sinkronisasi")
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{title ?? "Terapkan perubahan master ke product"}</DialogTitle>
            <DialogDescription>
              Hasil kalkulasi tidak berubah sampai di-recalc.
            </DialogDescription>
          </DialogHeader>

          <Alert variant="destructive">
            <AlertDescription>
              Menerapkan akan menimpa nilai manual pada parameter turunan; nilai yang dikosongkan (CLEAR) juga akan terhapus.
            </AlertDescription>
          </Alert>

          {summary && (
            <div className="flex flex-wrap items-center gap-2 text-sm" data-testid="lookup-sync-summary">
              <Badge variant="secondary">{summary.totalProducts} product</Badge>
              <Badge variant="secondary">{summary.totalValueChanges} perubahan</Badge>
              <Badge variant="outline">{summary.lockedProducts} terkunci</Badge>
              {Object.entries(summary.skipCounts).map(([k, v]) => (
                <Badge key={k} variant="outline">
                  {SKIP_LABELS[k] ?? k}: {v}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Switch
              id="lookup-sync-only-actionable"
              checked={onlyActionable}
              onCheckedChange={(v) => { setOnlyActionable(v); setPage(1) }}
            />
            <Label htmlFor="lookup-sync-only-actionable">Hanya yang berubah / dilewati (sembunyikan yang sudah sesuai)</Label>
          </div>

          <div className="max-h-[50vh] overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Master key</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Perubahan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                    </TableCell>
                  </TableRow>
                )}
                {preview.isError && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-destructive" data-testid="lookup-sync-preview-error">
                      Gagal memuat preview: {preview.error instanceof Error ? preview.error.message : "terjadi kesalahan"}
                    </TableCell>
                  </TableRow>
                )}
                {!preview.isLoading && !preview.isError && items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Tidak ada data.
                    </TableCell>
                  </TableRow>
                )}
                {items.map((it) => (
                  <TableRow key={`${it.productSysId}:${it.triggerParamCode}`}>
                    <TableCell>
                      <div className="font-mono text-xs">{it.productCode}</div>
                      <div className="text-xs text-muted-foreground">{it.productName}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{it.triggerParamCode}</TableCell>
                    <TableCell className="font-mono text-xs">{it.masterKey || "-"}</TableCell>
                    <TableCell>
                      {it.skipReason ? (
                        <Badge variant="outline">{SKIP_LABELS[it.skipReason] ?? it.skipReason}</Badge>
                      ) : (
                        <Badge variant="secondary">Diterapkan</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <ul className="space-y-0.5 text-xs">
                        {it.changes.map((c) => (
                          <li key={c.paramId || c.paramCode}>
                            <span className="font-medium">{c.paramCode}</span>:{" "}
                            <span className="text-muted-foreground">{c.oldValue || "(kosong)"}</span> →{" "}
                            {c.changeKind === "CLEAR" ? (
                              <Badge variant="destructive" className="px-1 py-0 text-[10px]">CLEAR</Badge>
                            ) : (
                              <span className="font-medium">{c.newValue}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 text-sm">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Sebelumnya
              </Button>
              <span>{page} / {totalPages}</span>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Berikutnya
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button onClick={handleConfirm} disabled={nothingToApply || apply.isPending || preview.isFetching}>
              {apply.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Terapkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LookupSyncJobProgressDialog
        open={progressOpen}
        onOpenChange={setProgressOpen}
        jobId={job?.id}
        jobCode={job?.code}
        onSettled={invalidate}
      />
    </>
  )
}
