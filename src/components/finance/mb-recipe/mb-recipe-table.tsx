"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Beaker } from "lucide-react"

import { EmptyState } from "@/components/common/empty-state"
import { StatusBadge } from "@/components/common/status-badge"
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
  { id: "dev_code", header: "Dev Code", canHide: false },
  { id: "shade_code", header: "Shade Code" },
  { id: "shade_name", header: "Shade Name" },
  { id: "mbh_mgt_name", header: "Mgt Name", defaultHidden: true },
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
}

export function MbRecipeTable({ items, isLoading, sortBy, sortOrder, onSort, visibility }: Props) {
  const show = (id: string) => visibility[id] !== false
  const visibleCount = MB_RECIPE_COLUMNS.filter((c) => show(c.id)).length

  const sortProps = { currentSortBy: sortBy, currentSortOrder: sortOrder, onSort }

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
              {show("dev_code") && renderHeader(MB_RECIPE_COLUMNS[0], "w-32 pl-4")}
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
                  {show("dev_code") && <TableCell className="pl-4"><Skeleton className="h-4 w-24" /></TableCell>}
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
                {show("dev_code") && (
                  <TableCell className="pl-4 font-mono text-xs">
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
