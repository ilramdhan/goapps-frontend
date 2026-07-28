"use client"

import { Pencil, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { DataTable, type ColumnDef, type RowAction } from "@/components/shared"
import { StatusBadge } from "@/components/common"

import type { DowntimeReasonMaster } from "@/types/ppc/master"
import { AREA_LABELS, humanizeEnumValue } from "@/types/ppc/common"

interface DowntimeReasonsTableProps {
  data: DowntimeReasonMaster[]
  isLoading?: boolean
  onEdit: (row: DowntimeReasonMaster) => void
  onDelete: (row: DowntimeReasonMaster) => void
}

export function DowntimeReasonsTable({
  data,
  isLoading,
  onEdit,
  onDelete,
}: DowntimeReasonsTableProps) {
  const columns: ColumnDef<DowntimeReasonMaster>[] = [
    {
      id: "code",
      header: "Code",
      cell: (row) => <span className="font-medium font-mono">{row.code || "-"}</span>,
    },
    {
      id: "name",
      header: "Name",
      cell: (row) => row.name || "-",
    },
    {
      id: "area",
      header: "Area",
      cell: (row) => <Badge variant="outline">{AREA_LABELS[row.area] || "-"}</Badge>,
    },
    {
      id: "category",
      header: "Category",
      cell: (row) => (row.category ? humanizeEnumValue(row.category) : "-"),
    },
    {
      id: "isExcludeFromEff",
      header: "Excl. from Eff.",
      hideOnMobile: true,
      cell: (row) => (row.isExcludeFromEff ? "Yes" : "No"),
    },
    {
      id: "sortOrder",
      header: "Sort",
      hideOnMobile: true,
      cell: (row) => <span className="font-mono">{row.sortOrder ?? "-"}</span>,
    },
    {
      id: "isActive",
      header: "Status",
      cell: (row) => <StatusBadge status={row.isActive ? "ACTIVE" : "INACTIVE"} type="generic" />,
    },
  ]

  const actions: RowAction<DowntimeReasonMaster>[] = [
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
      keyField="reasonId"
      actions={actions}
      isLoading={isLoading}
      emptyMessage="No downtime reasons found"
      emptyDescription="Try adjusting your search or filter criteria"
    />
  )
}
