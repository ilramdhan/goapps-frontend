"use client"

import { useMemo } from "react"
import { ArrowRight, Edit, Trash2 } from "lucide-react"

import { StatusBadge } from "@/components/common/status-badge"
import { EmptyState } from "@/components/common/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SortableHeader } from "@/components/shared/data-table/sortable-header"
import { useColumnVisibility } from "@/components/shared/data-table/use-column-visibility"
import type { ColumnDef } from "@/components/shared/data-table/types"
import type { NormalizedMbCrossSectionFactor } from "@/types/finance/mb-cross-section"

export const MB_CROSS_SECTION_FACTOR_TABLE_ID = "finance-mb-cross-section-factor"

const BACKEND_SORTABLE_KEYS = new Set(["from_code", "to_code", "factor", "created_at"])

export const MB_CROSS_SECTION_FACTOR_COLUMNS: ColumnDef<NormalizedMbCrossSectionFactor>[] = [
  { id: "from_code", header: "From", canHide: false },
  { id: "to_code", header: "To", canHide: false },
  { id: "factor", header: "Factor" },
  { id: "operation", header: "Operation" },
  { id: "note", header: "Note" },
  { id: "status", header: "Status" },
]

export function useMbCrossSectionFactorTableColumns() {
  const columns = useMemo(() => MB_CROSS_SECTION_FACTOR_COLUMNS, [])
  const { visibility, toggle, setAll, reset } = useColumnVisibility(
    MB_CROSS_SECTION_FACTOR_TABLE_ID,
    columns
  )
  return { columns, visibility, toggle, setAll, reset }
}

interface Props {
  items: NormalizedMbCrossSectionFactor[]
  isLoading?: boolean
  onEdit: (row: NormalizedMbCrossSectionFactor) => void
  onDelete: (row: NormalizedMbCrossSectionFactor) => void
  sortBy?: string
  sortOrder?: "asc" | "desc"
  onSort: (sortKey: string) => void
  visibility: Record<string, boolean>
}

export function MbCrossSectionFactorTable({
  items,
  isLoading,
  onEdit,
  onDelete,
  sortBy,
  sortOrder,
  onSort,
  visibility,
}: Props) {
  const show = (id: string) => visibility[id] !== false
  const visibleCount = MB_CROSS_SECTION_FACTOR_COLUMNS.filter((c) => show(c.id)).length + 1

  const sortProps = { currentSortBy: sortBy, currentSortOrder: sortOrder, onSort }

  function renderHeader(col: ColumnDef<NormalizedMbCrossSectionFactor>, className?: string) {
    if (BACKEND_SORTABLE_KEYS.has(col.id)) {
      return <SortableHeader key={col.id} label={col.header} sortKey={col.id} className={className} {...sortProps} />
    }
    return (
      <TableHead key={col.id} className={className}>
        {col.header}
      </TableHead>
    )
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {show("from_code") && renderHeader(MB_CROSS_SECTION_FACTOR_COLUMNS[0], "w-24")}
            {show("to_code") && renderHeader(MB_CROSS_SECTION_FACTOR_COLUMNS[1], "w-24")}
            {show("factor") && renderHeader(MB_CROSS_SECTION_FACTOR_COLUMNS[2], "w-32")}
            {show("operation") && renderHeader(MB_CROSS_SECTION_FACTOR_COLUMNS[3], "w-28")}
            {show("note") && renderHeader(MB_CROSS_SECTION_FACTOR_COLUMNS[4])}
            {show("status") && renderHeader(MB_CROSS_SECTION_FACTOR_COLUMNS[5], "w-24")}
            <TableHead className="w-24 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={visibleCount} className="text-center py-8 text-muted-foreground">
                Loading…
              </TableCell>
            </TableRow>
          )}
          {!isLoading && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={visibleCount} className="p-0">
                <EmptyState title="No conversion factors defined yet." />
              </TableCell>
            </TableRow>
          )}
          {items.map((row) => (
            <TableRow key={row.mbcfId}>
              {show("from_code") && (
                <TableCell className="font-mono text-xs">
                  <span className="inline-flex items-center gap-1">
                    {row.fromCode}
                    <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                  </span>
                </TableCell>
              )}
              {show("to_code") && <TableCell className="font-mono text-xs">{row.toCode}</TableCell>}
              {show("factor") && <TableCell className="tabular-nums">{row.factor}</TableCell>}
              {show("operation") && (
                <TableCell>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {row.operation}
                  </Badge>
                </TableCell>
              )}
              {show("note") && (
                <TableCell>{row.note || <span className="text-muted-foreground">—</span>}</TableCell>
              )}
              {show("status") && (
                <TableCell>
                  <StatusBadge status={row.isActive ? "ACTIVE" : "INACTIVE"} type="generic" size="sm" />
                </TableCell>
              )}
              <TableCell className="text-right">
                <Button size="icon" variant="ghost" onClick={() => onEdit(row)} title="Edit">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => onDelete(row)} title="Delete">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
