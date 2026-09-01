"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Beaker } from "lucide-react"

import { EmptyState } from "@/components/common/empty-state"
import { StatusBadge } from "@/components/common/status-badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { SortableHeader } from "@/components/shared/data-table/sortable-header"
import { useColumnVisibility } from "@/components/shared/data-table/use-column-visibility"
import type { ColumnDef } from "@/components/shared/data-table/types"
import type { MBHead } from "@/types/finance/mb-head"

export const MB_RECIPE_TABLE_ID = "finance-mb-recipe"

// Backend sort keys actually accepted by ListMBHeadsRequest.sort_by (buf.validate `in:` list).
// Only columns whose id is in this set get a clickable SortableHeader — every other column
// renders as a plain, non-sortable TableHead so clicking it can't silently mis-sort the list
// (the repository falls back to mbh_mb_costing for any unrecognized sort key without erroring).
const BACKEND_SORTABLE_KEYS = new Set(["mbh_mb_costing", "mbh_mgt_name", "mbh_denier", "created_at"])

// Column ids double as backend sort keys (proto ListMBHeadsRequest sort_by values) where supported.
export const MB_RECIPE_COLUMNS: ColumnDef<MBHead>[] = [
  { id: "dev_code", header: "Dev No", canHide: false },
  { id: "shade_code", header: "Shade Code" },
  { id: "shade_name", header: "Shade Name" },
  { id: "mbh_mgt_name", header: "MB Name", defaultHidden: true },
  { id: "mbh_denier", header: "Denier", defaultHidden: true },
  { id: "mbh_status", header: "Status", defaultHidden: true },
  { id: "mbh_final_product", header: "Final Product", defaultHidden: true },
  { id: "mbh_cross_section", header: "Cross Section", defaultHidden: true },
  { id: "mbh_lusture_code", header: "Lusture", defaultHidden: true },
  { id: "is_boughtout", header: "Bought-out", defaultHidden: true },
  { id: "entry_status", header: "Entry Status" },
  { id: "current_version", header: "Version" },
]

/** Page-level hook so the visibility toggle can live in the filter toolbar. */
export function useMbRecipeTableColumns() {
  const columns = useMemo(() => MB_RECIPE_COLUMNS, [])
  const { visibility, toggle, setAll, reset } = useColumnVisibility(MB_RECIPE_TABLE_ID, columns)
  return { columns, visibility, toggle, setAll, reset }
}

interface Props {
  items: MBHead[]
  isLoading?: boolean
  sortBy?: string
  sortOrder?: "asc" | "desc"
  onSort: (sortKey: string) => void
  visibility: Record<string, boolean>
  /**
   * Bulk-selection state, keyed by `mbhId`. Both props are optional — omitting
   * them (e.g. any other future caller of this table) simply hides the
   * checkbox column entirely, so this is additive and does not change the
   * table's behavior for callers that don't opt in.
   */
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
}

export function MbRecipeTable({
  items,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  visibility,
  selectedIds,
  onSelectionChange,
}: Props) {
  const show = (id: string) => visibility[id] !== false
  const selectable = selectedIds !== undefined && onSelectionChange !== undefined
  const visibleCount = MB_RECIPE_COLUMNS.filter((c) => show(c.id)).length + (selectable ? 1 : 0)

  const sortProps = { currentSortBy: sortBy, currentSortOrder: sortOrder, onSort }

  const selectedCount = items.filter((mb) => selectedIds?.has(mb.mbhId)).length
  const allSelected = items.length > 0 && selectedCount === items.length
  const someSelected = selectedCount > 0 && !allSelected

  function toggleAll(checked: boolean) {
    if (!onSelectionChange || !selectedIds) return
    const next = new Set(selectedIds)
    if (checked) {
      items.forEach((mb) => next.add(mb.mbhId))
    } else {
      items.forEach((mb) => next.delete(mb.mbhId))
    }
    onSelectionChange(next)
  }

  function toggleRow(mbhId: string, checked: boolean) {
    if (!onSelectionChange || !selectedIds) return
    const next = new Set(selectedIds)
    if (checked) next.add(mbhId)
    else next.delete(mbhId)
    onSelectionChange(next)
  }

  function renderHeader(col: ColumnDef<MBHead>, className?: string) {
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
    <div className="rounded-md border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-10 pl-4">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={(checked) => toggleAll(checked === true)}
                    disabled={items.length === 0}
                    aria-label="Select all rows"
                  />
                </TableHead>
              )}
              {show("dev_code") && renderHeader(MB_RECIPE_COLUMNS[0], selectable ? "w-32" : "w-32 pl-4")}
              {show("shade_code") && renderHeader(MB_RECIPE_COLUMNS[1], "w-28")}
              {show("shade_name") && renderHeader(MB_RECIPE_COLUMNS[2])}
              {show("mbh_mgt_name") && renderHeader(MB_RECIPE_COLUMNS[3])}
              {show("mbh_denier") && renderHeader(MB_RECIPE_COLUMNS[4], "w-24")}
              {show("mbh_status") && renderHeader(MB_RECIPE_COLUMNS[5], "w-28")}
              {show("mbh_final_product") && renderHeader(MB_RECIPE_COLUMNS[6])}
              {show("mbh_cross_section") && renderHeader(MB_RECIPE_COLUMNS[7])}
              {show("mbh_lusture_code") && renderHeader(MB_RECIPE_COLUMNS[8], "w-24")}
              {show("is_boughtout") && renderHeader(MB_RECIPE_COLUMNS[9], "w-28")}
              {show("entry_status") && renderHeader(MB_RECIPE_COLUMNS[10], "w-32")}
              {show("current_version") && renderHeader(MB_RECIPE_COLUMNS[11], "w-24 pr-4")}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {selectable && <TableCell className="pl-4"><Skeleton className="h-4 w-4" /></TableCell>}
                  {show("dev_code") && (
                    <TableCell className={selectable ? undefined : "pl-4"}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  )}
                  {show("shade_code") && <TableCell><Skeleton className="h-4 w-20" /></TableCell>}
                  {show("shade_name") && <TableCell><Skeleton className="h-4 w-40" /></TableCell>}
                  {show("mbh_mgt_name") && <TableCell><Skeleton className="h-4 w-32" /></TableCell>}
                  {show("mbh_denier") && <TableCell><Skeleton className="h-4 w-12" /></TableCell>}
                  {show("mbh_status") && <TableCell><Skeleton className="h-4 w-20" /></TableCell>}
                  {show("mbh_final_product") && <TableCell><Skeleton className="h-4 w-28" /></TableCell>}
                  {show("mbh_cross_section") && <TableCell><Skeleton className="h-4 w-20" /></TableCell>}
                  {show("mbh_lusture_code") && <TableCell><Skeleton className="h-4 w-16" /></TableCell>}
                  {show("is_boughtout") && <TableCell><Skeleton className="h-4 w-12" /></TableCell>}
                  {show("entry_status") && <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>}
                  {show("current_version") && <TableCell className="pr-4"><Skeleton className="h-4 w-8" /></TableCell>}
                </TableRow>
              ))}
            {!isLoading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={visibleCount} className="p-0">
                  <EmptyState
                    icon={Beaker}
                    title="No MB recipes found"
                    description="Try adjusting your search or filters."
                    className="border-0 rounded-none"
                  />
                </TableCell>
              </TableRow>
            )}
            {items.map((mb) => (
              <TableRow key={mb.mbhId} className="relative cursor-pointer hover:bg-muted/50">
                {selectable && (
                  // ⚠ The row-navigation Link below lives inside the dev_code cell but is
                  // `absolute inset-0` against the TableRow's `relative` (the row is the
                  // positioned ancestor, not the cell) — so it visually covers the WHOLE
                  // row, not just that one cell, and (being later in DOM order) paints on
                  // top of any other z-index:auto sibling. `relative z-10` here lifts this
                  // cell into its own stacking context above that overlay so the checkbox
                  // stays clickable instead of triggering navigation.
                  <TableCell className="relative z-10 pl-4">
                    <Checkbox
                      checked={selectedIds?.has(mb.mbhId) ?? false}
                      onCheckedChange={(checked) => toggleRow(mb.mbhId, checked === true)}
                      aria-label={`Select ${mb.devCode || mb.mbhId}`}
                    />
                  </TableCell>
                )}
                {show("dev_code") && (
                  <TableCell className={selectable ? "font-mono text-xs" : "pl-4 font-mono text-xs"}>
                    <Link href={`/finance/mb-recipe/${mb.mbhId}`} className="absolute inset-0">
                      <span className="sr-only">View {mb.devCode}</span>
                    </Link>
                    {mb.devCode || "—"}
                  </TableCell>
                )}
                {show("shade_code") && <TableCell className="font-mono text-xs">{mb.shadeCode || "—"}</TableCell>}
                {show("shade_name") && <TableCell>{mb.shadeName || "—"}</TableCell>}
                {show("mbh_mgt_name") && <TableCell>{mb.mbhMgtName || "—"}</TableCell>}
                {show("mbh_denier") && <TableCell>{mb.mbhDenier ?? "—"}</TableCell>}
                {show("mbh_status") && <TableCell>{mb.mbhStatus || "—"}</TableCell>}
                {show("mbh_final_product") && <TableCell>{mb.mbhFinalProduct || "—"}</TableCell>}
                {show("mbh_cross_section") && <TableCell>{mb.crossSection || "—"}</TableCell>}
                {show("mbh_lusture_code") && <TableCell className="font-mono text-xs">{mb.lustureCode || "—"}</TableCell>}
                {show("is_boughtout") && <TableCell>{mb.isBoughtout ? "Yes" : "No"}</TableCell>}
                {show("entry_status") && (
                  <TableCell>
                    <StatusBadge status={mb.entryStatus} type="mbhead" size="sm" />
                  </TableCell>
                )}
                {show("current_version") && (
                  <TableCell className="pr-4 text-sm">{mb.currentVersion}</TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
