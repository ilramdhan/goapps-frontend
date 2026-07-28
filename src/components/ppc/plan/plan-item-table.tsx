"use client"

import { CheckCircle2, Eye, Pencil, Trash2 } from "lucide-react"

import { DataTable, type ColumnDef, type RowAction } from "@/components/shared"
import { StatusBadge } from "@/components/common"

import type { PlanItem } from "@/types/ppc/plan-item"
import { PLAN_ITEM_TYPE_LABELS, PlanItemStatus, planItemStatusToken } from "@/types/ppc/common"

interface PlanItemTableProps {
  data: PlanItem[]
  isLoading?: boolean
  onView: (item: PlanItem) => void
  onEdit: (item: PlanItem) => void
  onConfirm: (item: PlanItem) => void
  onDelete: (item: PlanItem) => void
}

export function PlanItemTable({
  data,
  isLoading,
  onView,
  onEdit,
  onConfirm,
  onDelete,
}: PlanItemTableProps) {
  const columns: ColumnDef<PlanItem>[] = [
    {
      id: "product",
      header: "Product",
      cell: (row) => (
        <div className="min-w-0">
          <div className="font-mono text-sm font-medium">{row.productCode || "-"}</div>
          <div className="max-w-[240px] truncate text-xs text-muted-foreground">
            {row.productName || "-"}
          </div>
        </div>
      ),
    },
    {
      id: "shade",
      header: "Shade",
      hideOnMobile: true,
      cell: (row) =>
        row.shadeCode ? (
          <div className="min-w-0">
            <div className="font-mono text-sm">{row.shadeCode}</div>
            {row.shadeName && (
              <div className="max-w-[160px] truncate text-xs text-muted-foreground">
                {row.shadeName}
              </div>
            )}
          </div>
        ) : (
          "-"
        ),
    },
    {
      id: "type",
      header: "Type",
      cell: (row) => PLAN_ITEM_TYPE_LABELS[row.type] ?? "-",
    },
    {
      id: "qtyTarget",
      header: "Qty Target",
      cellClassName: "tabular-nums",
      cell: (row) => row.qtyTarget || "-",
    },
    {
      id: "deadline",
      header: "Deadline",
      hideOnMobile: true,
      cell: (row) => row.deadline || "-",
    },
    {
      id: "month",
      header: "Month",
      hideOnMobile: true,
      cell: (row) => row.month || "-",
    },
    {
      id: "sequence",
      header: "Seq",
      width: "w-[70px]",
      cellClassName: "tabular-nums",
      cell: (row) => row.sequence || "-",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={planItemStatusToken(row.status)} type="ppcPlan" size="sm" />,
    },
  ]

  const actions: RowAction<PlanItem>[] = [
    {
      id: "view",
      label: "View",
      icon: <Eye className="h-4 w-4" />,
      onClick: onView,
    },
    {
      id: "edit",
      label: "Edit",
      icon: <Pencil className="h-4 w-4" />,
      onClick: onEdit,
    },
    {
      // Confirming moves a DRAFT item into the living monthly plan. Intermediate
      // items cascaded from an FG plan are the same entity in this same table,
      // so they are covered by this action too.
      id: "confirm",
      label: "Confirm",
      icon: <CheckCircle2 className="h-4 w-4" />,
      onClick: onConfirm,
      disabled: (row) => row.status !== PlanItemStatus.PLAN_ITEM_STATUS_DRAFT,
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
      keyField="planItemId"
      actions={actions}
      isLoading={isLoading}
      emptyMessage="No plan items found"
      emptyDescription="Try adjusting your filters, or add a plan item to get started."
    />
  )
}
