"use client"

import { Pencil, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { DataTable, type ColumnDef, type RowAction } from "@/components/shared"

import type { LotMaster } from "@/types/ppc/master"
import { LOT_SOURCE_MMSMERGE } from "@/types/ppc/master"

interface LotsTableProps {
  data: LotMaster[]
  isLoading?: boolean
  onEdit: (lot: LotMaster) => void
  onDelete: (lot: LotMaster) => void
}

function formatTimestamp(iso: string): string {
  if (!iso) return "-"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "-"
  return d.toLocaleString()
}

export function LotsTable({ data, isLoading, onEdit, onDelete }: LotsTableProps) {
  const columns: ColumnDef<LotMaster>[] = [
    {
      id: "lotNo",
      header: "Lot No",
      cell: (row) => <span className="font-medium font-mono">{row.lotNo || "-"}</span>,
    },
    {
      id: "itemCode",
      header: "Item Code",
      cell: (row) => <span className="font-mono">{row.itemCode || "-"}</span>,
    },
    {
      id: "shadeCode",
      header: "Shade Code",
      cell: (row) => <span className="font-mono">{row.shadeCode || "-"}</span>,
    },
    {
      id: "prodType",
      header: "Type",
      cell: (row) => row.spec?.prodType || "-",
    },
    {
      id: "stdWeightFull",
      header: "Std Wt Full",
      hideOnMobile: true,
      cell: (row) => <span className="font-mono">{row.stdWeightFull || "-"}</span>,
    },
    {
      id: "stdWeightUnfull",
      header: "Std Wt Unfull",
      hideOnMobile: true,
      cell: (row) => <span className="font-mono">{row.stdWeightUnfull || "-"}</span>,
    },
    {
      id: "source",
      header: "Source",
      cell: (row) => (
        <Badge variant={row.source === LOT_SOURCE_MMSMERGE ? "secondary" : "outline"}>
          {row.source === LOT_SOURCE_MMSMERGE ? "Oracle" : "PPC"}
        </Badge>
      ),
    },
    {
      id: "syncedAt",
      header: "Last Synced",
      hideOnMobile: true,
      cellClassName: "text-muted-foreground",
      cell: (row) => formatTimestamp(row.syncedAt),
    },
    {
      id: "notes",
      header: "Notes",
      hideOnMobile: true,
      cellClassName: "max-w-[200px] truncate text-muted-foreground",
      cell: (row) => row.notes || "-",
    },
  ]

  const actions: RowAction<LotMaster>[] = [
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
      keyField="lotNo"
      actions={actions}
      isLoading={isLoading}
      emptyMessage="No lots found"
      emptyDescription="Try adjusting your search or filter criteria, or run a sync from Oracle"
    />
  )
}
