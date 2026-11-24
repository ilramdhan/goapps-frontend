"use client"

import { useState } from "react"
import { CheckCircle2, Download, ShieldCheck, X } from "lucide-react"

import { ConfirmDialog } from "@/components/shared"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  useBulkApproveCosts,
  useBulkVerifyCosts,
  type CostResultBulkOutcome,
  type CostResultBulkSelectionInput,
} from "@/hooks/finance/use-cost-calc"
import { usePermissionContext } from "@/providers/permission-provider"

/** Mirrors the server cap (BulkTransitionMaxRows). */
export const BULK_MAX_ROWS = 2000

type Action = "verify" | "approve"

const ACTION_LABEL: Record<Action, { verb: string; past: string; source: string }> = {
  verify: { verb: "Verify", past: "verified", source: "CALCULATED" },
  approve: { verb: "Approve", past: "approved", source: "VERIFIED" },
}

export interface CostResultBulkActionsProps {
  /** Ids ticked on the current page(s). */
  selectedIds: number[]
  /** List filter used for "all matching" mode (period required). */
  filter: Omit<CostResultBulkSelectionInput, "costIds">
  /** Total rows matching the filter (all statuses shown by the list). */
  totalMatching: number
  onClearSelection: () => void
}

export function failuresToCsv(outcome: CostResultBulkOutcome): string {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
  const lines = outcome.failures.map((f) => [String(f.costId), esc(f.productCode), esc(f.reason)].join(","))
  return ["cost_id,product_code,reason", ...lines].join("\n")
}

function downloadCsv(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }))
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export function CostResultBulkActions({ selectedIds, filter, totalMatching, onClearSelection }: CostResultBulkActionsProps) {
  const { hasPermission } = usePermissionContext()
  const verify = useBulkVerifyCosts()
  const approve = useBulkApproveCosts()
  const [pending, setPending] = useState<{ action: Action; mode: "ids" | "filter" } | null>(null)
  const [result, setResult] = useState<{ action: Action; outcome: CostResultBulkOutcome } | null>(null)

  const canVerify = hasPermission("finance.cost.result.verify")
  const canApprove = hasPermission("finance.cost.result.approve")
  if (!canVerify && !canApprove) return null

  const hasSelection = selectedIds.length > 0
  const filterReady = Boolean(filter.period) && totalMatching > 0
  const busy = verify.isPending || approve.isPending

  const run = async () => {
    if (!pending) return
    const m = pending.action === "verify" ? verify : approve
    const selection = pending.mode === "ids" ? { costIds: selectedIds } : filter
    try {
      const outcome = await m.mutateAsync(selection)
      setResult({ action: pending.action, outcome })
      onClearSelection()
    } finally {
      setPending(null)
    }
  }

  const describe = () => {
    if (!pending) return ""
    const l = ACTION_LABEL[pending.action]
    const what =
      pending.mode === "ids"
        ? `${selectedIds.length} selected row(s)`
        : `every ${l.source} row matching the current filter (period ${filter.period}, max ${BULK_MAX_ROWS})`
    return `${l.verb} ${what}. Rows in another status, MB rows and rows of a locked period are skipped and listed in the summary.`
  }

  const buttons = (["verify", "approve"] as const).filter((a) => (a === "verify" ? canVerify : canApprove))

  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasSelection && (
        <span className="text-xs text-muted-foreground">
          {selectedIds.length} selected
          <Button variant="ghost" size="sm" className="ml-1 h-7 px-2" onClick={onClearSelection} aria-label="Clear selection">
            <X className="h-3.5 w-3.5" />
          </Button>
        </span>
      )}
      {buttons.map((a) => {
        const Icon = a === "verify" ? ShieldCheck : CheckCircle2
        return hasSelection ? (
          <Button key={a} size="sm" className="h-8" disabled={busy} onClick={() => setPending({ action: a, mode: "ids" })}>
            <Icon className="mr-1.5 h-4 w-4" /> {ACTION_LABEL[a].verb} selected
          </Button>
        ) : (
          <Button
            key={a}
            size="sm"
            variant="outline"
            className="h-8"
            disabled={busy || !filterReady}
            title={filter.period ? undefined : "Pick a period to act on all matching rows"}
            onClick={() => setPending({ action: a, mode: "filter" })}
          >
            <Icon className="mr-1.5 h-4 w-4" /> {ACTION_LABEL[a].verb} all matching
          </Button>
        )
      })}

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => !o && !busy && setPending(null)}
        title={pending ? `${ACTION_LABEL[pending.action].verb} cost results` : ""}
        description={describe()}
        variant="warning"
        confirmText={pending ? ACTION_LABEL[pending.action].verb : "Confirm"}
        isLoading={busy}
        onConfirm={run}
      />

      <Dialog open={result !== null} onOpenChange={(o) => !o && setResult(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Bulk {result ? ACTION_LABEL[result.action].verb.toLowerCase() : ""} result</DialogTitle>
            <DialogDescription>
              {result?.outcome.okCount ?? 0} {result ? ACTION_LABEL[result.action].past : ""} · {result?.outcome.failedCount ?? 0} failed
            </DialogDescription>
          </DialogHeader>
          {result && result.outcome.failures.length > 0 && (
            <div className="max-h-72 overflow-y-auto rounded-md border text-xs">
              <table className="w-full">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="px-2 py-1 text-left font-medium">Cost id</th>
                    <th className="px-2 py-1 text-left font-medium">Product</th>
                    <th className="px-2 py-1 text-left font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {result.outcome.failures.map((f) => (
                    <tr key={f.costId} className="border-t">
                      <td className="px-2 py-1 font-mono">{f.costId}</td>
                      <td className="px-2 py-1 font-mono">{f.productCode || "—"}</td>
                      <td className="px-2 py-1">{f.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <DialogFooter>
            {result && result.outcome.failures.length > 0 && (
              <Button
                variant="outline"
                onClick={() => downloadCsv(failuresToCsv(result.outcome), `cost-result-bulk-${result.action}-failures.csv`)}
              >
                <Download className="mr-1.5 h-4 w-4" /> Download failures
              </Button>
            )}
            <Button onClick={() => setResult(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
