"use client"

import { useState } from "react"
import { ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { usePermissionContext } from "@/providers/permission-provider"
import { useParamSummary } from "@/hooks/finance/use-param-summary"
import { ParamDetailDrawer } from "./param-detail-drawer"

interface Props {
  requestId: number
  routeLocked?: boolean
}

function fillStatusBadge(filled: number, total: number, hasRejected: boolean) {
  if (total === 0) return null
  if (hasRejected) {
    return (
      <Badge className="border-red-200 bg-red-100 text-[10px] text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
        ✗ Rejected
      </Badge>
    )
  }
  if (filled === total) {
    return (
      <Badge className="border-green-200 bg-green-100 text-[10px] text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400">
        ✓ Complete
      </Badge>
    )
  }
  return (
    <Badge className="border-yellow-200 bg-yellow-100 text-[10px] text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400">
      ⏳ In progress
    </Badge>
  )
}

export function ParamSummaryPanel({ requestId, routeLocked = false }: Props) {
  const { data, isLoading } = useParamSummary(requestId)
  const { hasPermission } = usePermissionContext()
  const canEdit = hasPermission("finance.costing.paramvalue.update")

  const [selectedId, setSelectedId] = useState<number | null>(null)
  // Derive the live product from the current query data so the drawer always
  // reflects the latest values after an override save invalidates the cache.
  const selectedProduct = selectedId !== null
    ? (data?.products.find((p) => p.productSysId === selectedId) ?? null)
    : null

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.products.length === 0) return null

  const allFilled = data.filledParams === data.totalParams && data.totalParams > 0

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-semibold">Parameter Summary</CardTitle>
          <span
            className={`text-xs font-normal ${
              allFilled
                ? "text-green-600 dark:text-green-400"
                : "text-amber-600 dark:text-amber-400"
            }`}
          >
            {data.filledParams} / {data.totalParams} filled
          </span>
        </CardHeader>
        <CardContent className="pt-0 px-2 pb-2">
          <div className="divide-y">
            {data.products.map((product) => {
              const productFilled = product.levels.reduce((s, l) => s + l.filledParams, 0)
              const productTotal = product.levels.reduce((s, l) => s + l.totalParams, 0)
              const hasRejected = product.levels.some((l) => l.taskStatus === "REJECTED")
              return (
                <button
                  key={product.productSysId}
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs transition-colors hover:bg-muted/50"
                  onClick={() => setSelectedId(product.productSysId)}
                >
                  <span className="flex-1 min-w-0">
                    <span className="font-mono font-medium truncate block">{product.productCode}</span>
                    {product.productName && <span className="text-xs text-muted-foreground truncate block">{product.productName}</span>}
                    <span className="text-muted-foreground">
                      Level {product.levels.map(l => l.routeLevel).sort((a,b)=>a-b).join(", ")} · {productFilled}/{productTotal} params
                    </span>
                  </span>
                  {fillStatusBadge(productFilled, productTotal, hasRejected)}
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {selectedProduct && (
        <ParamDetailDrawer
          open
          onClose={() => setSelectedId(null)}
          requestId={requestId}
          product={selectedProduct}
          canEdit={canEdit}
          routeLocked={routeLocked}
        />
      )}
    </>
  )
}
