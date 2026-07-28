"use client"

import { useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/common/page-header"
import { DataTable, type ColumnDef } from "@/components/shared"

import { useBalanceForSale } from "@/hooks/ppc/use-dashboard"
import type { BalanceForSaleRow } from "@/types/ppc/dashboard"

const num = (s: string) => Number(s || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })

const columns: ColumnDef<BalanceForSaleRow>[] = [
  { id: "productCode", header: "Product", accessorKey: "productCode", width: "w-[140px]" },
  { id: "productName", header: "Name", accessorKey: "productName" },
  { id: "currentStockAx", header: "Stock (AX)", cell: (r) => num(r.currentStockAx) },
  { id: "woRunningOutputEst", header: "WO Est.", cell: (r) => num(r.woRunningOutputEst) },
  { id: "mtsPlanQty", header: "MTS Plan", cell: (r) => num(r.mtsPlanQty) },
  { id: "committedContractQty", header: "Committed", cell: (r) => num(r.committedContractQty) },
  {
    id: "balanceForSale",
    header: "Balance",
    cell: (r) => {
      const v = Number(r.balanceForSale || 0)
      const cls = v < 0 ? "text-destructive font-medium" : "text-emerald-600 dark:text-emerald-400 font-medium"
      return <span className={cls}>{num(r.balanceForSale)}</span>
    },
  },
]

export default function BalanceForSaleClient() {
  const [commodityWatchOnly, setCommodityWatchOnly] = useState(true)
  const { data, isLoading } = useBalanceForSale({ commodityWatchOnly })

  return (
    <div className="space-y-6">
      <PageHeader title="Balance for Sale" subtitle="Sellable balance per product">
        <div className="flex items-center gap-2">
          <Switch id="commodity-watch" checked={commodityWatchOnly} onCheckedChange={setCommodityWatchOnly} />
          <Label htmlFor="commodity-watch" className="text-sm">
            Commodity-watch only
          </Label>
        </div>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Balance for Sale</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={data ?? []}
            columns={columns}
            isLoading={isLoading}
            keyField="cpmProductSysId"
            emptyMessage="No products"
            emptyDescription="No balance-for-sale rows for the current filter."
          />
        </CardContent>
      </Card>
    </div>
  )
}
