"use client"

import { Pencil, Trash2 } from "lucide-react"

import { DataTable, type ColumnDef, type RowAction } from "@/components/shared"
import { StatusBadge } from "@/components/common"

import type { MBHead } from "@/types/finance/mb-head"

interface MBHeadTableProps {
  data: MBHead[]
  isLoading?: boolean
  onEdit: (mbHead: MBHead) => void
  onDelete: (mbHead: MBHead) => void
}

export function MBHeadTable({ data, isLoading, onEdit, onDelete }: MBHeadTableProps) {
  const columns: ColumnDef<MBHead>[] = [
    {
      id: "mbhMbCosting",
      header: "MB Costing",
      width: "w-[160px]",
      cell: (row) => <span className="font-medium font-mono">{row.mbhMbCosting || "-"}</span>,
    },
    {
      id: "mbhMgtName",
      header: "Mgt Name",
      cell: (row) => row.mbhMgtName || "-",
    },
    {
      id: "mbhStatus",
      header: "Status",
      width: "w-[100px]",
      hideOnMobile: true,
      cell: (row) => row.mbhStatus || <span className="text-muted-foreground">—</span>,
    },
    {
      // ⭐ 2026-08-23 — user decision, plan §11 item 42 = option (2). The table
      // shows the DERIVED column `mbh_check_status_calc`, not the frozen Oracle
      // `mbh_check_status`. ~~The Oracle trace still exists and is still shown, but
      // ONLY on the detail page (mb-recipe-form-dialog).~~
      // ⭐ 2026-08-26 — the Oracle trace is no longer shown ANYWHERE in the UI (the
      // detail dialog stopped rendering it too); it survives only in the database
      // as an archive and in the fetched payload. This table is unchanged.
      id: "mbhCheckStatusCalc",
      header: "Check Status",
      width: "w-[130px]",
      hideOnMobile: true,
      // 🔴 An absent value is rendered EXPLICITLY as "Belum dihitung", never as an
      // em dash or a blank: 207 legacy heads keep this column NULL permanently (no
      // backfill, item 44), and NULL means "never calculated by the application" —
      // ⛔ not "no status", which is what a dash would imply.
      cell: (row) => (
        <span data-testid="mb-head-check-status-calc-cell">
          {row.mbhCheckStatusCalc?.trim() || (
            <span className="text-muted-foreground italic">Belum dihitung</span>
          )}
        </span>
      ),
    },
    {
      id: "mbhDenier",
      header: "Denier",
      width: "w-[90px]",
      hideOnMobile: true,
      cell: (row) => row.mbhDenier?.toFixed(2) ?? "-",
    },
    {
      id: "mbhFilament",
      header: "Filament",
      width: "w-[90px]",
      hideOnMobile: true,
      cell: (row) => row.mbhFilament ?? "-",
    },
    {
      id: "mbhDozing",
      header: "Dozing (%)",
      width: "w-[100px]",
      hideOnMobile: true,
      cell: (row) => row.mbhDozing != null ? `${row.mbhDozing.toFixed(2)}%` : <span className="text-muted-foreground">—</span>,
    },
    {
      id: "mbhIsActive",
      header: "Status",
      width: "w-[100px]",
      cell: (row) => (
        <StatusBadge status={row.mbhIsActive ? "ACTIVE" : "INACTIVE"} type="product" size="sm" />
      ),
    },
  ]

  const actions: RowAction<MBHead>[] = [
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
      tableId="yarn-master-mb-heads"
      data={data}
      columns={columns}
      keyField="mbhId"
      actions={actions}
      isLoading={isLoading}
      emptyMessage="No MB heads found"
      emptyDescription="Try adjusting your search or filter criteria"
    />
  )
}
