"use client"

import { Pencil, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { DataTable, type ColumnDef, type RowAction } from "@/components/shared"

import type { MachineGroup } from "@/types/ppc/master"
import { AREA_LABELS } from "@/types/ppc/common"

interface MachineGroupsTableProps {
  data: MachineGroup[]
  isLoading?: boolean
  onEdit: (group: MachineGroup) => void
  onDelete: (group: MachineGroup) => void
}

export function MachineGroupsTable({
  data,
  isLoading,
  onEdit,
  onDelete,
}: MachineGroupsTableProps) {
  const columns: ColumnDef<MachineGroup>[] = [
    {
      id: "groupId",
      header: "ID",
      width: "w-[80px]",
      cell: (row) => <span className="font-mono text-muted-foreground">{row.groupId}</span>,
    },
    {
      id: "groupName",
      header: "Group Name",
      cell: (row) => <span className="font-medium">{row.groupName || "-"}</span>,
    },
    {
      id: "groupArea",
      header: "Area",
      cell: (row) => <Badge variant="outline">{AREA_LABELS[row.groupArea] || "-"}</Badge>,
    },
  ]

  const actions: RowAction<MachineGroup>[] = [
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
      keyField="groupId"
      actions={actions}
      isLoading={isLoading}
      emptyMessage="No machine groups found"
      emptyDescription="Try adjusting your search or filter criteria"
    />
  )
}
