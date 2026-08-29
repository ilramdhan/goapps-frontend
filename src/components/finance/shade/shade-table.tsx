"use client"

import { Eye } from "lucide-react"

import { DataTable, type ColumnDef, type RowAction } from "@/components/shared"
import { StatusBadge } from "@/components/common"

import type { Shade } from "@/types/finance/shade"

interface ShadeTableProps {
  data: Shade[]
  isLoading?: boolean
  onView: (shade: Shade) => void
}

export function ShadeTable({ data, isLoading, onView }: ShadeTableProps) {
  const columns: ColumnDef<Shade>[] = [
    {
      id: "shadeCode",
      header: "Code",
      width: "w-[140px]",
      cell: (row) => <span className="font-medium font-mono">{row.shadeCode || "-"}</span>,
    },
    {
      id: "shadeName",
      header: "Name",
      accessorKey: "shadeName",
    },
    {
      id: "shadeShortName",
      header: "Short Name",
      width: "w-[140px]",
      hideOnMobile: true,
      cell: (row) => row.shadeShortName || <span className="text-muted-foreground">—</span>,
    },
    {
      id: "shadeSource",
      header: "Source",
      width: "w-[110px]",
      cell: (row) => (
        <StatusBadge
          status={row.shadeSource}
          type="generic"
          size="sm"
        />
      ),
    },
    {
      id: "isActive",
      header: "Status",
      width: "w-[100px]",
      cell: (row) => (
        <StatusBadge status={row.isActive ? "ACTIVE" : "INACTIVE"} type="product" size="sm" />
      ),
    },
    {
      id: "syncedAt",
      header: "Last Synced",
      width: "w-[160px]",
      hideOnMobile: true,
      cell: (row) => (row.syncedAt ? new Date(row.syncedAt).toLocaleString() : <span className="text-muted-foreground">—</span>),
    },
    {
      id: "usageCount",
      header: "Usage Count",
      width: "w-[110px]",
      hideOnMobile: true,
      cell: (row) => <span className="tabular-nums">{row.usageCount ?? 0}</span>,
    },
  ]

  const actions: RowAction<Shade>[] = [
    {
      id: "view",
      label: "View",
      icon: <Eye className="h-4 w-4" />,
      onClick: onView,
    },
  ]

  return (
    <DataTable
      tableId="finance-shades"
      data={data}
      columns={columns}
      keyField="shadeId"
      actions={actions}
      isLoading={isLoading}
      emptyMessage="No shades found"
      emptyDescription="Try adjusting your search or filter criteria, or sync from Oracle."
    />
  )
}
