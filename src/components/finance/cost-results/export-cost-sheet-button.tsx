"use client"

import { useState } from "react"
import { CheckCircle2, Download, Loader2, X, XCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/confirm-dialog/confirm-dialog"
import { ExportBatchFilesPopover } from "@/components/finance/cost-results/export-batch-files-popover"
import {
  useRequestCostSheetExport,
  useExportBatchProgress,
  useExportJobStatus,
  type CostSheetExportJobInfo,
  type RequestCostSheetExportInput,
} from "@/hooks/finance/use-cost-calc"

// Must match services/finance/internal/application/costsheet.maxExportProducts —
// above this, a filter resolves into a parent job + N chunked child jobs
// instead of one workbook.
const MAX_EXPORT_PRODUCTS = 200

interface Props {
  // Current filter state. `period` must be a 6-digit YYYYMM — the backend
  // namespaces MinIO artifacts by it, so there is no "all periods" export.
  filters: RequestCostSheetExportInput
  // Explicit selection wins over the filters when non-empty (single-row export).
  productSysIds?: number[]
  // Total product count the current filter resolves to (e.g. the results
  // list's pagination.totalItems). Used only to warn before a batch export;
  // omit for single-row export call sites where it isn't meaningful.
  totalCount?: number
  label?: string
  variant?: "outline" | "ghost"
  size?: "sm" | "default"
  className?: string
  // In-flight/most-recent export job id persisted in the page's URL — lets
  // progress rehydrate after a refresh. Optional: call sites that don't need
  // refresh-survival (e.g. a single-row export button) can omit both props.
  exportJobId?: string
  onExportJobIdChange?: (jobId: string) => void
}

export function ExportCostSheetButton({
  filters,
  productSysIds,
  totalCount,
  label = "Export",
  variant = "outline",
  size = "default",
  className,
  exportJobId,
  onExportJobIdChange,
}: Props) {
  const mutation = useRequestCostSheetExport()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [job, setJob] = useState<CostSheetExportJobInfo | null>(null)
  const hasPeriod = /^[0-9]{6}$/.test(filters.period ?? "")

  // Rehydrate from the URL: if the page carries a job id from a previous
  // session (e.g. refresh mid-batch, or arriving via the batch-complete
  // notification's click-through) and we don't have a local job snapshot
  // yet, poll its current status and use that as the effective job — no
  // local state sync needed, this is a pure derivation.
  const rehydrateQuery = useExportJobStatus(job ? undefined : exportJobId, { enabled: !job && !!exportJobId })
  const effectiveJob = job ?? rehydrateQuery.data ?? null
  const progress = useExportBatchProgress(effectiveJob)

  // Explicit row selection is always a single product — the >200 warning
  // only applies to the filter-driven bulk export, where the resolved count
  // comes from the caller (results list's total, not the current page size).
  const effectiveCount = productSysIds?.length ? productSysIds.length : (totalCount ?? 0)
  const isBulkBatch = effectiveCount > MAX_EXPORT_PRODUCTS

  function fireExport() {
    mutation.mutate(
      { ...filters, productSysIds },
      {
        onSuccess: (info) => {
          setJob(info)
          onExportJobIdChange?.(info.jobId)
        },
      },
    )
  }

  function handleClick() {
    if (!hasPeriod) {
      toast.warning("Set a 6-digit period (YYYYMM) before exporting.")
      return
    }
    if (isBulkBatch) {
      setConfirmOpen(true)
      return
    }
    fireExport()
  }

  const batchCount = Math.ceil(effectiveCount / MAX_EXPORT_PRODUCTS)

  // Clears both the local snapshot (set by fireExport) and the URL-persisted
  // id (set by history selection) so the button returns to its idle state
  // regardless of which path populated effectiveJob.
  function handleDismiss() {
    setJob(null)
    onExportJobIdChange?.("")
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
        disabled={mutation.isPending || !hasPeriod}
        title={hasPeriod ? undefined : "Set a period first"}
      >
        {mutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        {mutation.isPending ? "Preparing…" : label}
      </Button>

      {progress && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {progress.done ? (
            progress.failed ? (
              <>
                <XCircle className="h-3.5 w-3.5 text-destructive" />
                <span>Export failed — check notifications.</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>
                  {progress.isBatch
                    ? `${progress.completedChildren} / ${progress.totalChildren} files exported${
                        progress.failedChildren > 0 ? ` (${progress.failedChildren} failed)` : ""
                      }`
                    : "Export ready"}
                </span>
                {effectiveJob &&
                  (progress.isBatch ? (
                    <ExportBatchFilesPopover
                      parentJobId={effectiveJob.jobId}
                      totalChildren={progress.totalChildren}
                      enabled={progress.done}
                    />
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 px-1.5 text-xs"
                      onClick={() =>
                        window.open(
                          `/api/v1/finance/cost-results/exports/${effectiveJob.jobId}/download`,
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </Button>
                  ))}
              </>
            )
          ) : (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>
                {progress.isBatch
                  ? `${progress.completedChildren} / ${progress.totalChildren} files exported…`
                  : "Exporting…"}
              </span>
            </>
          )}
          {onExportJobIdChange && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:text-foreground"
              onClick={handleDismiss}
              title="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Export a large product set"
        description={`This will export ${effectiveCount.toLocaleString()} products across ${batchCount} batches (max ${MAX_EXPORT_PRODUCTS} products per file). Continue?`}
        confirmText="Export"
        onConfirm={() => {
          setConfirmOpen(false)
          fireExport()
        }}
      />
    </div>
  )
}
