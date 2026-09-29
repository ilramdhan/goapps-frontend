"use client"

import { Pencil, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { DataTable, type ColumnDef, type RowAction } from "@/components/shared"

import { InheritedPeriodBadge } from "./inherited-period-badge"

import type { RMGroupDetail, RMGroupItemRates } from "@/types/finance/rm-group"

interface ItemListTableProps {
  data: RMGroupDetail[]
  isLoading?: boolean
  onRemove: (item: RMGroupDetail) => void
  onEditValuation?: (item: RMGroupDetail) => void
  rates?: RMGroupItemRates[]
  ratesLoading?: boolean
  period?: string
}

function fmt(v: number | undefined): string {
  if (v === undefined || v === null || v === 0) return "—"
  return v.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })
}

export function ItemListTable({
  data,
  isLoading,
  onRemove,
  onEditValuation,
  rates,
  ratesLoading,
  period,
}: ItemListTableProps) {
  // Composite key: items may share the same item_code but differ by grade_code
  // (e.g., CHP0000036 with grades IRV, JIA, JIA-T2T, NA). Using itemCode alone
  // as key would overwrite all but the last entry.
  const rateKey = (code: string, grade: string) => `${code}::${grade}`

  const ratesByItem = new Map<string, RMGroupItemRates>()
  for (const r of rates ?? []) {
    if (r.itemCode) ratesByItem.set(rateKey(r.itemCode, r.gradeCode || ""), r)
  }

  const stageLoading = Boolean(period) && ratesLoading
  const stageCell = (value: number | undefined) =>
    stageLoading ? (
      <span className="text-muted-foreground">…</span>
    ) : (
      fmt(value)
    )

  const stageColumns: ColumnDef<RMGroupDetail>[] = period
    ? [
        {
          id: "consQty",
          header: "CONS Qty",
          hideOnMobile: true,
          cellClassName: "text-right font-mono text-xs",
          cell: (row) => stageCell(ratesByItem.get(rateKey(row.itemCode || "", row.gradeCode || ""))?.consQty),
        },
        {
          id: "consVal",
          header: "CONS Val",
          hideOnMobile: true,
          cellClassName: "text-right font-mono text-xs",
          cell: (row) => stageCell(ratesByItem.get(rateKey(row.itemCode || "", row.gradeCode || ""))?.consVal),
        },
        {
          id: "consRate",
          header: "CONS Rate",
          hideOnMobile: true,
          cellClassName: "text-right font-mono text-xs",
          cell: (row) => stageCell(ratesByItem.get(rateKey(row.itemCode || "", row.gradeCode || ""))?.consRate),
        },
        {
          id: "storesQty",
          header: "STORES Qty",
          hideOnMobile: true,
          cellClassName: "text-right font-mono text-xs",
          cell: (row) => stageCell(ratesByItem.get(rateKey(row.itemCode || "", row.gradeCode || ""))?.storesQty),
        },
        {
          id: "storesVal",
          header: "STORES Val",
          hideOnMobile: true,
          cellClassName: "text-right font-mono text-xs",
          cell: (row) => stageCell(ratesByItem.get(rateKey(row.itemCode || "", row.gradeCode || ""))?.storesVal),
        },
        {
          id: "storesRate",
          header: "STORES Rate",
          hideOnMobile: true,
          cellClassName: "text-right font-mono text-xs",
          cell: (row) => stageCell(ratesByItem.get(rateKey(row.itemCode || "", row.gradeCode || ""))?.storesRate),
        },
        {
          id: "deptQty",
          header: "DEPT Qty",
          hideOnMobile: true,
          cellClassName: "text-right font-mono text-xs",
          cell: (row) => stageCell(ratesByItem.get(rateKey(row.itemCode || "", row.gradeCode || ""))?.deptQty),
        },
        {
          id: "deptVal",
          header: "DEPT Val",
          hideOnMobile: true,
          cellClassName: "text-right font-mono text-xs",
          cell: (row) => stageCell(ratesByItem.get(rateKey(row.itemCode || "", row.gradeCode || ""))?.deptVal),
        },
        {
          id: "deptRate",
          header: "DEPT Rate",
          hideOnMobile: true,
          cellClassName: "text-right font-mono text-xs",
          cell: (row) => stageCell(ratesByItem.get(rateKey(row.itemCode || "", row.gradeCode || ""))?.deptRate),
        },
        {
          id: "lastPoQty1",
          header: "PO1 Qty",
          hideOnMobile: true,
          cellClassName: "text-right font-mono text-xs",
          cell: (row) => stageCell(ratesByItem.get(rateKey(row.itemCode || "", row.gradeCode || ""))?.lastPoQty1),
        },
        {
          id: "lastPoVal1",
          header: "PO1 Val",
          hideOnMobile: true,
          cellClassName: "text-right font-mono text-xs",
          cell: (row) => stageCell(ratesByItem.get(rateKey(row.itemCode || "", row.gradeCode || ""))?.lastPoVal1),
        },
        {
          id: "lastPoRate1",
          header: "PO1 Rate",
          hideOnMobile: true,
          cellClassName: "text-right font-mono text-xs",
          cell: (row) => stageCell(ratesByItem.get(rateKey(row.itemCode || "", row.gradeCode || ""))?.lastPoRate1),
        },
        {
          id: "lastPoQty2",
          header: "PO2 Qty",
          hideOnMobile: true,
          cellClassName: "text-right font-mono text-xs",
          cell: (row) => stageCell(ratesByItem.get(rateKey(row.itemCode || "", row.gradeCode || ""))?.lastPoQty2),
        },
        {
          id: "lastPoVal2",
          header: "PO2 Val",
          hideOnMobile: true,
          cellClassName: "text-right font-mono text-xs",
          cell: (row) => stageCell(ratesByItem.get(rateKey(row.itemCode || "", row.gradeCode || ""))?.lastPoVal2),
        },
        {
          id: "lastPoRate2",
          header: "PO2 Rate",
          hideOnMobile: true,
          cellClassName: "text-right font-mono text-xs",
          cell: (row) => stageCell(ratesByItem.get(rateKey(row.itemCode || "", row.gradeCode || ""))?.lastPoRate2),
        },
        {
          id: "lastPoQty3",
          header: "PO3 Qty",
          hideOnMobile: true,
          cellClassName: "text-right font-mono text-xs",
          cell: (row) => stageCell(ratesByItem.get(rateKey(row.itemCode || "", row.gradeCode || ""))?.lastPoQty3),
        },
        {
          id: "lastPoVal3",
          header: "PO3 Val",
          hideOnMobile: true,
          cellClassName: "text-right font-mono text-xs",
          cell: (row) => stageCell(ratesByItem.get(rateKey(row.itemCode || "", row.gradeCode || ""))?.lastPoVal3),
        },
        {
          id: "lastPoRate3",
          header: "PO3 Rate",
          hideOnMobile: true,
          cellClassName: "text-right font-mono text-xs",
          cell: (row) => stageCell(ratesByItem.get(rateKey(row.itemCode || "", row.gradeCode || ""))?.lastPoRate3),
        },
      ]
    : []

  const columns: ColumnDef<RMGroupDetail>[] = [
    {
      id: "sortOrder",
      header: "#",
      widthPx: 50,
      sticky: "left",
      canHide: false,
      cell: (_row, index) => (
        <span className="text-muted-foreground text-sm">{(index ?? 0) + 1}</span>
      ),
    },
    {
      id: "itemCode",
      header: "Item Code",
      widthPx: 140,
      sticky: "left",
      canHide: false,
      cell: (row) => (
        <span className="font-medium font-mono">{row.itemCode || "-"}</span>
      ),
    },
    {
      id: "itemName",
      header: "Item Name",
      widthPx: 220,
      sticky: "left",
      canHide: false,
      cell: (row) => (
        <div className="min-w-0">
          <span className="truncate block">{row.itemName || "-"}</span>
          <InheritedPeriodBadge inheritedFromPeriod={row.inheritedFromPeriod} className="mt-0.5" />
        </div>
      ),
    },
    {
      id: "gradeCode",
      header: "Grade",
      width: "w-[80px]",
      cell: (row) => (
        <span className="text-muted-foreground text-sm">{row.gradeCode || "—"}</span>
      ),
    },
    {
      id: "uomCode",
      header: "UOM",
      width: "w-[80px]",
      cell: (row) => (
        <span className="text-muted-foreground text-sm">{row.uomCode || "—"}</span>
      ),
    },
    ...stageColumns,
    {
      id: "isActive",
      header: "Status",
      width: "w-[90px]",
      cell: (row) => (
        <Badge variant={row.isActive ? "default" : "secondary"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ]

  const actions: RowAction<RMGroupDetail>[] = [
    ...(onEditValuation
      ? [
          {
            id: "edit-valuation",
            label: "Edit Valuation Inputs",
            icon: <Pencil className="h-4 w-4" />,
            onClick: onEditValuation,
          } satisfies RowAction<RMGroupDetail>,
        ]
      : []),
    {
      id: "remove",
      label: "Remove",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onRemove,
      variant: "destructive",
    },
  ]

  return (
    <DataTable
      data={data}
      columns={columns}
      keyField="groupDetailId"
      actions={actions}
      isLoading={isLoading}
      tableId="rmgroup.detail.items.v2"
      stickyActions
      emptyMessage="No items in this group"
      emptyDescription="Add items using the picker above"
    />
  )
}
