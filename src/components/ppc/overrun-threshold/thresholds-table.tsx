"use client"

import { Pencil, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { DataTable, type ColumnDef, type RowAction } from "@/components/shared"
import { StatusBadge } from "@/components/common"

import type { OverrunThresholdConfig } from "@/types/ppc/master"
import { THRESHOLD_LEVEL_LABELS, THRESHOLD_UNIT_LABELS } from "@/types/ppc/common"

interface ThresholdsTableProps {
  data: OverrunThresholdConfig[]
  isLoading?: boolean
  onEdit: (row: OverrunThresholdConfig) => void
  onDelete: (row: OverrunThresholdConfig) => void
}

export function ThresholdsTable({ data, isLoading, onEdit, onDelete }: ThresholdsTableProps) {
  const columns: ColumnDef<OverrunThresholdConfig>[] = [
    {
      id: "level",
      header: "Level",
      cell: (row) => <Badge variant="outline">{THRESHOLD_LEVEL_LABELS[row.level] || "-"}</Badge>,
    },
    {
      id: "refId",
      header: "Ref ID",
      cell: (row) => <span className="font-mono">{row.refId || "-"}</span>,
    },
    {
      id: "thresholdUnit",
      header: "Unit",
      cell: (row) => THRESHOLD_UNIT_LABELS[row.thresholdUnit] || "-",
    },
    {
      id: "warningValue",
      header: "Warning",
      cell: (row) => <span className="font-mono">{row.warningValue || "-"}</span>,
    },
    {
      id: "blockValue",
      header: "Block",
      cell: (row) => <span className="font-mono">{row.blockValue || "-"}</span>,
    },
    {
      id: "isActive",
      header: "Status",
      cell: (row) => <StatusBadge status={row.isActive ? "ACTIVE" : "INACTIVE"} type="generic" />,
    },
  ]

  const actions: RowAction<OverrunThresholdConfig>[] = [
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
      keyField="thresholdId"
      actions={actions}
      isLoading={isLoading}
      emptyMessage="No thresholds found"
      emptyDescription="Try adjusting your filter criteria"
    />
  )
}
