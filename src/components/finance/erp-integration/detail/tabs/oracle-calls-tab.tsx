"use client"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useErpOracleCalls } from "@/hooks/finance/use-erp-integration"

function statusClass(status: string): string {
  switch (status) {
    case "SUCCESS":
      return "bg-green-100 text-green-800"
    case "FAILED":
      return "bg-red-100 text-red-800"
    case "UNKNOWN":
    case "STARTED":
      return "bg-amber-100 text-amber-800"
    default:
      return ""
  }
}

export function OracleCallsTab({ batchId }: { batchId: number }) {
  const { data } = useErpOracleCalls(batchId)
  const rows = data?.items ?? []
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        One row per period-wide package call (VALUATE_ADJ / APPROVE_ADJ / LOCK_BATCH) or W1 push.
      </p>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>ORA code</TableHead>
              <TableHead className="text-right">Attempts</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Finished</TableHead>
              <TableHead className="text-right">Duration (s)</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.callType}</TableCell>
                <TableCell className="text-xs">
                  <Badge variant="outline" className={statusClass(r.status)}>
                    {r.status}
                  </Badge>
                  {r.status === "UNKNOWN" && (
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      Resolved by reconciliation, never re-called.
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs">{r.oraCode || "-"}</TableCell>
                <TableCell className="text-right font-mono text-xs">{r.attempts}</TableCell>
                <TableCell className="text-xs">{r.startedAt}</TableCell>
                <TableCell className="text-xs">{r.finishedAt || "-"}</TableCell>
                <TableCell className="text-right font-mono text-xs">{(r.durationMs / 1000).toFixed(2)}</TableCell>
                <TableCell className="text-xs">{r.actor}</TableCell>
                <TableCell className="max-w-[240px] truncate text-xs" title={r.error}>
                  {r.error}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
