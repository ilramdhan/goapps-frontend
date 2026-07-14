"use client"

import { Loader2 } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyState } from "@/components/common/empty-state"
import { UserName } from "@/components/common/user-name"

import type { MbPushLog } from "@/types/finance/mb-push-log"

function fmtDate(ts: string | null | undefined): string {
  if (!ts) return "—"
  try {
    return new Date(ts).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return ts
  }
}

interface MbPushLogTableProps {
  items: MbPushLog[]
  isLoading: boolean
}

export function MbPushLogTable({ items, isLoading }: MbPushLogTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-10 justify-center text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
      </div>
    )
  }

  if (items.length === 0) {
    return <EmptyState title="No push history" description="Executed pushes will appear here." />
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Period</TableHead>
            <TableHead className="w-40">Pushed At</TableHead>
            <TableHead>Pushed By</TableHead>
            <TableHead className="w-24 text-right">MB Count</TableHead>
            <TableHead className="w-24 text-right">Rows</TableHead>
            <TableHead>Cost Types</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((log) => (
            <TableRow key={log.mbplId}>
              <TableCell className="font-mono text-xs">{log.period}</TableCell>
              <TableCell className="text-sm">{fmtDate(log.pushedAt)}</TableCell>
              <TableCell className="text-sm">
                <UserName userId={log.pushedBy} compact />
              </TableCell>
              <TableCell className="text-right text-sm">{log.mbCount}</TableCell>
              <TableCell className="text-right text-sm">{log.rowCount}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{log.costTypes || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
