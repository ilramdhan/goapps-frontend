"use client"

import { Pencil, Trash2 } from "lucide-react"

import { DataTable, type ColumnDef, type RowAction } from "@/components/shared"
import { StatusBadge } from "@/components/common"
import { usePermissionContext } from "@/providers/permission-provider"

import type { SuperbaCostSp } from "@/types/finance/superba-cost-sp"

interface SuperbaCostSpTableProps {
  data: SuperbaCostSp[]
  isLoading?: boolean
  onEdit: (row: SuperbaCostSp) => void
  onDelete: (row: SuperbaCostSp) => void
}

const dash = <span className="text-muted-foreground">—</span>

export function SuperbaCostSpTable({ data, isLoading, onEdit, onDelete }: SuperbaCostSpTableProps) {
  const { hasPermission } = usePermissionContext()
  const canUpdate = hasPermission("finance.master.superbacostsp.update")
  const canDelete = hasPermission("finance.master.superbacostsp.delete")

  const columns: ColumnDef<SuperbaCostSp>[] = [
    {
      id: "legacySysId",
      header: "Legacy Sys Id",
      width: "w-[150px]",
      cell: (row) => <span className="font-mono tabular-nums">{row.legacySysId}</span>,
    },
    {
      id: "shadeCode",
      header: "Shade Code",
      width: "w-[130px]",
      cell: (row) => <span className="font-medium font-mono">{row.shadeCode || "-"}</span>,
    },
    {
      id: "colourName",
      header: "Superba Colour Name",
      cell: (row) => row.colourName || dash,
    },
    {
      id: "oldValue",
      header: "Old Value (MB cost)",
      width: "w-[150px]",
      cell: (row) => <span className="tabular-nums font-medium">{row.oldValue}</span>,
    },
    {
      id: "newValue",
      header: "New Value (info)",
      width: "w-[130px]",
      hideOnMobile: true,
      cell: (row) =>
        row.newValue === undefined ? dash : <span className="tabular-nums text-muted-foreground">{row.newValue}</span>,
    },
    {
      id: "source",
      header: "Source",
      width: "w-[100px]",
      cell: (row) => <StatusBadge status={row.source} type="generic" size="sm" />,
    },
    {
      id: "isActive",
      header: "Active",
      width: "w-[100px]",
      cell: (row) => <StatusBadge status={row.isActive ? "ACTIVE" : "INACTIVE"} type="product" size="sm" />,
    },
    {
      id: "updatedAt",
      header: "Updated",
      width: "w-[160px]",
      hideOnMobile: true,
      cell: (row) => {
        const at = row.audit?.updatedAt || row.audit?.createdAt
        return at ? new Date(at).toLocaleString() : dash
      },
    },
  ]

  const actions: RowAction<SuperbaCostSp>[] = [
    ...(canUpdate
      ? [{ id: "edit", label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: onEdit }]
      : []),
    ...(canDelete
      ? [
          {
            id: "delete",
            label: "Delete",
            icon: <Trash2 className="h-4 w-4" />,
            onClick: onDelete,
            variant: "destructive" as const,
          },
        ]
      : []),
  ]

  return (
    <DataTable
      tableId="finance-superba-cost-sps"
      data={data}
      columns={columns}
      keyField="id"
      actions={actions}
      isLoading={isLoading}
      emptyMessage="No Superba Cost SP rows found"
      emptyDescription="Try adjusting your search or filter criteria, or add a row."
    />
  )
}
