"use client"

import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { ErpBatch } from "@/types/finance/erp-integration"

interface Props {
  items: ErpBatch[]
  isLoading?: boolean
  page: number
  total: number
  totalPages: number
  onPageChange: (page: number) => void
  onViewReport?: (batch: ErpBatch) => void
}

export function statusTone(status: string): string {
  switch (status) {
    case "FAILED":
      return "bg-red-100 text-red-700 border-red-200"
    case "SUPERSEDED":
      return "bg-muted text-muted-foreground"
    case "LOCKED":
    case "RECONCILED":
    case "VALUATED":
      return "bg-emerald-100 text-emerald-700 border-emerald-200"
    case "PUSHED":
      return "bg-amber-100 text-amber-700 border-amber-200"
    default:
      return "bg-blue-100 text-blue-700 border-blue-200"
  }
}

function formatDateTime(ts: string): string {
  if (!ts) return "—"
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ts
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function ErpBatchesTable({ items, isLoading, page, total, totalPages, onPageChange, onViewReport }: Props) {
  const router = useRouter()
  return (
    <>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Period</TableHead>
              <TableHead className="w-24">Mode</TableHead>
              <TableHead className="w-36">Status</TableHead>
              <TableHead className="w-16 text-right">Seq</TableHead>
              <TableHead className="w-28">Created by</TableHead>
              <TableHead className="w-44">Created at</TableHead>
              <TableHead className="w-24 text-right">Progress</TableHead>
              <TableHead className="w-28 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No ERP batches yet.
                </TableCell>
              </TableRow>
            )}
            {items.map((b) => (
              <TableRow
                key={b.batchId}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => router.push(`/finance/erp-integration/${b.batchId}`)}
              >
                <TableCell className="font-mono text-xs">{b.period}</TableCell>
                <TableCell>
                  {b.mode === "SHADOW" ? (
                    <Badge variant="outline" className="border-purple-200 bg-purple-100 text-[10px] text-purple-700">
                      SHADOW
                    </Badge>
                  ) : (
                    <span className="text-xs">{b.mode}</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("px-1.5 py-0 text-[10px]", statusTone(b.status))}>
                    {b.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-xs">{b.seq}</TableCell>
                <TableCell className="text-xs">{b.createdBy || "—"}</TableCell>
                <TableCell className="text-xs">{formatDateTime(b.createdAt)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{b.progress}%</TableCell>
                <TableCell className="text-right">
                  {b.mode === "SHADOW" && onViewReport ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        onViewReport(b)
                      }}
                    >
                      View report
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {total > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing page {page} of {totalPages} ({total} total)
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
