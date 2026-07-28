"use client"

import { Pencil, Trash2 } from "lucide-react"

import { DataTable, type ColumnDef, type RowAction } from "@/components/shared"

import type { ProductMachineCapacity } from "@/types/ppc/master"

interface CapacityTableProps {
  data: ProductMachineCapacity[]
  isLoading?: boolean
  onEdit: (row: ProductMachineCapacity) => void
  onDelete: (row: ProductMachineCapacity) => void
}

export function CapacityTable({ data, isLoading, onEdit, onDelete }: CapacityTableProps) {
  const columns: ColumnDef<ProductMachineCapacity>[] = [
    {
      id: "cpmProductSysId",
      header: "Product Sys ID",
      cell: (row) => <span className="font-mono">{row.cpmProductSysId || "-"}</span>,
    },
    {
      id: "machineNo",
      header: "Machine",
      cell: (row) => <span className="font-medium font-mono">{row.machineNo || row.machineId || "-"}</span>,
    },
    {
      id: "prodPerDay",
      header: "Prod / Day",
      cell: (row) => <span className="font-mono">{row.prodPerDay || "-"}</span>,
    },
    {
      id: "efficiencyPct",
      header: "Efficiency %",
      cell: (row) => <span className="font-mono">{row.efficiencyPct || "-"}</span>,
    },
  ]

  const actions: RowAction<ProductMachineCapacity>[] = [
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
      keyField="capacityId"
      actions={actions}
      isLoading={isLoading}
      emptyMessage="No capacities found"
      emptyDescription="Try adjusting your filter criteria"
    />
  )
}
