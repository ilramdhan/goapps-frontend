"use client"

import { Pencil, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { DataTable, type ColumnDef, type RowAction } from "@/components/shared"

import { type SpinFixedCost, formatPeriod, formatNumeric } from "@/types/finance/spin-fixed-cost"

interface SpinFixedCostTableProps {
  data: SpinFixedCost[]
  isLoading?: boolean
  sortBy?: string
  sortOrder?: "asc" | "desc"
  onSort?: (sortKey: string) => void
  onEdit: (spinFixedCost: SpinFixedCost) => void
  onDelete: (spinFixedCost: SpinFixedCost) => void
}

function NumericCell({ value, digits = 4 }: { value: number | undefined; digits?: number }) {
  const formatted = formatNumeric(value, digits)
  if (formatted === null) return <span className="text-muted-foreground">—</span>
  return <span className="font-mono tabular-nums">{formatted}</span>
}

export function SpinFixedCostTable({
  data,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onEdit,
  onDelete,
}: SpinFixedCostTableProps) {
  const columns: ColumnDef<SpinFixedCost>[] = [
    {
      id: "period",
      header: "Period",
      width: "w-[140px]",
      // Only period / created_at / updated_at exist in the backend sortColumnMap.
      sortKey: "period",
      canHide: false,
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-medium">{formatPeriod(row.period)}</span>
          <span className="font-mono text-xs text-muted-foreground">{row.period || "—"}</span>
        </div>
      ),
    },
    {
      id: "commonPoyDenier",
      header: "Common POY Denier",
      cellClassName: "text-right",
      headerClassName: "text-right",
      cell: (row) => <NumericCell value={row.commonPoyDenier} />,
    },
    {
      id: "poyProduction",
      header: "POY Production",
      cellClassName: "text-right",
      headerClassName: "text-right",
      cell: (row) => <NumericCell value={row.poyProduction} />,
    },
    {
      id: "spinPowerMonth",
      header: "Spin Power / Month",
      hideOnMobile: true,
      cellClassName: "text-right",
      headerClassName: "text-right",
      cell: (row) => <NumericCell value={row.spinPowerMonth} digits={2} />,
    },
    {
      id: "spinManpowerMonth",
      header: "Spin Manpower / Month",
      hideOnMobile: true,
      cellClassName: "text-right",
      headerClassName: "text-right",
      cell: (row) => <NumericCell value={row.spinManpowerMonth} digits={2} />,
    },
    {
      id: "spinOverheadsMonth",
      header: "Spin Overheads / Month",
      hideOnMobile: true,
      cellClassName: "text-right",
      headerClassName: "text-right",
      cell: (row) => <NumericCell value={row.spinOverheadsMonth} digits={2} />,
    },
    {
      id: "spinConssprsMonth",
      header: "Spin Cons. Spares / Month",
      hideOnMobile: true,
      cellClassName: "text-right",
      headerClassName: "text-right",
      cell: (row) => <NumericCell value={row.spinConssprsMonth} digits={2} />,
    },
    {
      id: "isActive",
      header: "Active",
      width: "w-[100px]",
      cell: (row) => (
        <Badge variant={row.isActive ? "default" : "secondary"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ]

  const actions: RowAction<SpinFixedCost>[] = [
    {
      id: "edit",
      label: "Edit",
      icon: <Pencil className="h-4 w-4" />,
      onClick: onEdit,
    },
    {
      id: "delete",
      label: "Delete",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onDelete,
      variant: "destructive",
    },
  ]

  return (
    <DataTable
      data={data}
      columns={columns}
      keyField="id"
      actions={actions}
      isLoading={isLoading}
      tableId="finance-spin-fixed-costs"
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      emptyMessage="No spin fixed costs found"
      emptyDescription="Try adjusting your search or filter criteria"
    />
  )
}
