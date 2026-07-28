"use client"

import Link from "next/link"
import { Eye, Pencil, Trash2 } from "lucide-react"

import { DataTable, type ColumnDef, type RowAction } from "@/components/shared"
import { StatusBadge } from "@/components/common"
import { Button } from "@/components/ui/button"

import type { WorkOrder } from "@/types/ppc/work-order"
import { WOStatus, PROD_CATEGORY_LABELS, woStatusToken } from "@/types/ppc/common"

interface WorkOrderTableProps {
  data: WorkOrder[]
  isLoading?: boolean
  onEdit: (wo: WorkOrder) => void
  onDelete: (wo: WorkOrder) => void
}

export function WorkOrderTable({ data, isLoading, onEdit, onDelete }: WorkOrderTableProps) {
  const columns: ColumnDef<WorkOrder>[] = [
    {
      id: "woNo",
      header: "WO No",
      width: "w-[140px]",
      cell: (row) => (
        <Link
          href={`/production-plan/work-orders/${row.woId}`}
          className="font-mono font-medium text-primary hover:underline"
        >
          {row.woNo || "-"}
        </Link>
      ),
    },
    {
      id: "product",
      header: "Product",
      cell: (row) => (
        <div className="min-w-0">
          <div className="font-mono text-xs text-muted-foreground">{row.cpmProductCode || "-"}</div>
          <div className="truncate">{row.cpmProductName || "-"}</div>
        </div>
      ),
    },
    {
      id: "machineNo",
      header: "Machine",
      cell: (row) => row.machineNo || "-",
    },
    {
      id: "lotNo",
      header: "Lot",
      cell: (row) => <span className="font-mono">{row.lotNo || "-"}</span>,
    },
    {
      id: "qtyTarget",
      header: "Target Qty",
      cell: (row) => row.qtyTarget || "-",
    },
    {
      id: "deadline",
      header: "Deadline",
      hideOnMobile: true,
      cell: (row) => row.deadline || "-",
    },
    {
      id: "prodCategory",
      header: "Category",
      hideOnMobile: true,
      cell: (row) => PROD_CATEGORY_LABELS[row.prodCategory] ?? "Normal",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={woStatusToken(row.status)} type="ppcWo" size="sm" />,
    },
    {
      id: "view",
      header: "",
      width: "w-[60px]",
      cell: (row) => (
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href={`/production-plan/work-orders/${row.woId}`}>
            <Eye className="h-4 w-4" />
            <span className="sr-only">View</span>
          </Link>
        </Button>
      ),
    },
  ]

  const actions: RowAction<WorkOrder>[] = [
    {
      id: "edit",
      label: "Edit",
      icon: <Pencil className="h-4 w-4" />,
      onClick: onEdit,
      disabled: (row) => row.status !== WOStatus.WO_STATUS_DRAFT,
    },
    {
      id: "delete",
      label: "Delete",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onDelete,
      variant: "destructive",
      disabled: (row) => row.status !== WOStatus.WO_STATUS_DRAFT,
    },
  ]

  return (
    <DataTable
      data={data}
      columns={columns}
      keyField="woId"
      actions={actions}
      isLoading={isLoading}
      emptyMessage="No work orders found"
      emptyDescription="Try adjusting your search or filter criteria"
    />
  )
}
