"use client"

// Secondary chart grid — renders the optional layout_config.secondary_charts as
// additional ChartEngine instances driven by the same payload as the main chart.
//
// Cards with source_dashboard_code trigger a cross-dashboard fetch: they merge the
// primary series (renamed to primary_series_label) with a second series fetched from
// the referenced dashboard (renamed to source_series_label), then render a dual_line chart.

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ChartDataResponse } from "@/types/bi"
import { ChartEngine } from "@/components/bi/chart-engine/chart-engine"
import { ComponentDetailTable } from "./component-detail-table"
import { MonthlyDetailTable } from "./monthly-detail-table"
import { OtCompareCard } from "./ot-compare-card"
import { OtMixCard } from "./ot-mix-card"
import { OtParetoCard } from "./ot-pareto-card"

interface ComputedRatioDef {
  numerator: string
  denominator: string
  scale: number
  group_by: string
}

interface SecondaryChartDef {
  title?: string
  chart_type?: string
  available_chart_types?: string[]
  chart_config?: Record<string, unknown> & { computed_ratio?: ComputedRatioDef }
  span?: "full" | "half" | "third"
  source_dashboard_code?: string
  source_series_label?: string
  primary_series_label?: string
  /** When explicitly false, rows in this card are never drillable regardless of global drillEnabled. */
  drill_enabled?: boolean
}

interface SecondaryGridProps {
  layoutConfig: Record<string, unknown> | null
  data: ChartDataResponse
  /**
   * The dashboard code used to build the /computed BFF URL for computed_ratio cards.
   * When omitted, computed_ratio secondary charts will not render.
   */
  dashboardCode?: string
  /**
   * When set, data_table secondary charts are filtered to show only the points
   * whose category matches this period (YYYYMM). Other chart types are unaffected.
   */
  selectedPeriod?: string
  /** When true, the primary view config has drill enabled. */
  drillEnabled?: boolean
  /**
   * When false, we are already at terminal drill depth — no card should fire onDrill
   * even if drillEnabled=true and the card's own drill_enabled=true.
   */
  canDrillDeeper?: boolean
  /** Called when a data_table row is clicked; receives the new full drill path. */
  onDrill?: (path: string[]) => void
  /** Current drill path — used to build onRowClick for component_detail_table cards. */
  drillPath?: string[]
  /**
   * Active compare mode (e.g. "MoM", "YoY"). When non-empty and a secondary card is
   * chart_type==="line", a TrendCompareCard re-fetches with this compare to render both
   * the current period series and the comparison period series (dashed line).
   */
  compare?: string
  /**
   * Active group_1 filter values (e.g. ["Export", "Local"]). Forwarded to computed_ratio
   * cards so their /computed BFF calls respect the current filter-chip selection.
   */
  group1Filter?: string[]
  /**
   * Active group_2 filter values (e.g. ["ACY", "ATY"]). Forwarded to computed_ratio cards.
   */
  group2Filter?: string[]
}

function fmtPeriodLabel(yyyymm: string | undefined): string {
  if (!yyyymm || yyyymm.length !== 6) return yyyymm ?? ""
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  const m = parseInt(yyyymm.slice(4, 6), 10)
  return `${months[m - 1] ?? ""} ${yyyymm.slice(0, 4)}`
}

function humanizeType(t: string): string {
  const labels: Record<string, string> = {
    line: "Line",
    bar: "Bar",
    area: "Area",
    data_table: "Table",
    waterfall: "Waterfall",
    multi_line: "Multi-Line",
    dual_line: "Dual-Line",
  }
  return labels[t] ?? t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

// CrossDashboardCard fetches a secondary dashboard's data and merges it with the
// primary series before rendering the chart.
function CrossDashboardCard({
  s,
  primaryData,
  cardIndex,
  cardTypes,
  setCardTypes,
  height,
}: {
  s: SecondaryChartDef
  primaryData: ChartDataResponse
  cardIndex: number
  cardTypes: Record<number, string>
  setCardTypes: React.Dispatch<React.SetStateAction<Record<number, string>>>
  height: number
}) {
  const [secondaryData, setSecondaryData] = useState<ChartDataResponse | null>(null)
  const code = s.source_dashboard_code!

  useEffect(() => {
    // force_trend=true instructs the BFF to add x-force-trend gRPC metadata, so the
    // backend returns a time-series (trend) payload instead of a waterfall/categorical one.
    fetch(`/api/v1/finance/bi/dashboards/by-code/${code}/data?period=L24M&force_trend=true`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((j: { data?: ChartDataResponse }) => {
        if (j.data) setSecondaryData(j.data)
      })
      .catch(() => {})
  }, [code])

  const primaryLabel = s.primary_series_label ?? primaryData.series?.[0]?.name ?? "Primary"
  const secondaryLabel = s.source_series_label ?? code

  // Align secondary series points to primary categories.
  const cats = primaryData.categories ?? []
  const mergedSeries = [
    ...(primaryData.series?.slice(0, 1).map((ser) => ({ ...ser, name: primaryLabel })) ?? []),
    ...(secondaryData?.series?.slice(0, 1).map((ser) => ({ ...ser, name: secondaryLabel })) ?? []),
  ]
  const mergedData: ChartDataResponse = { ...primaryData, series: mergedSeries, categories: cats }

  const activeType = cardTypes[cardIndex] ?? s.chart_type ?? "dual_line"

  return (
    <Card className={cn(s.span === "full" && "lg:col-span-2")}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{s.title ?? "Detail"}</CardTitle>
          {(s.available_chart_types ?? []).length > 0 && (
            <select
              value={activeType}
              onChange={(e) => setCardTypes((prev) => ({ ...prev, [cardIndex]: e.target.value }))}
              className="rounded border border-border bg-background px-2 py-0.5 text-xs"
            >
              <option value={s.chart_type ?? "dual_line"}>{humanizeType(s.chart_type ?? "dual_line")}</option>
              {(s.available_chart_types ?? []).map((t) => (
                <option key={t} value={t}>
                  {humanizeType(t)}
                </option>
              ))}
            </select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {secondaryData === null ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : (
          <ChartEngine
            chartType={activeType}
            config={(s.chart_config ?? {}) as Record<string, unknown>}
            data={mergedData}
            height={height}
          />
        )}
      </CardContent>
    </Card>
  )
}

// ComputedRatioCard fetches a computed-ratio payload from the /computed BFF endpoint
// and renders it as a horizontal_bar chart. The computation (e.g. Margin % by Category)
// is performed in the backend via planComputedRatio — no client-side arithmetic needed.
function ComputedRatioCard({
  s,
  dashboardCode,
  selectedPeriod,
  cardIndex,
  cardTypes,
  setCardTypes,
  height,
  group1Filter,
  group2Filter,
}: {
  s: SecondaryChartDef
  dashboardCode: string
  selectedPeriod?: string
  cardIndex: number
  cardTypes: Record<number, string>
  setCardTypes: React.Dispatch<React.SetStateAction<Record<number, string>>>
  height: number
  group1Filter?: string[]
  group2Filter?: string[]
}) {
  const [computedData, setComputedData] = useState<ChartDataResponse | null>(null)
  // Raw denominator sums per category — used to show Net Sales + Margin $ in tooltip.
  const [denomSums, setDenomSums] = useState<Map<string, number>>(new Map())
  const cr = s.chart_config?.computed_ratio

  // Stable serialised filter strings to avoid unnecessary effect re-runs.
  const g1Key = (group1Filter ?? []).join(",")
  const g2Key = (group2Filter ?? []).join(",")

  useEffect(() => {
    if (!cr) return
    const buildUrl = (num: string, denom: string, scale: string) => {
      const url = new URL(
        `/api/v1/finance/bi/dashboards/by-code/${dashboardCode}/computed`,
        window.location.origin,
      )
      url.searchParams.set("numerator", num)
      url.searchParams.set("denominator", denom)
      url.searchParams.set("scale", scale)
      url.searchParams.set("group_by", cr.group_by)
      if (selectedPeriod) url.searchParams.set("period", selectedPeriod)
      if (g1Key) url.searchParams.set("group1_filter", g1Key)
      if (g2Key) url.searchParams.set("group2_filter", g2Key)
      return url.toString()
    }

    // Primary: the ratio itself (e.g. MARGIN / NETT_SALES * 100).
    fetch(buildUrl(cr.numerator, cr.denominator, String(cr.scale)), { credentials: "include" })
      .then((r) => r.json())
      .then((j: { data?: ChartDataResponse }) => { if (j.data) setComputedData(j.data) })
      .catch(() => {})

    // Secondary (only for ratio charts): raw denominator sums per category so the
    // tooltip can show Net Sales, Margin $, and Margin % instead of just Margin %.
    if (cr.denominator) {
      fetch(buildUrl(cr.denominator, "", "1"), { credentials: "include" })
        .then((r) => r.json())
        .then((j: { data?: ChartDataResponse }) => {
          if (!j.data) return
          const map = new Map<string, number>()
          for (const ser of j.data.series ?? []) {
            // Shape returns N series × 1 point; series.name = category.
            if (ser.name) map.set(ser.name, ser.points?.[0]?.value ?? 0)
          }
          setDenomSums(map)
        })
        .catch(() => {})
    }
  }, [dashboardCode, cr, selectedPeriod, g1Key, g2Key])

  const activeType = cardTypes[cardIndex] ?? s.chart_type ?? "horizontal_bar"

  const emptyChart: ChartDataResponse = {
    config: undefined,
    series: [],
    categories: [],
    kpis: [],
    drillContext: undefined,
    meta: undefined,
  }

  // The computed endpoint returns N series × 1 point (one series per group_by bucket).
  // Donut / horizontal_bar / data_table expect 1 series × N points (one point per bucket).
  // Pivot here so all chart types receive the correct shape.
  //
  // When denomSums is available (ratio charts), inject meta = { denom_val, numer_val }
  // so horizontal-bar-chart.tsx can render a rich tooltip (Net Sales + Margin $ + %).
  const chartData: ChartDataResponse = (() => {
    if (!computedData?.series?.length) return computedData ?? emptyChart
    const allSinglePoint = computedData.series.every((s) => (s.points?.length ?? 0) <= 1)
    if (!allSinglePoint) return computedData
    const mergedPoints = computedData.series
      .filter((ser) => ser.name && ser.name !== "")
      .map((ser) => {
        const ratioVal = ser.points?.[0]?.value ?? 0
        const denomVal = denomSums.get(ser.name) ?? 0
        const scale = cr?.scale ?? 100
        const numerVal = scale > 0 ? denomVal * ratioVal / scale : 0
        return {
          category: ser.name,
          value: ratioVal,
          label: "",
          meta: denomSums.size > 0 ? { denom_val: denomVal, numer_val: numerVal } : undefined,
        }
      })
    return {
      ...computedData,
      categories: mergedPoints.map((p) => p.category),
      series: [{ name: cr?.numerator ?? "Value", libHint: "", points: mergedPoints }],
    }
  })()

  return (
    <Card className={cn(s.span === "full" && "lg:col-span-2")}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{s.title ?? "Margin %"}</CardTitle>
          {(s.available_chart_types ?? []).length > 0 && (
            <select
              value={activeType}
              onChange={(e) => setCardTypes((prev) => ({ ...prev, [cardIndex]: e.target.value }))}
              className="rounded border border-border bg-background px-2 py-0.5 text-xs"
            >
              <option value={s.chart_type ?? "horizontal_bar"}>
                {humanizeType(s.chart_type ?? "horizontal_bar")}
              </option>
              {(s.available_chart_types ?? []).map((t) => (
                <option key={t} value={t}>
                  {humanizeType(t)}
                </option>
              ))}
            </select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {computedData === null ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : (
          <ChartEngine
            chartType={activeType}
            config={(s.chart_config ?? {}) as Record<string, unknown>}
            data={chartData}
            height={height}
          />
        )}
      </CardContent>
    </Card>
  )
}

// TrendCompareCard: for line-type secondary cards, re-fetches the dashboard trend data
// with the active compare mode so both current + comparison period series are shown.
// The line chart already renders series index>0 as a dashed line (strokeDasharray="4 4").
function TrendCompareCard({
  s,
  dashboardCode,
  compare,
  cardIndex,
  cardTypes,
  setCardTypes,
  height,
}: {
  s: SecondaryChartDef
  dashboardCode: string
  compare: string
  cardIndex: number
  cardTypes: Record<number, string>
  setCardTypes: React.Dispatch<React.SetStateAction<Record<number, string>>>
  height: number
}) {
  const [trendData, setTrendData] = useState<ChartDataResponse | null>(null)

  useEffect(() => {
    const params = new URLSearchParams({ period: "L24M", force_trend: "true" })
    if (compare && compare !== "NONE" && compare !== "none") {
      params.set("compare", compare)
    }
    fetch(`/api/v1/finance/bi/dashboards/by-code/${dashboardCode}/data?${params.toString()}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((j: { data?: ChartDataResponse }) => {
        if (j.data) setTrendData(j.data)
      })
      .catch(() => {})
  }, [dashboardCode, compare])

  const activeType = cardTypes[cardIndex] ?? s.chart_type ?? "line"

  return (
    <Card className={cn(s.span === "full" && "lg:col-span-2")}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{s.title ?? "Trend"}</CardTitle>
          {(s.available_chart_types ?? []).length > 0 && (
            <select
              value={activeType}
              onChange={(e) => setCardTypes((prev) => ({ ...prev, [cardIndex]: e.target.value }))}
              className="rounded border border-border bg-background px-2 py-0.5 text-xs"
            >
              <option value={s.chart_type ?? "line"}>{humanizeType(s.chart_type ?? "line")}</option>
              {(s.available_chart_types ?? []).map((t) => (
                <option key={t} value={t}>
                  {humanizeType(t)}
                </option>
              ))}
            </select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {trendData === null ? (
          <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
            Loading…
          </div>
        ) : (
          <ChartEngine
            chartType={activeType}
            config={(s.chart_config ?? {}) as Record<string, unknown>}
            data={trendData}
            height={height}
          />
        )}
      </CardContent>
    </Card>
  )
}

export function SecondaryGrid({ layoutConfig, data, dashboardCode, selectedPeriod, drillEnabled, canDrillDeeper, onDrill, drillPath, compare, group1Filter, group2Filter }: SecondaryGridProps) {
  const secondary = (layoutConfig?.secondary_charts as SecondaryChartDef[] | undefined) ?? []
  const [cardTypes, setCardTypes] = useState<Record<number, string>>({})

  if (secondary.length === 0) return null

  const getActiveType = (s: SecondaryChartDef, i: number): string =>
    cardTypes[i] ?? s.chart_type ?? "line"

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {secondary.map((s, i) => {
        // Component Detail table — 6-column MoM/YoY breakdown for a categorical dashboard.
        if (s.chart_type === "component_detail_table") {
          const cfg = (s.chart_config ?? {}) as Record<string, unknown>
          const sCardDrillEnabled = s.drill_enabled !== false
          // Once drillPath has any element, the component-detail table shows group_3 data —
          // that is the terminal level, so further drilling is not possible.
          const drillDepth = drillPath?.length ?? 0
          const isTerminalDrill = drillDepth > 0
          const canClick = drillEnabled && canDrillDeeper && sCardDrillEnabled && !!onDrill && !isTerminalDrill
          const handleRowClick = canClick
            ? (category: string) => onDrill([...(drillPath ?? []), category])
            : undefined
          return (
            <Card key={`${s.title ?? "component-detail"}-${i}`} className={cn(s.span === "full" && "lg:col-span-2")}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  {s.title ?? "Component Detail"}
                  {selectedPeriod && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      — {fmtPeriodLabel(selectedPeriod)}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ComponentDetailTable
                  dashboardCode={dashboardCode ?? ""}
                  period={selectedPeriod}
                  group1={cfg.group1 as string | undefined}
                  numberFormat={cfg.number_format as string | undefined}
                  decimals={cfg.decimals as number | undefined}
                  onRowClick={handleRowClick}
                  drillPath={drillPath}
                />
              </CardContent>
            </Card>
          )
        }

        // Monthly Detail table — 4-column month/YoY/vs-compare breakdown.
        if (s.chart_type === "monthly_detail_table") {
          const cfg = (s.chart_config ?? {}) as Record<string, unknown>
          return (
            <Card key={`${s.title ?? "monthly-detail"}-${i}`} className={cn(s.span === "full" && "lg:col-span-2")}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{s.title ?? "Monthly Detail"}</CardTitle>
              </CardHeader>
              <CardContent>
                <MonthlyDetailTable
                  dashboardCode={dashboardCode ?? ""}
                  compareCode={cfg.compare_code as string | undefined}
                  compareLabel={cfg.compare_label as string | undefined}
                  metricName={cfg.metric_name as string | undefined}
                  numberFormat={cfg.number_format as string | undefined}
                  decimals={cfg.decimals as number | undefined}
                />
              </CardContent>
            </Card>
          )
        }

        // OT type mix (H036): stacked 100% share per month from the primary data.
        if (s.chart_type === "ot_mix") {
          const cfg = (s.chart_config ?? {}) as Record<string, unknown>
          return (
            <OtMixCard
              key={`${s.title ?? "ot-mix"}-${i}`}
              title={s.title}
              data={data}
              decimals={cfg.decimals as number | undefined}
              span={s.span}
            />
          )
        }

        // OT concentration trend (H037): top-10% share of OT hours per month, from companion dashboard.
        if (s.chart_type === "ot_pareto") {
          const cfg = (s.chart_config ?? {}) as Record<string, unknown>
          // Companion dashboard comes from the seeded chart_config (000566); no hardcoded fallback.
          const sourceCode = cfg.source_dashboard_code as string | undefined
          if (!sourceCode) return null
          return (
            <OtParetoCard
              key={`${s.title ?? "ot-pareto"}-${i}`}
              title={s.title}
              sourceDashboardCode={sourceCode}
              topKey={cfg.top_key as string | undefined}
              totalKey={cfg.total_key as string | undefined}
              periodCalendar={cfg.period_calendar as string | undefined}
              decimals={cfg.decimals as number | undefined}
              span={s.span}
            />
          )
        }

        // OT period comparison (H041): grouped bar + Δ tables, fetched per period via /computed.
        if (s.chart_type === "ot_compare" && dashboardCode) {
          const cfg = (s.chart_config ?? {}) as Record<string, unknown>
          return (
            <OtCompareCard
              key={`${s.title ?? "ot-compare"}-${i}`}
              title={s.title}
              dashboardCode={dashboardCode}
              metric={(cfg.metric as string | undefined) ?? "VALUE"}
              periodCalendar={cfg.period_calendar as string | undefined}
              decimals={cfg.decimals as number | undefined}
              selectedPeriod={selectedPeriod ?? [...(data.categories ?? [])].reverse().find((c) => /^\d{6}$/.test(c))}
              span={s.span}
              group1Filter={group1Filter}
              group2Filter={group2Filter}
            />
          )
        }

        // Cross-dashboard cards get their own component that fetches secondary data.
        if (s.source_dashboard_code) {
          return (
            <CrossDashboardCard
              key={`${s.title ?? "chart"}-${i}`}
              s={s}
              primaryData={data}
              cardIndex={i}
              cardTypes={cardTypes}
              setCardTypes={setCardTypes}
              height={280}
            />
          )
        }

        // Computed-ratio cards fetch from the /computed BFF endpoint (backend planComputedRatio).
        if (s.chart_config?.computed_ratio && dashboardCode) {
          return (
            <ComputedRatioCard
              key={`${s.title ?? "computed"}-${i}`}
              s={s}
              dashboardCode={dashboardCode}
              selectedPeriod={selectedPeriod}
              cardIndex={i}
              cardTypes={cardTypes}
              setCardTypes={setCardTypes}
              height={280}
              group1Filter={group1Filter}
              group2Filter={group2Filter}
            />
          )
        }

        // Line-type cards with an active compare: use TrendCompareCard so the card
        // independently fetches trend data with the comparison series, resulting in
        // both the current period line and a dashed comparison line on the same chart.
        if (
          s.chart_type === "line" &&
          dashboardCode &&
          compare &&
          compare !== "NONE" &&
          compare !== "none"
        ) {
          return (
            <TrendCompareCard
              key={`${s.title ?? "trend"}-${i}`}
              s={s}
              dashboardCode={dashboardCode}
              compare={compare}
              cardIndex={i}
              cardTypes={cardTypes}
              setCardTypes={setCardTypes}
              height={280}
            />
          )
        }

        const activeType = getActiveType(s, i)

        // For data_table charts, filter points to the selected period (client-side only).
        // Pivot tables (WORKFORCE: categories are dept / IYYY-Www, not YYYYMM) are skipped.
        const isPeriodKeyed = (data.series ?? []).some((ser) =>
          (ser.points ?? []).some((p) => /^\d{6}$/.test(p.category ?? "")),
        )
        const filteredData =
          selectedPeriod && activeType === "data_table" && isPeriodKeyed
            ? {
                ...data,
                series:
                  data.series?.map((ser) => ({
                    ...ser,
                    points: (ser.points ?? []).filter((p) => p.category === selectedPeriod),
                  })) ?? [],
              }
            : data

        return (
          <Card
            key={`${s.title ?? "chart"}-${i}`}
            className={cn(s.span === "full" && "lg:col-span-2")}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">
                  {s.title ?? "Detail"}
                  {selectedPeriod && activeType === "data_table" && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      — {selectedPeriod}
                    </span>
                  )}
                </CardTitle>
                {(s.available_chart_types ?? []).length > 0 && (
                  <select
                    value={activeType}
                    onChange={(e) => setCardTypes((prev) => ({ ...prev, [i]: e.target.value }))}
                    className="rounded border border-border bg-background px-2 py-0.5 text-xs"
                  >
                    <option value={s.chart_type ?? "line"}>{humanizeType(s.chart_type ?? "line")}</option>
                    {(s.available_chart_types ?? []).map((t) => (
                      <option key={t} value={t}>
                        {humanizeType(t)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ChartEngine
                chartType={activeType}
                config={s.chart_config ?? {}}
                data={filteredData}
                onDrill={
                  activeType === "data_table" &&
                  drillEnabled &&
                  canDrillDeeper &&
                  s.drill_enabled !== false &&
                  onDrill
                    ? (path) => onDrill(path)
                    : undefined
                }
                height={280}
              />
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
