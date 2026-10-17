"use client"

// Extracted verbatim from cost-breakdown-modal.tsx (P11 [G.6]).
// Pure extraction — the props signature is unchanged.

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { CostRmDetail } from "@/types/finance/cost-calc"

import { formatNumeric } from "../format"

// ── RM breakdown tab ──────────────────────────────────────────────────────────

export function RmTab({ rows }: { rows: CostRmDetail[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No RM data.</p>
  }
  const showDenier = rows.some((r) => !!r.ratioSource)
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Type</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Shade</TableHead>
            <TableHead className="w-20 text-right">Level</TableHead>
            <TableHead className="text-right">Unit cost</TableHead>
            {showDenier && <TableHead className="text-right">Denier</TableHead>}
            {showDenier && <TableHead>Ratio Src</TableHead>}
            <TableHead className="text-right">Ratio</TableHead>
            <TableHead className="text-right">Contribution</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={`${r.rmType}-${r.refCode}-${i}`}>
              <TableCell>
                <Badge variant="outline" className="font-mono text-xs font-normal">
                  {r.rmType}
                </Badge>
              </TableCell>
              <TableCell>
                <p className="font-mono text-xs text-muted-foreground">{r.refCode}</p>
                <p className="text-sm">{r.refLabel || "—"}</p>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {r.shadeCode || "—"}
              </TableCell>
              <TableCell className="text-right font-mono text-xs text-muted-foreground">
                {r.routeLevel || "—"}
              </TableCell>
              <TableCell className="text-right font-mono text-sm tabular-nums">
                {formatNumeric(r.unitCost)}
              </TableCell>
              {showDenier && (
                <TableCell className="text-right font-mono text-sm tabular-nums">
                  {r.ratioSource ? formatNumeric(r.denier) : "—"}
                  {r.denierSource === "OVERRIDE" && (
                    <Badge
                      variant="outline"
                      className="ml-1 font-mono text-[10px] font-normal"
                      title="Denier di-override khusus product ini"
                      data-testid="denier-override-badge"
                    >
                      OVERRIDE
                    </Badge>
                  )}
                </TableCell>
              )}
              {showDenier && (
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {r.ratioSource || "—"}
                </TableCell>
              )}
              <TableCell className="text-right font-mono text-sm tabular-nums">
                {formatNumeric(r.ratio)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm font-semibold tabular-nums">
                {formatNumeric(r.contribution)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
