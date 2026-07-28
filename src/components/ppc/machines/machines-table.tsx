"use client"

import { Pencil } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { DataTable, type ColumnDef, type RowAction } from "@/components/shared"
import { StatusBadge } from "@/components/common"

import type { Machine } from "@/types/ppc/master"
import { AREA_LABELS } from "@/types/ppc/common"

interface MachinesTableProps {
  data: Machine[]
  isLoading?: boolean
  onEdit: (machine: Machine) => void
}

function formatSyncedAt(iso: string): string {
  if (!iso) return "-"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "-"
  return d.toLocaleString()
}

export function MachinesTable({ data, isLoading, onEdit }: MachinesTableProps) {
  const columns: ColumnDef<Machine>[] = [
    {
      id: "machineNo",
      header: "Machine No",
      cell: (row) => <span className="font-medium font-mono">{row.machineNo || "-"}</span>,
    },
    {
      id: "machineArea",
      header: "Area",
      cell: (row) => <Badge variant="outline">{AREA_LABELS[row.machineArea] || "-"}</Badge>,
    },
    {
      id: "machineLine",
      header: "Line",
      cell: (row) => row.machineLine || "-",
    },
    {
      id: "machineGroupName",
      header: "Group",
      cell: (row) => row.machineGroupName || "-",
    },
    {
      id: "machineDoffWeightKg",
      header: "Doff Weight (kg)",
      hideOnMobile: true,
      cell: (row) => <span className="font-mono">{row.machineDoffWeightKg || "-"}</span>,
    },
    {
      id: "machineIsActive",
      header: "Status",
      cell: (row) => (
        <StatusBadge status={row.machineIsActive ? "ACTIVE" : "INACTIVE"} type="generic" />
      ),
    },
    {
      id: "syncedAt",
      header: "Last Synced",
      hideOnMobile: true,
      cellClassName: "text-muted-foreground",
      cell: (row) => formatSyncedAt(row.syncedAt),
    },
  ]

  const actions: RowAction<Machine>[] = [
    {
      id: "edit",
      label: "Edit",
      icon: <Pencil className="h-4 w-4" />,
      onClick: onEdit,
    },
  ]

  return (
    <DataTable
      data={data}
      columns={columns}
      keyField="machineId"
      actions={actions}
      isLoading={isLoading}
      emptyMessage="No machines found"
      emptyDescription="Try adjusting your filters, or run a sync from Oracle"
    />
  )
}
