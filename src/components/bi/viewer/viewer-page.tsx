"use client"

// ViewerPage — composes the full executive-dashboard viewer for one dashboard code.

import { useRef, useCallback, useState } from "react"
import { RefreshCw } from "lucide-react"
import { TREND_CHART_TYPES } from "@/hooks/bi/use-chart-data"

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/common/page-header"
import { useUrlState } from "@/lib/hooks"
import { usePermission } from "@/lib/hooks/use-permission"
import { useDashboardByCode } from "@/hooks/bi/use-dashboard"
import { useDashboardData } from "@/hooks/bi/use-chart-data"
import { useFactDistincts } from "@/hooks/bi/use-fact-distincts"
import { chartTypeToString, periodeGrainToString, type ViewerState, DEFAULT_VIEWER_STATE, presetsForGrain, type CompareKey, type ViewModeConfig } from "@/types/bi"
import { isEmpty, toRechartsRows } from "@/lib/bi/data-adapter"

import { ChartEngine } from "@/components/bi/chart-engine/chart-engine"
import { ExportPngButton } from "@/components/bi/chart-engine/export-png-button"
import { FullscreenButton } from "@/components/bi/chart-engine/fullscreen-button"
import { FilterBar } from "./filter-bar"
import { FilterChips } from "./filter-chips"
import { KpiGrid } from "./kpi-grid"
import { DrillBreadcrumb } from "./drill-breadcrumb"
import { SecondaryGrid } from "./secondary-grid"
import { WorkforceNav } from "./workforce-nav"
import { OtOverMonthSection, type OtOverMonthConfig } from "./ot-over-month-section"
import { EmployeeOTControls } from "./employee-ot-controls"
import { EMPLOYEE_OT_MODE, EMPLOYEE_OT_PRESETS, readEmployeeOTBlock } from "@/lib/bi/employee-ot"
import { ViewerEmptyState, ViewerErrorState, DataFreshnessBadge } from "./states"
import { JobStatusBanner } from "./job-status-banner"

export function ViewerPage({ code }: { code: string }) {
  const chartCardRef = useRef<HTMLDivElement>(null)
  const { hasPermission } = usePermission()

  const [state, setState] = useUrlState<ViewerState>({
    defaultValues: DEFAULT_VIEWER_STATE,
    serialize: (key, value) => {
      // Suppress empty arrays so they don't pollute the URL.
      if (Array.isArray(value)) return value.length > 0 ? JSON.stringify(value) : undefined
      if (value === undefined || value === null || value === "") return undefined
      if (typeof value === "string") return value || undefined
      return JSON.stringify(value)
    },
  })

  const { data: dashboard, isLoading: dashLoading, isError: dashError } = useDashboardByCode(code)

  // Load distinct group values when the dashboard has filter_chips configured.
  // NOTE: dashboard.chartConfig (from the /by-code endpoint) may be a partial Struct and
  // miss filter_chips. The data endpoint always returns the full JSONB config, so we also
  // check chartData.config (dataConfig) which is resolved later. We use the dashboard
  // endpoint config eagerly here to start useFactDistincts as early as possible.
  // Static group values (filter_chips_group1/2) stored in chart_config serve as fallback
  // when useFactDistincts returns no data.
  const dashChipFields = (
    (dashboard?.chartConfig?.["filterChips"] ?? dashboard?.chartConfig?.["filter_chips"]) as string[] | undefined
  ) ?? []
  const dashHasStaticChips =
    Boolean(dashboard?.chartConfig?.["filter_chips_group1"]) ||
    Boolean(dashboard?.chartConfig?.["filterChipsGroup1"])
  const hasFilterChips = dashChipFields.length > 0 || dashHasStaticChips
  const { data: distincts } = useFactDistincts(hasFilterChips ? (dashboard?.filterType ?? "") : "")

  const refreshMs = dashboard
    ? (dashboard.refreshIntervalSec || dashboard.cacheTtlSec || 0) * 1000
    : 0

  // Filter-chip selections stored in local React state (not URL) so they trigger
  // immediate TanStack Query refetch without depending on Next.js router.replace timing.
  const [group1Filter, setGroup1Filter] = useState<string[]>([])
  const [group2Filter, setGroup2Filter] = useState<string[]>([])

  // Merge local chip filters into the state object passed to useDashboardData.
  // selectedPeriod (YYYYMM) stays in the state as-is — the hook/BFF layer converts
  // it to a CUSTOM date range for categorical charts without touching React state.
  const stateWithFilters: ViewerState = { ...state, group1Filter, group2Filter }

  // Compute chart type early (dashboard may be undefined on first render → "").
  // Used to decide whether selectedPeriod should narrow the main chart to a single month.
  const earlyChartType = state.chartType || (dashboard ? chartTypeToString(dashboard.chartType) : "")
  const earlyIsTrend = TREND_CHART_TYPES.has(earlyChartType)

  const {
    data: chartData,
    isLoading: dataLoading,
    isError: dataError,
    error,
    refetch,
    isPlaceholderData,
  } = useDashboardData(code, stateWithFilters, refreshMs, earlyIsTrend, dashboard?.periodCalendar, Boolean(dashboard))

  // NIK → name, remembered from employee rows (point meta __name) so the breadcrumb of a day drill
  // can read "NIK — Nama" (HD-07). Names are only present when the user may see employee level.
  // Merged while rendering when chartData changes (React "adjust state on prop change"), not in an effect.
  const [nikNames, setNikNames] = useState<Record<string, string>>({})
  const [namesFrom, setNamesFrom] = useState(chartData)
  if (chartData !== namesFrom) {
    setNamesFrom(chartData)
    const found: Record<string, string> = {}
    for (const r of chartData ? toRechartsRows(chartData) : []) {
      if (typeof r.__name === "string" && r.__name) found[String(r.category)] = r.__name
    }
    if (Object.keys(found).length) setNikNames((prev) => ({ ...prev, ...found }))
  }

  // Toggle helpers — use local state for immediate refetch.
  const toggleGroup1 = useCallback((v: string) => {
    setGroup1Filter((current) =>
      current.includes(v) ? current.filter((x) => x !== v) : [...current, v]
    )
  }, [])

  const toggleGroup2 = useCallback((v: string) => {
    setGroup2Filter((current) =>
      current.includes(v) ? current.filter((x) => x !== v) : [...current, v]
    )
  }, [])

  if (dashLoading) return <ViewerSkeleton />
  if (dashError || !dashboard) return <ViewerErrorState message="Dashboard not found" />

  const compareModes = (dashboard.compareModes ?? []).map(compareEnumToKey).filter(Boolean) as CompareKey[]
  const primaryChartType = chartTypeToString(dashboard.chartType)
  // Use the viewer-selected chart type if set, otherwise fall back to the dashboard primary.
  const chartType = state.chartType || primaryChartType

  // Resolve config objects early so both group-values and view-configs derivations can use them.
  // The data endpoint always returns the full JSONB config; prefer it over the dashboard endpoint.
  const dataConfig = chartData?.config as Record<string, unknown> | undefined
  const dashConfig = dashboard.chartConfig as Record<string, unknown> | undefined

  // Static chip values stored in chart_config (filter_chips_group1 / filter_chips_group2).
  // MarshalToMap() on the data endpoint omits these fields, so also read from dashConfig
  // (dashboard endpoint returns raw JSONB which always includes them).
  const staticGroup1Values = (
    (dataConfig?.filterChipsGroup1 ?? dataConfig?.filter_chips_group1 ??
     dashConfig?.filterChipsGroup1 ?? dashConfig?.filter_chips_group1) as string[] | undefined
  ) ?? []
  const staticGroup2Values = (
    (dataConfig?.filterChipsGroup2 ?? dataConfig?.filter_chips_group2 ??
     dashConfig?.filterChipsGroup2 ?? dashConfig?.filter_chips_group2) as string[] | undefined
  ) ?? []

  const group1Values = distincts?.group1s?.length ? distincts.group1s : staticGroup1Values
  const group2Values = distincts?.group2s?.length ? distincts.group2s : staticGroup2Values
  // group1Filter and group2Filter are local useState (defined above) — no URL state needed.

  // Categories from chart data — used to drive the month selector in FilterBar.
  const categories = chartData?.categories ?? []

  // Employee Overtime (HD-18): payroll-period presets only, no month selector (selected_month would
  // turn the period into CUSTOM, which the backend rejects), group-by controls on the table level.
  const isWorkforce = dashboard?.filterType?.startsWith("HR_") === true
  const isEmployeeOT =
    (dataConfig?.["table_mode"] ?? dashConfig?.["table_mode"] ?? dashConfig?.["tableMode"]) === EMPLOYEE_OT_MODE

  // Effective selected period: use URL state only when it's a valid YYYYMM string.
  // Ignore stale non-period values (e.g. group_2 names from a previous navigation).
  const periodCategories = categories.filter(c => /^\d{6}$/.test(c))
  const validSelectedPeriod = /^\d{6}$/.test(state.selectedPeriod ?? "") ? state.selectedPeriod : undefined

  // For categorical charts (waterfall, bar, donut, data_table), chart categories contain
  // group names (e.g. "INCOME", "PRODUCTION COST"), not YYYYMM strings.
  // Derive available period options from the as-of date and period preset instead.
  const isTrendChart = TREND_CHART_TYPES.has(chartType)
  const derivedPeriodOptions = !isTrendChart
    ? derivePeriodOptions(
        chartData?.meta?.asOf ? new Date(chartData.meta.asOf) : undefined,
        state.period ?? "L12M"
      )
    : []

  // Pass period list to FilterBar: trend charts use period-labelled categories from data;
  // categorical charts use the derived month list.
  const monthSelectorCategories = isEmployeeOT ? [] : isTrendChart ? periodCategories : derivedPeriodOptions

  // effectiveSelectedPeriod is undefined when no month is explicitly selected
  // (default "All Months"). In that case the chart shows the full period range
  // and the title doesn't append a specific month label.
  const effectiveSelectedPeriod = validSelectedPeriod ??
    (isTrendChart ? periodCategories[periodCategories.length - 1] : undefined)

  // available_chart_types: prefer data endpoint config (always has full JSONB).
  const availableChartTypes = (
    (dataConfig?.availableChartTypes ?? dataConfig?.available_chart_types ??
     dashConfig?.availableChartTypes ?? dashConfig?.available_chart_types ?? []) as string[]
  )
  const rawViewConfigs = dataConfig ?? dashConfig
  const viewConfigsMap = (
    (rawViewConfigs?.viewConfigs ?? rawViewConfigs?.view_configs ?? {}) as Record<string, ViewModeConfig>
  )

  // Active view config for the currently displayed chart type.
  // The nested ViewModeConfig objects in view_configs JSONB use snake_case keys
  // (title_template, drill_enabled) — not converted by ts-proto. Normalise both.
  const rawVc = viewConfigsMap[chartType] as unknown as Record<string, unknown> | undefined
  const activeViewConfig: ViewModeConfig = rawVc
    ? {
        titleTemplate: (rawVc.titleTemplate ?? rawVc.title_template ?? dashboard.dashboardTitle ?? "") as string,
        drillEnabled: (rawVc.drillEnabled ?? rawVc.drill_enabled ?? !["line","area","multi_line","scatter","heatmap","kpi_card","data_table"].includes(chartType)) as boolean,
        hint: (rawVc.hint ?? undefined) as string | undefined,
      }
    : {
        titleTemplate: dashboard.dashboardTitle ?? "",
        drillEnabled: !["line","area","multi_line","scatter","heatmap","kpi_card","data_table"].includes(chartType),
        hint: undefined,
      }

  // Resolve chart card title — replace {period} with human-readable month label.
  function formatPeriodLabel(yyyymm: string): string {
    if (!yyyymm || yyyymm.length !== 6) return yyyymm ?? ""
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    const m = parseInt(yyyymm.slice(4, 6), 10)
    return `${months[m - 1] ?? ""} ${yyyymm.slice(0, 4)}`
  }

  // Over-limit trend section on top of Kepatuhan 14 Jam (H042, HD-22), declared in layout_config.top_section.
  const topSection = (dashboard.layoutConfig as Record<string, unknown> | null)?.["top_section"] as
    | (OtOverMonthConfig & { type?: string })
    | undefined
  const topOverMonth = topSection?.type === "ot_over_month" ? topSection : undefined

  const chartTitle = (activeViewConfig.titleTemplate
    ? activeViewConfig.titleTemplate.replace("{period}", formatPeriodLabel(effectiveSelectedPeriod ?? "")).trim()
    : "") || (dashboard.dashboardTitle ?? "")

  return (
    <div className="space-y-6">
      <PageHeader title={dashboard.dashboardTitle} subtitle={dashboard.description}>
        <DataFreshnessBadge timestamp={chartData?.meta?.asOf} />
      </PageHeader>

      {isWorkforce && <JobStatusBanner />}

      <WorkforceNav code={code} />

      {topOverMonth && (
        <OtOverMonthSection
          config={topOverMonth}
          selectedPeriod={effectiveSelectedPeriod}
          onSelectMonth={(p) => setState({ ...state, selectedPeriod: p })}
        />
      )}

      <FilterBar
        state={state}
        onChange={setState}
        compareModes={compareModes}
        primaryChartType={primaryChartType}
        availableChartTypes={availableChartTypes}
        periodCalendar={dashboard.periodCalendar}
        categories={monthSelectorCategories}
        allowedPresets={isEmployeeOT ? EMPLOYEE_OT_PRESETS : presetsForGrain(dashboard.periodeGrain)}
      />

      {isEmployeeOT && state.drillPath.length === 0 && (
        <EmployeeOTControls
          state={state}
          onChange={setState}
          block={readEmployeeOTBlock(dataConfig)}
          data={chartData}
          stale={isPlaceholderData || dataLoading}
        />
      )}

      {(group1Values.length > 0 || group2Values.length > 0) && (
        <div className="flex flex-col gap-2 rounded-lg border bg-card px-4 py-3">
          {group1Values.length > 0 && (
            <FilterChips
              label={
                ((dataConfig?.filterChipsGroup1Label ?? dataConfig?.filter_chips_group1_label ??
                  dashConfig?.filterChipsGroup1Label ?? dashConfig?.filter_chips_group1_label) as string | undefined)
                ?? "Filter"
              }
              values={group1Values}
              selected={group1Filter}
              onToggle={toggleGroup1}
              onSelectAll={() => setGroup1Filter([])}
            />
          )}
          {group2Values.length > 0 && (
            <FilterChips
              label={
                ((dataConfig?.filterChipsGroup2Label ?? dataConfig?.filter_chips_group2_label ??
                  dashConfig?.filterChipsGroup2Label ?? dashConfig?.filter_chips_group2_label) as string | undefined)
                ?? "Category"
              }
              values={group2Values}
              selected={group2Filter}
              onToggle={toggleGroup2}
              onSelectAll={() => setGroup2Filter([])}
            />
          )}
        </div>
      )}

      <KpiGrid kpis={chartData?.kpis ?? []} />

      <Card ref={chartCardRef}>
        <CardHeader className="pb-2">
          <div>
            <h3 className="text-base font-semibold leading-tight">{chartTitle}</h3>
            {activeViewConfig.hint && (
              <p className="mt-0.5 text-xs text-muted-foreground">{activeViewConfig.hint}</p>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <DrillBreadcrumb
            rootLabel={dashboard.dashboardTitle}
            path={state.drillPath}
            onJump={(newPath) => setState({ ...state, drillPath: newPath })}
            labelFor={(seg) => (nikNames[seg] ? `${seg} — ${nikNames[seg]}` : seg)}
          />

          {dataError ? (
            <ViewerErrorState message={error?.message} onRetry={() => void refetch()} />
          ) : isEmpty(chartData) && !dataLoading ? (
            <ViewerEmptyState showUploadCta={hasPermission("finance.bi.upload.create")} />
          ) : chartData ? (
            <ChartEngine
              chartType={chartType}
              config={(chartData.config ?? dashboard.chartConfig ?? {}) as Record<string, unknown>}
              data={chartData}
              onDrill={activeViewConfig.drillEnabled ? (nextPath) => setState({ ...state, drillPath: nextPath }) : undefined}
            />
          ) : (
            <Skeleton className="h-[360px] w-full rounded-md" />
          )}
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <ExportPngButton targetRef={chartCardRef} fileName={`${dashboard.dashboardCode}_${state.period}`} />
          <FullscreenButton targetRef={chartCardRef} />
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            <RefreshCw className="mr-1 h-4 w-4" />
            Refresh
          </Button>
        </CardFooter>
      </Card>

      {chartData && dashboard.layoutConfig && (
        <SecondaryGrid
          layoutConfig={dashboard.layoutConfig as Record<string, unknown>}
          data={chartData}
          dashboardCode={code}
          selectedPeriod={effectiveSelectedPeriod}
          drillEnabled={activeViewConfig.drillEnabled}
          canDrillDeeper={
            activeViewConfig.drillEnabled &&
            (state.drillPath?.length ?? 0) < ((dashboard.maxDrillLevel ?? 3) - (dashboard.filterGroup1 ? 1 : 0))
          }
          onDrill={(nextPath) => setState({ ...state, drillPath: nextPath })}
          drillPath={state.drillPath}
          compare={state.compare}
          group1Filter={group1Filter}
          group2Filter={group2Filter}
        />
      )}
    </div>
  )
}

/**
 * Derives YYYYMM period options for categorical charts (waterfall, bar, etc.) where
 * chart categories are group names, not period strings. Builds a list of the last N
 * months anchored at the data's as-of date (or today), oldest-first.
 */
function derivePeriodOptions(asOfDate: Date | undefined, periodPreset: string): string[] {
  const anchor = asOfDate ?? new Date()
  const year = anchor.getFullYear()
  const month = anchor.getMonth() // 0-indexed
  const count = periodPreset === "L24M" ? 24 : 12 // default L12M
  const result: string[] = []
  // Start from the PREVIOUS month (last complete month), not the current month.
  // The current month is excluded because ETL data is only available for completed months.
  // e.g. June 4 2026 → start from May 2026 (i=1), show 12 months: May 2026 → Jun 2025.
  for (let i = 1; i <= count; i++) {
    const d = new Date(year, month - i, 1)
    const yyyymm = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`
    result.push(yyyymm)
  }
  return result.reverse() // oldest first
}

/** Maps the proto CompareMode enum value to the FE CompareKey string. */
function compareEnumToKey(mode: number): CompareKey | "" {
  switch (mode) {
    case 1: return "NONE"
    case 2: return "MoM"
    case 3: return "QoQ"
    case 4: return "YoY"
    case 5: return "YTD"
    case 6: return "R12"
    default: return ""
  }
}

function ViewerSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-16 w-full" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-[420px] w-full" />
    </div>
  )
}

// periodeGrainToString re-exported indirectly to keep imports stable for future use.
export { periodeGrainToString }
