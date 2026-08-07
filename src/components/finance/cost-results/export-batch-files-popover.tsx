"use client"

import { useState } from "react"
import { Archive, Download, FileSpreadsheet, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { StatusBadge } from "@/components/common/status-badge"
import { useBatchChildDownloadUrl, useExportBatchChildren } from "@/hooks/finance/use-cost-calc"

interface Props {
  parentJobId: string
  totalChildren: number
  // Only fetch once the batch has actually finished (success or
  // partial-failure) — see useExportBatchChildren's doc comment for why a
  // single fetch is correct here (no polling needed).
  enabled: boolean
}

// ExportBatchFilesPopover lists every child file of a completed batch export
// by job_code (never raw job_id) with a per-row download link once ready.
export function ExportBatchFilesPopover({ parentJobId, totalChildren, enabled }: Props) {
  const { data: children, isLoading } = useExportBatchChildren(parentJobId, { enabled })
  const downloadUrlMutation = useBatchChildDownloadUrl()
  const [pendingChildId, setPendingChildId] = useState<string | null>(null)

  const completedCount = children?.filter((c) => c.status === "SUCCESS").length ?? 0

  function handleDownloadChild(childJobId: string, label: string) {
    setPendingChildId(childJobId)
    downloadUrlMutation.mutate(
      { parentJobId, childJobId },
      {
        onSuccess: (result) => {
          if (!result.downloadUrl) {
            toast.error(`No download link available for ${label}`)
            return
          }
          window.open(result.downloadUrl, "_blank", "noopener,noreferrer")
        },
        onSettled: () => setPendingChildId(null),
      },
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Download files ({totalChildren})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="end">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Export files</span>
          {completedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1.5 px-1.5 text-xs"
              title={`Download all ${completedCount} files as a zip`}
              onClick={() =>
                window.open(
                  `/api/v1/finance/cost-results/exports/${parentJobId}/download-all`,
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            >
              <Archive className="h-3.5 w-3.5" />
              Download all ({completedCount})
            </Button>
          )}
        </div>
        {isLoading && (
          <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading files…
          </div>
        )}
        {!isLoading && (!children || children.length === 0) && (
          <div className="py-3 text-sm text-muted-foreground">No files found.</div>
        )}
        {!isLoading && children && children.length > 0 && (
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {children.map((child, idx) => {
              const label = child.jobCode || `File ${idx + 1}`
              const downloadable = child.status === "SUCCESS"
              const isPending = pendingChildId === child.jobId
              return (
                <li
                  key={child.jobId}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate font-mono text-xs">{label}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <StatusBadge status={child.status} type="job" size="sm" />
                    {downloadable ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        title={`Download ${label}`}
                        disabled={isPending}
                        onClick={() => handleDownloadChild(child.jobId, label)}
                      >
                        {isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    ) : child.status === "QUEUED" || child.status === "PROCESSING" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    ) : null}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
