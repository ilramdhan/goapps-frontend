"use client"

import { Pencil, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { DataTable, type ColumnDef, type RowAction } from "@/components/shared"

import type { ProductPPCConfig } from "@/types/ppc/master"

interface ProductConfigTableProps {
  data: ProductPPCConfig[]
  isLoading?: boolean
  onEdit: (config: ProductPPCConfig) => void
  onDelete: (config: ProductPPCConfig) => void
}

export function ProductConfigTable({ data, isLoading, onEdit, onDelete }: ProductConfigTableProps) {
  const columns: ColumnDef<ProductPPCConfig>[] = [
    {
      id: "productCode",
      header: "Product Code",
      cell: (row) => <span className="font-medium font-mono">{row.productCode || "-"}</span>,
    },
    {
      id: "productName",
      header: "Product Name",
      cell: (row) => row.productName || "-",
    },
    {
      id: "isCommodityWatch",
      header: "Commodity Watch",
      cell: (row) =>
        row.isCommodityWatch ? <Badge variant="default">Watched</Badge> : <span className="text-muted-foreground">-</span>,
    },
    {
      id: "priceSell",
      header: "Sell Price",
      hideOnMobile: true,
      cell: (row) => <span className="font-mono">{row.priceSell || "-"}</span>,
    },
    {
      id: "yieldStd",
      header: "Std Yield",
      hideOnMobile: true,
      cell: (row) => <span className="font-mono">{row.yieldStd || "-"}</span>,
    },
    {
      id: "denier",
      header: "Denier",
      hideOnMobile: true,
      cell: (row) => <span className="font-mono">{row.denier || "-"}</span>,
    },
  ]

  const actions: RowAction<ProductPPCConfig>[] = [
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
      keyField="configId"
      actions={actions}
      isLoading={isLoading}
      emptyMessage="No product configs found"
      emptyDescription="Try adjusting your search or filter criteria"
    />
  )
}
