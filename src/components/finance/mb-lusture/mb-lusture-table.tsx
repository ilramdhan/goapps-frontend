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
import type { MbLusture } from "@/types/finance/mb-lusture"

export const MB_LUSTURE_TABLE_ID = "finance-mb-lusture"

const BACKEND_SORTABLE_KEYS = new Set(["code", "display_name", "category", "created_at"])

export const MB_LUSTURE_COLUMNS: ColumnDef<MbLusture>[] = [
  { id: "code", header: "Code", canHide: false },
  { id: "display_name", header: "Display Name" },
  { id: "category", header: "Category" },
  { id: "status", header: "Status" },
]

/** Page-level hook so the visibility toggle can live in the filter toolbar. */
export function useMbLustureTableColumns() {
  const columns = useMemo(() => MB_LUSTURE_COLUMNS, [])
  const { visibility, toggle, setAll, reset } = useColumnVisibility(MB_LUSTURE_TABLE_ID, columns)
  return { columns, visibility, toggle, setAll, reset }
}

interface Props {
  items: MbLusture[]
  isLoading?: boolean
  onEdit: (l: MbLusture) => void
  onDelete: (l: MbLusture) => void
  sortBy?: string
  sortOrder?: "asc" | "desc"
  onSort: (sortKey: string) => void
  visibility: Record<string, boolean>
}

export function MbLustureTable({ items, isLoading, onEdit, onDelete, sortBy, sortOrder, onSort, visibility }: Props) {
  const show = (id: string) => visibility[id] !== false
  const visibleCount = MB_LUSTURE_COLUMNS.filter((c) => show(c.id)).length + 1

  const sortProps = { currentSortBy: sortBy, currentSortOrder: sortOrder, onSort }

  function renderHeader(col: ColumnDef<MbLusture>, className?: string) {
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
            {show("code") && renderHeader(MB_LUSTURE_COLUMNS[0], "w-28")}
            {show("display_name") && renderHeader(MB_LUSTURE_COLUMNS[1])}
            {show("category") && renderHeader(MB_LUSTURE_COLUMNS[2])}
            {show("status") && renderHeader(MB_LUSTURE_COLUMNS[3], "w-24")}
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
                <EmptyState title="No MB lusture entries yet." />
              </TableCell>
            </TableRow>
          )}
          {items.map((l) => (
            <TableRow key={l.mblId}>
              {show("code") && <TableCell className="font-mono text-xs">{l.code}</TableCell>}
              {show("display_name") && <TableCell>{l.displayName}</TableCell>}
              {show("category") && (
                <TableCell>{l.category || <span className="text-muted-foreground">—</span>}</TableCell>
              )}
              {show("status") && (
                <TableCell>
                  <StatusBadge status={l.isActive ? "ACTIVE" : "INACTIVE"} type="generic" size="sm" />
                </TableCell>
              )}
              <TableCell className="text-right">
                <Button size="icon" variant="ghost" onClick={() => onEdit(l)} title="Edit">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => onDelete(l)} title="Delete">
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
