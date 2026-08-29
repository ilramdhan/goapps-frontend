"use client"

import { Pencil, Trash2, Copy } from "lucide-react"

import { DataTable, type ColumnDef, type RowAction } from "@/components/shared"
import { StatusBadge } from "@/components/common"
import { usePermissionContext } from "@/providers/permission-provider"

import type { MBSpin } from "@/types/finance/mb-spin"

interface MBSpinTableProps {
  data: MBSpin[]
  isLoading?: boolean
  onEdit: (mbSpin: MBSpin) => void
  onDelete: (mbSpin: MBSpin) => void
  onDuplicate?: (mbSpin: MBSpin) => void
}

export function MBSpinTable({ data, isLoading, onEdit, onDelete, onDuplicate }: MBSpinTableProps) {
  const { hasPermission } = usePermissionContext()
  // Same permission the backend already gates RPC DuplicateMBSpin behind — the
  // clone is a brand-new "R and D" record, so this reuses the "create" code
  // rather than introducing a new permission code.
  const canDuplicate = onDuplicate != null && hasPermission("finance.yarnmaster.mbspin.create")
  const columns: ColumnDef<MBSpin>[] = [
    {
      id: "mbsMgtName",
      header: "Mgt Name",
      cell: (row) => row.mbsMgtName || "-",
    },
    {
      id: "mbsMbCosting",
      header: "MB Costing",
      hideOnMobile: true,
      cell: (row) => row.mbsMbCosting || "-",
    },
    {
      id: "mbsStatus",
      header: "Status",
      width: "w-[100px]",
      hideOnMobile: true,
      cell: (row) => row.mbsStatus || <span className="text-muted-foreground">—</span>,
    },
    {
      id: "mbsFinalProduct",
      header: "Final Product",
      hideOnMobile: true,
      cellClassName: "max-w-[180px] truncate",
      cell: (row) => row.mbsFinalProduct || <span className="text-muted-foreground">—</span>,
    },
    {
      id: "mbsCc",
      header: "Cost Code",
      width: "w-[110px]",
      hideOnMobile: true,
      cell: (row) => row.mbsCc || <span className="text-muted-foreground">—</span>,
    },
    {
      id: "mbsDenier",
      header: "Denier",
      width: "w-[90px]",
      hideOnMobile: true,
      cell: (row) => row.mbsDenier?.toFixed(2) ?? "-",
    },
    {
      id: "mbsFilament",
      header: "Filament",
      width: "w-[90px]",
      hideOnMobile: true,
      cell: (row) => row.mbsFilament ?? "-",
    },
    {
      id: "mbsCostRateMkt",
      header: "Rate MKT",
      width: "w-[120px]",
      hideOnMobile: true,
      cell: (row) => row.mbsCostRateMkt != null
        ? `$${row.mbsCostRateMkt.toFixed(4)}`
        : <span className="text-muted-foreground">—</span>,
    },
    {
      id: "mbsIsActive",
      header: "Status",
      width: "w-[100px]",
      cell: (row) => (
        <StatusBadge status={row.mbsIsActive ? "ACTIVE" : "INACTIVE"} type="product" size="sm" />
      ),
    },
  ]

  const actions: RowAction<MBSpin>[] = [
    {
      id: "edit",
      label: "Edit",
      icon: <Pencil className="h-4 w-4" />,
      onClick: onEdit,
    },
  ]
  if (canDuplicate) {
    actions.push({
      id: "duplicate",
      label: "Duplicate",
      icon: <Copy className="h-4 w-4" />,
      onClick: onDuplicate!,
    })
  }
  actions.push({
    id: "delete",
    label: "Delete",
    icon: <Trash2 className="h-4 w-4" />,
    onClick: onDelete,
    variant: "destructive",
  })

  return (
    <DataTable
      tableId="yarn-master-mb-spins"
      data={data}
      columns={columns}
      keyField="mbsId"
      actions={actions}
      isLoading={isLoading}
      emptyMessage="No MB spins found"
      emptyDescription="Try adjusting your search or filter criteria"
    />
  )
}
