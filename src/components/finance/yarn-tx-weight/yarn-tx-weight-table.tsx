"use client"

import { Fragment, useMemo } from "react"
import { Edit, Trash2 } from "lucide-react"

import { EmptyState } from "@/components/common/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  TX_WEIGHT_GRADES,
  TX_WEIGHT_MODE_OPTIONS,
  formatTxWeightPreview,
  type YarnTxWeightRow,
} from "@/types/finance/yarn-tx-weight"

const COL_COUNT = 6

interface ProductTypeGroup {
  key: string
  productTypeId: number
  code: string
  name: string
  rows: YarnTxWeightRow[]
}

/** Groups rules by product type (sorted by code) and orders grades AE → C inside each group. */
export function groupYarnTxWeights(items: YarnTxWeightRow[]): ProductTypeGroup[] {
  const map = new Map<number, ProductTypeGroup>()
  for (const it of items) {
    let g = map.get(it.productTypeId)
    if (!g) {
      g = {
        key: String(it.productTypeId),
        productTypeId: it.productTypeId,
        code: it.productTypeCode,
        name: it.productTypeName,
        rows: [],
      }
      map.set(it.productTypeId, g)
    }
    g.rows.push(it)
  }
  const gradeIdx = (g: string) => {
    const i = TX_WEIGHT_GRADES.indexOf(g as (typeof TX_WEIGHT_GRADES)[number])
    return i < 0 ? TX_WEIGHT_GRADES.length : i
  }
  const groups = Array.from(map.values())
  groups.forEach((g) => g.rows.sort((a, b) => gradeIdx(a.grade) - gradeIdx(b.grade)))
  return groups.sort((a, b) => a.code.localeCompare(b.code))
}

function modeLabel(mode: YarnTxWeightRow["mode"]) {
  return TX_WEIGHT_MODE_OPTIONS.find((o) => o.value === mode)?.label ?? "—"
}

interface Props {
  items: YarnTxWeightRow[]
  isLoading?: boolean
  canUpdate: boolean
  canDelete: boolean
  onEdit: (row: YarnTxWeightRow) => void
  onDelete: (row: YarnTxWeightRow) => void
}

export function YarnTxWeightTable({ items, isLoading, canUpdate, canDelete, onEdit, onDelete }: Props) {
  const groups = useMemo(() => groupYarnTxWeights(items), [items])
  const showActions = canUpdate || canDelete

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Grade</TableHead>
            <TableHead className="w-32">Mode</TableHead>
            <TableHead className="w-28 text-right">Value</TableHead>
            <TableHead className="w-36">Preview</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-24 text-right">{showActions ? "Actions" : ""}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={COL_COUNT} className="text-center py-8 text-muted-foreground">
                Loading…
              </TableCell>
            </TableRow>
          )}
          {!isLoading && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={COL_COUNT} className="p-0">
                <EmptyState title="No TX weight rules yet. Product types without rules use the ratio fallback." />
              </TableCell>
            </TableRow>
          )}
          {!isLoading &&
            groups.map((g) => {
              const missing = TX_WEIGHT_GRADES.filter((gr) => !g.rows.some((r) => r.grade === gr))
              return (
                <Fragment key={g.key}>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableCell colSpan={COL_COUNT} className="py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold">{g.code || `#${g.productTypeId}`}</span>
                        {g.name && <span className="text-sm text-muted-foreground">{g.name}</span>}
                        {missing.length > 0 && (
                          <Badge variant="outline" className="text-xs font-normal">
                            Fallback ratio: {missing.join(", ")}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {g.rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs font-medium">{r.grade || "—"}</TableCell>
                      <TableCell>{modeLabel(r.mode)}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.value}</TableCell>
                      <TableCell className="font-mono text-xs">{formatTxWeightPreview(r.mode, r.value)}</TableCell>
                      <TableCell>
                        {r.description || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {canUpdate && (
                          <Button size="icon" variant="ghost" onClick={() => onEdit(r)} title="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button size="icon" variant="ghost" onClick={() => onDelete(r)} title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              )
            })}
        </TableBody>
      </Table>
    </div>
  )
}
