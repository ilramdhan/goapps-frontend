"use client"

import { useMemo } from "react"
import { Edit, Trash2 } from "lucide-react"

import { StatusBadge } from "@/components/common/status-badge"
import { EmptyState } from "@/components/common/empty-state"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SortableHeader } from "@/components/shared/data-table/sortable-header"
import { useColumnVisibility } from "@/components/shared/data-table/use-column-visibility"
import type { ColumnDef } from "@/components/shared/data-table/types"
import type { NormalizedMbCrossSection } from "@/types/finance/mb-cross-section"

export const MB_CROSS_SECTION_TABLE_ID = "finance-mb-cross-section"

const BACKEND_SORTABLE_KEYS = new Set(["code", "display_name", "display_order", "created_at"])

export const MB_CROSS_SECTION_COLUMNS: ColumnDef<NormalizedMbCrossSection>[] = [
  { id: "code", header: "Code", canHide: false },
  { id: "display_name", header: "Display Name" },
  { id: "description", header: "Description" },
  { id: "display_order", header: "Order" },
  { id: "status", header: "Status" },
]

/** Page-level hook so the visibility toggle can live in the filter toolbar. */
export function useMbCrossSectionTableColumns() {
  const columns = useMemo(() => MB_CROSS_SECTION_COLUMNS, [])
  const { visibility, toggle, setAll, reset } = useColumnVisibility(MB_CROSS_SECTION_TABLE_ID, columns)
  return { columns, visibility, toggle, setAll, reset }
}

interface Props {
  items: NormalizedMbCrossSection[]
  isLoading?: boolean
  onEdit: (row: NormalizedMbCrossSection) => void
  onDelete: (row: NormalizedMbCrossSection) => void
  sortBy?: string
  sortOrder?: "asc" | "desc"
  onSort: (sortKey: string) => void
  visibility: Record<string, boolean>
}

export function MbCrossSectionTable({
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
  const visibleCount = MB_CROSS_SECTION_COLUMNS.filter((c) => show(c.id)).length + 1

  const sortProps = { currentSortBy: sortBy, currentSortOrder: sortOrder, onSort }

  function renderHeader(col: ColumnDef<NormalizedMbCrossSection>, className?: string) {
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
            {show("code") && renderHeader(MB_CROSS_SECTION_COLUMNS[0], "w-28")}
            {show("display_name") && renderHeader(MB_CROSS_SECTION_COLUMNS[1])}
            {show("description") && renderHeader(MB_CROSS_SECTION_COLUMNS[2])}
            {show("display_order") && renderHeader(MB_CROSS_SECTION_COLUMNS[3], "w-24")}
            {show("status") && renderHeader(MB_CROSS_SECTION_COLUMNS[4], "w-24")}
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
                <EmptyState title="No MB cross section entries yet." />
              </TableCell>
            </TableRow>
          )}
          {items.map((row) => (
            <TableRow key={row.mbcsId}>
              {/* Code is rendered verbatim — RSD included; no label is invented. */}
              {show("code") && <TableCell className="font-mono text-xs">{row.code}</TableCell>}
              {show("display_name") && (
                <TableCell>{row.displayName || <span className="text-muted-foreground">—</span>}</TableCell>
              )}
              {show("description") && (
                <TableCell>{row.description || <span className="text-muted-foreground">—</span>}</TableCell>
              )}
              {show("display_order") && <TableCell>{row.displayOrder}</TableCell>}
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
