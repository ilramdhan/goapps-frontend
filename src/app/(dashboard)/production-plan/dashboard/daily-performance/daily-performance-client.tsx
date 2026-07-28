"use client"

import { useState } from "react"
import dynamic from "next/dynamic"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeader } from "@/components/common/page-header"
import { KpiCard, KpiGrid } from "@/components/common"
import { EmptyState } from "@/components/common/empty-state"
import { ChartSkeleton } from "@/components/loading"

import { useDailyPerformance } from "@/hooks/ppc/use-dashboard"
import { AREA_OPTIONS, todayIso } from "@/types/ppc/common"

// ECharts heatmap client-only (avoids SSR canvas issues).
const McEffHeatmap = dynamic(
  () => import("@/components/ppc/dashboard/mc-eff-heatmap").then((m) => m.McEffHeatmap),
  { ssr: false, loading: () => <ChartSkeleton /> }
)

function kpiValue(v: string, unit: string): string {
  const n = Number(v || 0)
  if (unit === "PCT") return `${n.toFixed(1)}%`
  if (unit === "HOURS") return `${n.toFixed(1)} h`
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

export default function DailyPerformanceClient() {
  const [date, setDate] = useState(todayIso())
  const [area, setArea] = useState(0)
  const [excluding, setExcluding] = useState(false)

  const { data, isLoading } = useDailyPerformance({ date, area, excluding })

  const kpis = data?.kpis ?? []
  const cells = data?.mcEffGrid ?? []

  return (
    <div className="space-y-6">
      <PageHeader title="Daily Performance" subtitle="Efficiency KPIs and machine grid">
        <div className="flex flex-wrap items-center gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-[160px]" />
          <Select value={String(area)} onValueChange={(v) => setArea(Number(v))}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Area" />
            </SelectTrigger>
            <SelectContent>
              {AREA_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch id="excluding" checked={excluding} onCheckedChange={setExcluding} />
            <Label htmlFor="excluding" className="text-sm">
              Excluding
            </Label>
          </div>
        </div>
      </PageHeader>

      {kpis.length === 0 && !isLoading ? (
        <EmptyState title="No KPIs" description="No performance data for this date." />
      ) : (
        <KpiGrid cols={4}>
          {(isLoading ? Array.from({ length: 4 }) : kpis).map((k, i) => {
            const kpi = k as (typeof kpis)[number] | undefined
            return (
              <KpiCard
                key={kpi?.key ?? i}
                title={kpi ? `${kpi.label} · MTD ${kpiValue(kpi.valueMtd, kpi.unit)}` : "—"}
                value={kpi ? kpiValue(kpi.valueToday, kpi.unit) : "—"}
                loading={isLoading}
              />
            )
          })}
        </KpiGrid>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Machine Efficiency Grid</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ChartSkeleton />
          ) : cells.length === 0 ? (
            <EmptyState title="No efficiency data" description="No machine efficiency recorded for this date." />
          ) : (
            <McEffHeatmap cells={cells} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
