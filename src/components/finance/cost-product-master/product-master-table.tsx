"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Copy, Edit, Eye, Package, Power } from "lucide-react"

import { ProductTypeName } from "@/components/common/product-type-name"
import { EmptyState } from "@/components/common/empty-state"
import { StatusBadge } from "@/components/common/status-badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { SortableHeader } from "@/components/shared/data-table/sortable-header"
import { useColumnVisibility } from "@/components/shared/data-table/use-column-visibility"
import type { ColumnDef } from "@/components/shared/data-table/types"
import type { CostProductMaster } from "@/types/finance/cost-product-master"

export const PRODUCT_MASTER_TABLE_ID = "finance-product-master"

// Column ids double as backend sort keys (proto ListCostProductMastersRequest sort_by values).
export const PRODUCT_MASTER_COLUMNS: ColumnDef<CostProductMaster>[] = [
  { id: "product_code",      header: "Product code",     canHide: false },
  { id: "product_name",      header: "Name" },
  { id: "product_type_code", header: "Type" },
  { id: "shade_code",        header: "Shade Code" },
  // Not sortable: the backend's cpmSortColumn map (cost_product_master_repository.go)
  // has no "shade_name" case, so a sort_by=shade_name would silently fall through
  // to sorting by product_code instead. Keep this column display-only until the
  // backend adds support.
  { id: "shade_name",        header: "Shade Name" },
  { id: "grade_code",        header: "Grade" },
  { id: "oracle_sys_id",     header: "Oracle Sys ID" },
  { id: "erp_compound_key",  header: "ERP Compound Key" },
  { id: "status",            header: "Status" },
]

/** Page-level hook so the visibility toggle can live in the filter toolbar. */
export function useProductMasterTableColumns() {
  const columns = useMemo(() => PRODUCT_MASTER_COLUMNS, [])
  const { visibility, toggle, setAll, reset } = useColumnVisibility(PRODUCT_MASTER_TABLE_ID, columns)
  return { columns, visibility, toggle, setAll, reset }
}

interface Props {
  items: CostProductMaster[]
  isLoading?: boolean
  onEdit: (p: CostProductMaster) => void
  onDeactivate: (p: CostProductMaster) => void
  onView: (p: CostProductMaster) => void
  onDuplicate: (p: CostProductMaster) => void
  sortBy?: string
  sortOrder?: "asc" | "desc"
  onSort: (sortKey: string) => void
  visibility: Record<string, boolean>
  /** When provided, renders a leading checkbox column for multi-select bulk actions. */
  selectedIds?: Set<number>
  onToggleSelect?: (id: number) => void
  onToggleSelectAll?: () => void
}

export function ProductMasterTable({
  items,
  isLoading,
  onEdit,
  onDeactivate,
  onView,
  onDuplicate,
  sortBy,
  sortOrder,
  onSort,
  visibility,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: Props) {
  const show = (id: string) => visibility[id] !== false
  const selectable = !!selectedIds && !!onToggleSelect && !!onToggleSelectAll
  const visibleCount =
    PRODUCT_MASTER_COLUMNS.filter((c) => show(c.id)).length + 1 + (selectable ? 1 : 0) // +1 actions, +1 checkbox
  const selectableItems = items // all rows on the page are selectable
  const allSelected = selectable && selectableItems.length > 0 && selectableItems.every((p) => selectedIds!.has(p.productSysId))
  const someSelected = selectable && selectableItems.some((p) => selectedIds!.has(p.productSysId)) && !allSelected

  const sortProps = { currentSortBy: sortBy, currentSortOrder: sortOrder, onSort }

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
                    onCheckedChange={() => onToggleSelectAll!()}
                    aria-label="Select all products on this page"
                  />
                </TableHead>
              )}
              {show("product_code") && (
                <SortableHeader label="Product code" sortKey="product_code" className="w-44 pl-4" {...sortProps} />
              )}
              {show("product_name") && (
                <SortableHeader label="Name" sortKey="product_name" {...sortProps} />
              )}
              {show("product_type_code") && (
                <SortableHeader label="Type" sortKey="product_type_code" className="w-32" {...sortProps} />
              )}
              {show("shade_code") && (
                <SortableHeader label="Shade Code" sortKey="shade_code" className="w-24" {...sortProps} />
              )}
              {show("shade_name") && (
                <TableHead className="w-32 text-xs font-medium text-muted-foreground">Shade Name</TableHead>
              )}
              {show("grade_code") && (
                <SortableHeader label="Grade" sortKey="grade_code" className="w-20" {...sortProps} />
              )}
              {show("oracle_sys_id") && (
                <SortableHeader label="Oracle Sys ID" sortKey="oracle_sys_id" className="w-28" {...sortProps} />
              )}
              {show("erp_compound_key") && (
                <SortableHeader label="ERP Compound Key" sortKey="erp_compound_key" className="w-36" {...sortProps} />
              )}
              {show("status") && (
                <SortableHeader label="Status" sortKey="status" className="w-24" {...sortProps} />
              )}
              <TableHead className="w-36 pr-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {selectable && <TableCell className="pl-4"><Skeleton className="h-4 w-4" /></TableCell>}
                  {show("product_code") && <TableCell className={selectable ? "" : "pl-4"}><Skeleton className="h-4 w-32" /></TableCell>}
                  {show("product_name") && <TableCell><Skeleton className="h-4 w-48" /></TableCell>}
                  {show("product_type_code") && <TableCell><Skeleton className="h-4 w-16" /></TableCell>}
                  {show("shade_code") && <TableCell><Skeleton className="h-4 w-14" /></TableCell>}
                  {show("shade_name") && <TableCell><Skeleton className="h-4 w-20" /></TableCell>}
                  {show("grade_code") && <TableCell><Skeleton className="h-4 w-10" /></TableCell>}
                  {show("oracle_sys_id") && <TableCell><Skeleton className="h-4 w-20" /></TableCell>}
                  {show("erp_compound_key") && <TableCell><Skeleton className="h-4 w-28" /></TableCell>}
                  {show("status") && <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>}
                  <TableCell className="pr-4" />
                </TableRow>
              ))}
            {!isLoading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={visibleCount} className="p-0">
                  <EmptyState
                    icon={Package}
                    title="No products found"
                    description="Try adjusting your search or filters."
                    className="border-0 rounded-none"
                  />
                </TableCell>
              </TableRow>
            )}
            {items.map((p) => (
              <TableRow key={p.productSysId} className="relative cursor-pointer hover:bg-muted/50">
                {selectable && (
                  <TableCell className="relative z-10 pl-4" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds!.has(p.productSysId)}
                      onCheckedChange={() => onToggleSelect!(p.productSysId)}
                      aria-label={`Select ${p.productCode}`}
                    />
                  </TableCell>
                )}
                {show("product_code") && (
                  <TableCell className={selectable ? "font-mono text-xs" : "pl-4 font-mono text-xs"}>
                    <Link href={`/finance/product-master/${p.productSysId}`} className="absolute inset-0">
                      <span className="sr-only">View {p.productCode}</span>
                    </Link>
                    {p.productCode}
                  </TableCell>
                )}
                {show("product_name") && <TableCell>{p.productName}</TableCell>}
                {show("product_type_code") && (
                  <TableCell className="text-xs">
                    {p.productTypeCode ? (
                      <span className="font-mono">{p.productTypeCode}</span>
                    ) : (
                      <ProductTypeName id={p.productTypeId} />
                    )}
                  </TableCell>
                )}
                {show("shade_code") && <TableCell>{p.shadeCode || "—"}</TableCell>}
                {show("shade_name") && <TableCell>{p.shadeName || "—"}</TableCell>}
                {show("grade_code") && <TableCell>{p.gradeCode}</TableCell>}
                {show("oracle_sys_id") && (
                  <TableCell className="font-mono text-xs">{p.flex02 || "—"}</TableCell>
                )}
                {show("erp_compound_key") && (
                  <TableCell className="font-mono text-xs">{p.flex01 || "—"}</TableCell>
                )}
                {show("status") && (
                  <TableCell>
                    <StatusBadge status={p.isActive ? "ACTIVE" : "INACTIVE"} type="product" size="sm" />
                  </TableCell>
                )}
                <TableCell
                  className="relative z-10 pr-4 text-right space-x-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button size="icon" variant="ghost" onClick={() => onView(p)} title="View">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => onEdit(p)} disabled={!p.isActive} title="Edit">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => onDuplicate(p)} title="Duplicate">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onDeactivate(p)}
                    disabled={!p.isActive}
                    title="Deactivate"
                  >
                    <Power className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
