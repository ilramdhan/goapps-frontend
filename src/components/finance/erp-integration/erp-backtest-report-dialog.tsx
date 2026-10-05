"use client"

import { Download, Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { usePermission } from "@/lib/hooks/use-permission"
import { cn } from "@/lib/utils"
import { downloadBlob, useErpBacktestReport } from "@/hooks/finance/use-erp-integration"
import type { ErpBacktestLine } from "@/types/finance/erp-integration"

interface Props {
  batchId: number | null
  onOpenChange: (open: boolean) => void
}

const CLASSES = ["MATCH", "DIFF", "ONLY_GOAPPS", "ONLY_LEGACY"]

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`

function linesToCsv(lines: ErpBacktestLine[]): string {
  const head = ["erp_item_code", "basis", "class", "goapps_std", "legacy_std", "diff"]
  const rows = lines.map((l) =>
    [l.erpItemCode, l.basis, l.class, l.goappsStd, l.legacyStd, l.diff].map(csvCell).join(",")
  )
  return [head.join(","), ...rows].join("\n")
}

export function ErpBacktestReportDialog({ batchId, onOpenChange }: Props) {
  const { hasPermission } = usePermission()
  const canExport = hasPermission("finance.cost.erpintegration.export")
  const { data: report, isLoading } = useErpBacktestReport(batchId ?? 0)

  const exportCsv = () => {
    if (!report) return
    downloadBlob(
      new Blob([linesToCsv(report.lines)], { type: "text/csv;charset=utf-8" }),
      `erp-backtest-${report.period || report.batchId}.csv`
    )
  }

  return (
    <Dialog open={batchId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Backtest report {report?.period ? `— ${report.period}` : ""}</DialogTitle>
          <DialogDescription>GoApps standard cost compared against legacy.</DialogDescription>
        </DialogHeader>
        {isLoading || !report ? (
          <div className="py-8 text-center text-muted-foreground">
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {CLASSES.map((c) => (
                <Badge key={c} variant="outline">
                  {c}: {report.counts[c] ?? 0}
                </Badge>
              ))}
              {report.failed && <Badge variant="destructive">FAILED</Badge>}
              {canExport && (
                <Button size="sm" variant="outline" className="ml-auto" onClick={exportCsv}>
                  <Download className="mr-1 h-3 w-3" /> Export CSV
                </Button>
              )}
            </div>
            <div className="max-h-[50vh] overflow-auto rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item code</TableHead>
                    <TableHead>Basis</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="text-right">GoApps std</TableHead>
                    <TableHead className="text-right">Legacy std</TableHead>
                    <TableHead className="text-right">Diff</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.lines.map((l, i) => {
                    const spFail = l.fail
                    return (
                      <TableRow
                        key={`${l.erpItemCode}-${l.basis}-${i}`}
                        data-testid={spFail ? "sp-fail-row" : undefined}
                        className={cn(spFail && "bg-destructive/10 text-destructive")}
                      >
                        <TableCell className="font-mono text-xs">{l.erpItemCode}</TableCell>
                        <TableCell className="text-xs">{l.basis}</TableCell>
                        <TableCell className="text-xs">{l.class}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{l.goappsStd}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{l.legacyStd}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{l.diff}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
