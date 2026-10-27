"use client"

// KPI grid — renders the KpiResult[] from a chart-data payload as responsive cards.

import { ArrowDown, ArrowUp, Minus } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { KpiResult } from "@/types/bi"
import { MiniSparkline } from "./mini-sparkline"

interface KpiGridProps {
  kpis: KpiResult[]
}

export function KpiGrid({ kpis }: KpiGridProps) {
  if (kpis.length === 0) return null

  // Responsive grid columns: adapt to count so 5 KPIs don't wrap awkwardly.
  const gridCols =
    kpis.length === 5
      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
      : kpis.length === 4
        ? "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4"
        : kpis.length === 3
          ? "grid-cols-1 sm:grid-cols-3"
          : "grid-cols-2 sm:grid-cols-2 xl:grid-cols-4"

  // Compact padding when there are many widgets to keep them from overflowing.
  const compactCard = kpis.length >= 5

  return (
    <div className={`grid gap-4 ${gridCols}`}>
      {kpis.map((k, i) => {
        const hasDelta = k.comparePeriodLabel !== ""
        // 0 vs 0 (e.g. Holiday with no OT in both months) is neutral, not an improvement.
        const flat = k.deltaPct === 0
        return (
          <Card key={`${k.label}-${i}`}>
            <CardContent className={compactCard ? "p-3" : "p-4"}>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {k.label}
              </div>
              <div className="mt-1 text-2xl font-bold tabular-nums">{k.valueFormatted}</div>
              {hasDelta && (
                <div
                  className={cn(
                    "mt-1 flex items-center gap-1 text-xs",
                    flat ? "text-muted-foreground" : k.improving ? "text-emerald-600" : "text-red-600"
                  )}
                >
                  {flat ? <Minus className="h-3 w-3" /> : k.improving ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {k.deltaPct > 0 ? "+" : ""}
                  {k.deltaPct.toFixed(1)}% vs {k.comparePeriodLabel}
                </div>
              )}
              {k.sparkline && k.sparkline.length > 1 && (
                <MiniSparkline values={k.sparkline} />
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
