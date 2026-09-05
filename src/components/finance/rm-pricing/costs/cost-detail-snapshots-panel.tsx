"use client"

// V2: Per-(item, grade) cost detail snapshot — mirrors Excel A9:AS12.
// Column order matches the Testing_RM_Cost.xlsx detail layout. Fix Rate
// (column AM) is editable; saving triggers FL chain recompute on the row
// and the parent fl_rate (= MAX) at server side.

import { useState } from "react"
import { Loader2, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTable, type ColumnDef } from "@/components/shared"

import {
  useCostDetails,
  useUpdateCostDetailFixRate,
} from "@/hooks/finance/use-rm-cost"
import type { RMCostDetail } from "@/types/finance/rm-cost"

interface Props {
  rmCostId: string
}

function formatNum(v: number | undefined | null, digits = 4): string {
  if (v === undefined || v === null) return "—"
  return v.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  })
}

/** Format a decimal-stored percent (0.04) as whole-percent string ("4.00"). */
function formatPctFromDecimal(v: number | undefined | null, digits = 2): string {
  if (v === undefined || v === null) return "—"
  return (v * 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  })
}

function FixRateCell({
  costDetailId,
  initialFixRate,
}: {
  costDetailId: string
  initialFixRate: number | undefined
}) {
  const [value, setValue] = useState<string>(
    initialFixRate !== undefined && initialFixRate !== null ? String(initialFixRate) : "",
  )
  const mutation = useUpdateCostDetailFixRate()

  const save = async () => {
    const trimmed = value.trim()
    const fixRate = trimmed === "" ? null : parseFloat(trimmed)
    await mutation.mutateAsync({ costDetailId, fixRate })
  }

  const dirty =
    (initialFixRate !== undefined && initialFixRate !== null
      ? String(initialFixRate)
      : "") !== value

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        step="0.0001"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-7 w-24 font-mono text-xs text-right"
        placeholder="0.00"
      />
      <Button
        size="icon"
        variant="outline"
        className="h-7 w-7"
        onClick={save}
        disabled={!dirty || mutation.isPending}
        title="Save fix rate"
      >
        {mutation.isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Save className="h-3 w-3" />
        )}
      </Button>
    </div>
  )
}

const num = "text-right font-mono text-xs"
const numHead = "text-right"
const numW = "w-[100px]"

export function CostDetailSnapshotsPanel({ rmCostId }: Props) {
  const { data, isLoading } = useCostDetails(rmCostId)
  const details = data?.data || []

  // Column order mirrors Excel header row 9 (A9..AS9).
  const columns: ColumnDef<RMCostDetail>[] = [
    {
      id: "itemCode",
      header: "Item",
      widthPx: 120,
      sticky: "left",
      canHide: false,
      cell: (r) => <span className="font-mono text-xs">{r.itemCode || "—"}</span>,
    },
    {
      id: "gradeCode",
      header: "Grade",
      widthPx: 80,
      sticky: "left",
      canHide: false,
      cell: (r) => <span className="text-xs">{r.gradeCode || "—"}</span>,
    },

    // Per-detail valuation inputs (F..I). Anti/duty are stored decimal — show as percent.
    { id: "freightRate", header: "Freight", width: numW, headerClassName: numHead, cellClassName: num, defaultHidden: true, cell: (r) => formatNum(r.freightRate, 6) },
    { id: "antiDumpingPct", header: "Anti %", width: numW, headerClassName: numHead, cellClassName: num, defaultHidden: true, cell: (r) => formatPctFromDecimal(r.antiDumpingPct) },
    { id: "dutyPct", header: "Duty %", width: numW, headerClassName: numHead, cellClassName: num, defaultHidden: true, cell: (r) => formatPctFromDecimal(r.dutyPct) },
    { id: "transportRate", header: "Transport", width: numW, headerClassName: numHead, cellClassName: num, defaultHidden: true, cell: (r) => formatNum(r.transportRate, 6) },

    // Consumption block (J..V).
    { id: "consVal", header: "Cons Val", width: "w-[120px]", headerClassName: numHead, cellClassName: num, defaultHidden: true, cell: (r) => formatNum(r.consVal, 2) },
    { id: "consQty", header: "Cons Qty", width: "w-[120px]", headerClassName: numHead, cellClassName: num, defaultHidden: true, cell: (r) => formatNum(r.consQty, 2) },
    { id: "consRate", header: "Cons Rate", width: numW, headerClassName: numHead, cellClassName: num, cell: (r) => formatNum(r.consRate) },
    { id: "consFreightVal", header: "Cons Freight Val", width: "w-[130px]", headerClassName: numHead, cellClassName: num, defaultHidden: true, cell: (r) => formatNum(r.consFreightVal, 2) },
    { id: "consValBased", header: "Cons Val Based", width: "w-[130px]", headerClassName: numHead, cellClassName: num, defaultHidden: true, cell: (r) => formatNum(r.consValBased, 2) },
    { id: "consRateBased", header: "Cons Rate Based", width: "w-[130px]", headerClassName: numHead, cellClassName: num, defaultHidden: true, cell: (r) => formatNum(r.consRateBased) },
    { id: "consAntiDumpingVal", header: "Cons Anti Val", width: "w-[120px]", headerClassName: numHead, cellClassName: num, defaultHidden: true, cell: (r) => formatNum(r.consAntiDumpingVal, 2) },
    { id: "consAntiDumpingRate", header: "Cons Anti Rate", width: "w-[120px]", headerClassName: numHead, cellClassName: num, defaultHidden: true, cell: (r) => formatNum(r.consAntiDumpingRate) },
    { id: "consDutyVal", header: "Cons Duty Val", width: "w-[120px]", headerClassName: numHead, cellClassName: num, defaultHidden: true, cell: (r) => formatNum(r.consDutyVal, 2) },
    { id: "consDutyRate", header: "Cons Duty Rate", width: "w-[120px]", headerClassName: numHead, cellClassName: num, defaultHidden: true, cell: (r) => formatNum(r.consDutyRate) },
    { id: "consTransportVal", header: "Cons Tr. Val", width: "w-[120px]", headerClassName: numHead, cellClassName: num, defaultHidden: true, cell: (r) => formatNum(r.consTransportVal, 2) },
    { id: "consTransportRate", header: "Cons Tr. Rate", width: "w-[120px]", headerClassName: numHead, cellClassName: num, defaultHidden: true, cell: (r) => formatNum(r.consTransportRate) },
    { id: "consLandedCost", header: "CL", width: numW, headerClassName: numHead, cellClassName: "text-right font-mono text-xs font-semibold", cell: (r) => formatNum(r.consLandedCost) },

    // Stock block (W..AI).
    { id: "stockVal", header: "Stock Val", width: "w-[120px]", headerClassName: numHead, cellClassName: num, defaultHidden: true, cell: (r) => formatNum(r.stockVal, 2) },
    { id: "stockQty", header: "Stock Qty", width: "w-[120px]", headerClassName: numHead, cellClassName: num, defaultHidden: true, cell: (r) => formatNum(r.stockQty, 2) },
    { id: "stockRate", header: "Stock Rate", width: numW, headerClassName: numHead, cellClassName: num, cell: (r) => formatNum(r.stockRate) },
    { id: "stockFreightVal", header: "Stock Freight Val", width: "w-[140px]", headerClassName: numHead, cellClassName: num, defaultHidden: true, cell: (r) => formatNum(r.stockFreightVal, 2) },
    { id: "stockValBased", header: "Stock Val Based", width: "w-[130px]", headerClassName: numHead, cellClassName: num, defaultHidden: true, cell: (r) => formatNum(r.stockValBased, 2) },
    { id: "stockRateBased", header: "Stock Rate Based", width: "w-[130px]", headerClassName: numHead, cellClassName: num, defaultHidden: true, cell: (r) => formatNum(r.stockRateBased) },
    { id: "stockAntiDumpingVal", header: "Stock Anti Val", width: "w-[120px]", headerClassName: numHead, cellClassName: num, defaultHidden: true, cell: (r) => formatNum(r.stockAntiDumpingVal, 2) },
    { id: "stockAntiDumpingRate", header: "Stock Anti Rate", width: "w-[120px]", headerClassName: numHead, cellClassName: num, defaultHidden: true, cell: (r) => formatNum(r.stockAntiDumpingRate) },
    { id: "stockDutyVal", header: "Stock Duty Val", width: "w-[120px]", headerClassName: numHead, cellClassName: num, defaultHidden: true, cell: (r) => formatNum(r.stockDutyVal, 2) },
    { id: "stockDutyRate", header: "Stock Duty Rate", width: "w-[120px]", headerClassName: numHead, cellClassName: num, defaultHidden: true, cell: (r) => formatNum(r.stockDutyRate) },
    { id: "stockTransportVal", header: "Stock Tr. Val", width: "w-[120px]", headerClassName: numHead, cellClassName: num, defaultHidden: true, cell: (r) => formatNum(r.stockTransportVal, 2) },
    { id: "stockTransportRate", header: "Stock Tr. Rate", width: "w-[120px]", headerClassName: numHead, cellClassName: num, defaultHidden: true, cell: (r) => formatNum(r.stockTransportRate) },
    { id: "stockLandedCost", header: "SL", width: numW, headerClassName: numHead, cellClassName: "text-right font-mono text-xs font-semibold", cell: (r) => formatNum(r.stockLandedCost) },

    // PO block (AJ..AL).
    { id: "poVal", header: "PO Val", width: "w-[120px]", headerClassName: numHead, cellClassName: num, defaultHidden: true, cell: (r) => formatNum(r.poVal, 2) },
    { id: "poQty", header: "PO Qty", width: "w-[120px]", headerClassName: numHead, cellClassName: num, defaultHidden: true, cell: (r) => formatNum(r.poQty, 2) },
    { id: "poRate", header: "PO Rate", width: numW, headerClassName: numHead, cellClassName: num, cell: (r) => formatNum(r.poRate) },

    // Fix block (AM..AS) — AM editable.
    {
      id: "fixRate",
      header: "Fix Rate (edit)",
      width: "w-[150px]",
      cell: (r) => (
        <FixRateCell costDetailId={r.costDetailId} initialFixRate={r.fixRate ?? undefined} />
      ),
    },
    { id: "fixFreightRate", header: "Fix Freight", width: numW, headerClassName: numHead, cellClassName: num, defaultHidden: true, cell: (r) => formatNum(r.fixFreightRate) },
    { id: "fixRateBased", header: "Fix Rate Based", width: "w-[130px]", headerClassName: numHead, cellClassName: num, defaultHidden: true, cell: (r) => formatNum(r.fixRateBased) },
    { id: "fixAntiDumpingRate", header: "Fix Anti Rate", width: "w-[120px]", headerClassName: numHead, cellClassName: num, defaultHidden: true, cell: (r) => formatNum(r.fixAntiDumpingRate) },
    { id: "fixDutyRate", header: "Fix Duty Rate", width: "w-[120px]", headerClassName: numHead, cellClassName: num, defaultHidden: true, cell: (r) => formatNum(r.fixDutyRate) },
    { id: "fixTransportRate", header: "Fix Tr. Rate", width: numW, headerClassName: numHead, cellClassName: num, defaultHidden: true, cell: (r) => formatNum(r.fixTransportRate) },
    { id: "fixLandedCost", header: "FL", width: numW, headerClassName: numHead, cellClassName: "text-right font-mono text-xs font-semibold", cell: (r) => formatNum(r.fixLandedCost) },
  ]

  if (!isLoading && details.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        No detail snapshots yet. Run the V2 calculation to generate them.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Fix Rate edits here apply to this period only and will be overwritten by the next
        full recalculation. To set a permanent value, edit &quot;Default Value&quot; on the item
        in the RM Group page.
      </p>
      <DataTable
        data={details}
        columns={columns}
        keyField="costDetailId"
        isLoading={isLoading}
        tableId="rmcost.detail.snapshot"
        emptyMessage="No detail snapshots"
        emptyDescription="Run the V2 calculation to generate them"
      />
    </div>
  )
}
