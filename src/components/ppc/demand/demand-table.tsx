"use client"

import { Eye, Pencil, Trash2, CheckCircle2, Link2 } from "lucide-react"

import { DataTable, type ColumnDef, type RowAction } from "@/components/shared"
import { StatusBadge } from "@/components/common"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import type { Demand } from "@/types/ppc/demand"
import {
  DemandStatus,
  DEMAND_TYPE_LABELS,
  demandStatusToken,
  productLinkReasonLabel,
} from "@/types/ppc/common"

interface DemandTableProps {
  data: Demand[]
  isLoading?: boolean
  onView: (demand: Demand) => void
  onEdit: (demand: Demand) => void
  onConfirm: (demand: Demand) => void
  onMapProduct: (demand: Demand) => void
  onDelete: (demand: Demand) => void
}

function fmtQty(value: string): string {
  const n = Number(value)
  return Number.isFinite(n) ? n.toLocaleString() : value || "-"
}

function fmtDate(value: string): string {
  return value ? value.slice(0, 10) : "-"
}

export function DemandTable({
  data,
  isLoading,
  onView,
  onEdit,
  onConfirm,
  onMapProduct,
  onDelete,
}: DemandTableProps) {
  const columns: ColumnDef<Demand>[] = [
    {
      id: "product",
      header: "Product",
      // Whether a product is linked is decided by cpmProductSysId, not by the
      // labels: those live in finance and are decorated onto the row over gRPC,
      // so they come back blank whenever that lookup degrades. Keying "Not
      // mapped" off the labels reported a linked demand as unlinked every time
      // finance was unreachable.
      cell: (row) =>
        row.cpmProductSysId ? (
          <div className="min-w-0">
            <div className="font-medium font-mono">{row.productCode || "-"}</div>
            <div className="max-w-[220px] truncate text-xs text-muted-foreground">
              {row.productName || (
                <span className="italic">Product name unavailable</span>
              )}
            </div>
          </div>
        ) : (
          // Unlinked: name the row by the Orion item code it was pulled from
          // rather than a bare dash, say why it is unlinked, and offer the fix
          // in one click. A manually-created demand has no Orion code, so it
          // falls back to the plain unlinked label.
          <div className="min-w-0 space-y-0.5">
            {row.orionItemCode ? (
              <div className="font-mono text-sm">{row.orionItemCode}</div>
            ) : (
              <div className="text-xs italic text-muted-foreground">Not mapped</div>
            )}
            <button
              type="button"
              onClick={() => onMapProduct(row)}
              className="text-xs text-primary underline-offset-2 hover:underline"
            >
              {productLinkReasonLabel(row.productLinkReason)} — link product
            </button>
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
            <div className="font-mono">{row.shadeCode}</div>
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
      cell: (row) => DEMAND_TYPE_LABELS[row.type] || "-",
    },
    {
      id: "qtyOriginal",
      header: "Qty Original",
      cellClassName: "tabular-nums",
      cell: (row) => fmtQty(row.qtyOriginal),
    },
    {
      id: "qtyRemaining",
      header: "Qty Remaining",
      cellClassName: "tabular-nums",
      cell: (row) => fmtQty(row.qtyRemaining),
    },
    {
      id: "deadline",
      header: "Deadline",
      hideOnMobile: true,
      cell: (row) => fmtDate(row.deadline),
    },
    {
      id: "month",
      header: "Month",
      hideOnMobile: true,
      cell: (row) => row.month || "-",
    },
    {
      id: "status",
      header: "Status",
      // An unlinked demand carries the reason it is unlinked; a planner needs
      // that to know whether to pick a product or wait for the master.
      cell: (row) =>
        row.status === DemandStatus.DEMAND_STATUS_PENDING_PRODUCT_LINK ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help">
                  <StatusBadge
                    status={demandStatusToken(row.status)}
                    type="ppcDemand"
                    size="sm"
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">{productLinkReasonLabel(row.productLinkReason)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <StatusBadge status={demandStatusToken(row.status)} type="ppcDemand" size="sm" />
        ),
    },
  ]

  const actions: RowAction<Demand>[] = [
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
      id: "confirm",
      label: "Confirm",
      icon: <CheckCircle2 className="h-4 w-4" />,
      onClick: onConfirm,
      disabled: (row) => row.status !== DemandStatus.DEMAND_STATUS_PENDING_CONFIRMATION,
    },
    {
      id: "map-product",
      label: "Link Product",
      icon: <Link2 className="h-4 w-4" />,
      onClick: onMapProduct,
      disabled: (row) => !!row.cpmProductSysId,
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
      keyField="demandId"
      actions={actions}
      isLoading={isLoading}
      emptyMessage="No demands found"
      emptyDescription="Add a demand, pull from Orion, or adjust your filters."
      stickyActions
    />
  )
}
