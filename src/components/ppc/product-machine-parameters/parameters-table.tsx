"use client"

import { Pencil, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { DataTable, type ColumnDef, type RowAction } from "@/components/shared"

import type { ProductMachineParameter } from "@/types/ppc/master"

interface ParametersTableProps {
  data: ProductMachineParameter[]
  isLoading?: boolean
  onEdit: (row: ProductMachineParameter) => void
  onDelete: (row: ProductMachineParameter) => void
}

function renderValue(row: ProductMachineParameter): string {
  switch (row.dataType) {
    case "BOOLEAN":
      return row.valueFlag ? "Yes" : "No"
    case "TEXT":
      return row.valueText || "-"
    case "NUMBER":
      return row.valueNum || "-"
    default:
      return row.valueText || row.valueNum || (row.valueFlag ? "Yes" : "-")
  }
}

export function ParametersTable({ data, isLoading, onEdit, onDelete }: ParametersTableProps) {
  const columns: ColumnDef<ProductMachineParameter>[] = [
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
      id: "paramName",
      header: "Parameter",
      cell: (row) => (
        <div className="flex flex-col">
          <span>{row.paramName || "-"}</span>
          {row.paramCode ? (
            <span className="text-xs font-mono text-muted-foreground">{row.paramCode}</span>
          ) : null}
        </div>
      ),
    },
    {
      id: "dataType",
      header: "Type",
      cell: (row) => <Badge variant="outline">{row.dataType || "-"}</Badge>,
    },
    {
      id: "value",
      header: "Value",
      cell: (row) => <span className="font-mono">{renderValue(row)}</span>,
    },
  ]

  const actions: RowAction<ProductMachineParameter>[] = [
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
      keyField="pmpId"
      actions={actions}
      isLoading={isLoading}
      emptyMessage="No parameters found"
      emptyDescription="Try adjusting your filter criteria"
    />
  )
}
