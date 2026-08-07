"use client"

import { History, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { StatusBadge } from "@/components/common/status-badge"
import { useExportJobsList } from "@/hooks/finance/use-cost-calc"

interface Props {
  // Scopes the history list to the page's current period filter, same as the
  // Export button's own request payload.
  period?: string
  // Clicking a history row reuses the exact same click-through path as the
  // batch-complete notification's NAVIGATE payload (?exportJobId=...) — see
  // emitBatchReadyNotification in costsheet_export_handler.go.
  onSelectJob: (jobId: string) => void
}

// RecentExportsPopover lists recent product cost sheet export jobs (both
// standalone and batch-parent) so users can find past exports without
// relying on a one-time notification link.
export function RecentExportsPopover({ period, onSelectJob }: Props) {
  const { data, isLoading } = useExportJobsList({ period, pageSize: 10 })
  const items = data?.items ?? []

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="default" className="gap-1.5">
          <History className="h-4 w-4" />
          Recent exports
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-3" align="end">
        <div className="mb-2 text-xs font-semibold text-muted-foreground">Recent exports</div>
        {isLoading && (
          <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}
        {!isLoading && items.length === 0 && (
          <div className="py-3 text-sm text-muted-foreground">No export jobs found.</div>
        )}
        {!isLoading && items.length > 0 && (
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {items.map((job) => {
              const progressLabel = job.isBatch
                ? `${job.completedChildren}/${job.totalChildren} completed${
                    job.failedChildren > 0 ? ` · ${job.failedChildren} failed` : ""
                  }`
                : null
              return (
                <li key={job.jobId}>
                  <button
                    type="button"
                    onClick={() => onSelectJob(job.jobId)}
                    className="flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/50"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-mono text-xs">{job.jobCode || "—"}</span>
                      <StatusBadge status={job.status} type="job" size="sm" />
                    </span>
                    <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>Period {job.period || "—"}</span>
                      {progressLabel && <span>{progressLabel}</span>}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
