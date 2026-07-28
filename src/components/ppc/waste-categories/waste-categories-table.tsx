"use client"

import { Pencil, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { DataTable, type ColumnDef, type RowAction } from "@/components/shared"
import { StatusBadge } from "@/components/common"

import type { WasteCategoryMaster } from "@/types/ppc/master"
import { AREA_LABELS, humanizeEnumValue } from "@/types/ppc/common"

interface WasteCategoriesTableProps {
  data: WasteCategoryMaster[]
  isLoading?: boolean
  onEdit: (row: WasteCategoryMaster) => void
  onDelete: (row: WasteCategoryMaster) => void
}

export function WasteCategoriesTable({
  data,
  isLoading,
  onEdit,
  onDelete,
}: WasteCategoriesTableProps) {
  const columns: ColumnDef<WasteCategoryMaster>[] = [
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
      id: "type",
      header: "Type",
      cell: (row) => (row.type ? humanizeEnumValue(row.type) : "-"),
    },
    {
      id: "gradeTarget",
      header: "Grade Target",
      hideOnMobile: true,
      cell: (row) => row.gradeTarget || "-",
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

  const actions: RowAction<WasteCategoryMaster>[] = [
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
      keyField="categoryId"
      actions={actions}
      isLoading={isLoading}
      emptyMessage="No waste categories found"
      emptyDescription="Try adjusting your search or filter criteria"
    />
  )
}
