"use client"

import { Pencil, Trash2, Eye } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { DataTable, type ColumnDef, type RowAction } from "@/components/shared"

import type { RMGroupHead } from "@/types/finance/rm-group"
import {
  RM_VALUATION_FLAG_LABELS,
  RM_MARKETING_FLAG_LABELS,
} from "@/types/finance/rm-group"
import {
  RMValuationFlag,
  RMMarketingFlag,
} from "@/types/generated/finance/v1/rm_group"

interface GroupTableProps {
  data: RMGroupHead[]
  isLoading?: boolean
  onEdit: (group: RMGroupHead) => void
  onDelete: (group: RMGroupHead) => void
  onView: (group: RMGroupHead) => void
}

function formatDecimal(val: number | undefined | null, digits = 4): string {
  if (val === undefined || val === null) return "—"
  return val.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  })
}

/** Format a decimal-stored percent (0.04) as a whole-percent string ("4.00"). */
function formatPctFromDecimal(val: number | undefined | null, digits = 2): string {
  if (val === undefined || val === null) return "—"
  return (val * 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  })
}

function valuationFlagShort(flag: number | undefined): string {
  const f = (flag ?? RMValuationFlag.RM_VALUATION_FLAG_UNSPECIFIED) as RMValuationFlag
  if (f === RMValuationFlag.RM_VALUATION_FLAG_UNSPECIFIED) return "AUTO"
  return RM_VALUATION_FLAG_LABELS[f]?.split(" ")[0] || "AUTO"
}

function marketingFlagShort(flag: number | undefined): string {
  const f = (flag ?? RMMarketingFlag.RM_MARKETING_FLAG_UNSPECIFIED) as RMMarketingFlag
  if (f === RMMarketingFlag.RM_MARKETING_FLAG_UNSPECIFIED) return "AUTO"
  return RM_MARKETING_FLAG_LABELS[f]?.split(" ")[0] || "AUTO"
}

const num = "text-right font-mono text-xs"
const numHead = "text-right"

export function GroupTable({ data, isLoading, onEdit, onDelete, onView }: GroupTableProps) {
  const columns: ColumnDef<RMGroupHead>[] = [
    {
      id: "groupCode",
      header: "Code",
      widthPx: 140,
      sticky: "left",
      canHide: false,
      cell: (row) => (
        <span className="font-medium font-mono">{row.groupCode || "-"}</span>
      ),
    },
    {
      id: "groupName",
      header: "Name",
      widthPx: 220,
      sticky: "left",
      canHide: false,
      cell: (row) => (
        <span className="truncate block">{row.groupName || "-"}</span>
      ),
    },
    { id: "costPercentage", header: "Duty %", width: "w-[100px]", headerClassName: numHead, cellClassName: num, cell: (row) => formatPctFromDecimal(row.costPercentage) },
    { id: "costPerKg", header: "Transport", width: "w-[110px]", headerClassName: numHead, cellClassName: num, cell: (row) => formatDecimal(row.costPerKg) },
    { id: "marketingFreightRate", header: "Mkt Freight", width: "w-[110px]", headerClassName: numHead, cellClassName: num, cell: (row) => formatDecimal(row.marketingFreightRate) },
    { id: "marketingAntiDumpingPct", header: "Mkt Anti %", width: "w-[110px]", headerClassName: numHead, cellClassName: num, cell: (row) => formatPctFromDecimal(row.marketingAntiDumpingPct) },
    { id: "marketingDefaultValue", header: "Default Val", width: "w-[120px]", headerClassName: numHead, cellClassName: num, cell: (row) => formatDecimal(row.marketingDefaultValue) },
    {
      id: "flags",
      header: "Flags (Val / Mkt)",
      width: "w-[140px]",
      cell: (row) => (
        <div className="flex items-center gap-1 text-xs font-mono">
          <Badge variant="outline" className="text-[10px]">
            {valuationFlagShort(row.valuationFlag)}
          </Badge>
          <span className="text-muted-foreground">/</span>
          <Badge variant="outline" className="text-[10px]">
            {marketingFlagShort(row.marketingFlag)}
          </Badge>
        </div>
      ),
    },
    {
      id: "isOilGroup",
      header: "Oil",
      width: "w-[70px]",
      cell: (row) =>
        row.isOilGroup ? (
          <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">
            Oil
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "isActive",
      header: "Status",
      width: "w-[90px]",
      cell: (row) => (
        <Badge variant={row.isActive ? "default" : "secondary"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ]

  const actions: RowAction<RMGroupHead>[] = [
    {
      id: "view",
      label: "View Details",
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
      keyField="groupHeadId"
      actions={actions}
      isLoading={isLoading}
      tableId="rmgroup.list.v2"
      stickyActions
      emptyMessage="No RM groups found"
      emptyDescription="Create a new group to get started"
    />
  )
}
