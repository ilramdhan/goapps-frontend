"use client"

// Extracted verbatim from cost-breakdown-modal.tsx (P11 [G.6]).
// Pure extraction — the props signature is unchanged.

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { LevelBreakdown } from "@/types/finance/cost-calc"

import { formatNumeric } from "../format"

// ── By level tab ──────────────────────────────────────────────────────────────

export function ByLevelTab({ rows }: { rows: LevelBreakdown[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No level data.</p>
  }
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Level</TableHead>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Cost contribution</TableHead>
            <TableHead className="w-28 text-right">Ratio</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={`${r.level}-${r.productSysId}-${i}`}>
              <TableCell className="font-mono text-sm font-medium">{r.level}</TableCell>
              <TableCell>
                <p className="font-mono text-xs text-muted-foreground">{r.productCode}</p>
                <p className="text-sm">{r.productName}</p>
              </TableCell>
              <TableCell className="text-right font-mono text-sm tabular-nums">
                {formatNumeric(r.costContribution)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm tabular-nums">
                {formatNumeric(r.ratio)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
