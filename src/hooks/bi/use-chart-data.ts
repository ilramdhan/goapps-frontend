"use client"

// BI chart-data hook — drives the viewer page. Polling interval comes from the
// dashboard's refresh_interval_sec (or cache_ttl_sec fallback).

import { useQuery, keepPreviousData } from "@tanstack/react-query"

import { apiClient } from "@/lib/api"
import type { ChartDataResponse, GetDashboardDataResponse, ViewerState } from "@/types/bi"
import { GetDashboardDataResponseParser } from "@/types/bi"
import { dashboardKeys } from "./use-dashboard"

/** Build the query string for the chart-data BFF route from viewer state.
 *
 * When isTrendChart=false and selectedPeriod is a valid YYYYMM, pass it as
 * selected_month so the BFF can narrow the query to that specific month. The BFF
 * converts selected_month → CUSTOM period with first/last day of that month.
 * Trend charts (line/area/multi_line) always use the period preset (L12M etc.)
 * and ignore selectedPeriod — filtering a trend to 1 month shows only 1 point.
 */
function buildDataQuery(state: ViewerState, isTrendChart: boolean, calendar?: string): string {
  const params = new URLSearchParams()
  params.set("period", state.period)
  if (state.period === "CUSTOM") {
    if (state.periodFrom) params.set("periodFrom", state.periodFrom)
    if (state.periodTo) params.set("periodTo", state.periodTo)
  }
  // For categorical charts (waterfall, bar, donut) the month picker controls which
  // month to show. Pass it as selected_month so the BFF overrides period to CUSTOM.
  if (!isTrendChart && state.selectedPeriod && /^\d{6}$/.test(state.selectedPeriod)) {
    params.set("selected_month", state.selectedPeriod)
    if (calendar) params.set("period_calendar", calendar)
  }
  params.set("compare", state.compare)
  if (state.drillPath.length > 0) params.set("drill_path", state.drillPath.join(","))
  if (state.group1Filter?.length) params.set("group1_filter", state.group1Filter.join(","))
  if (state.group2Filter?.length) params.set("group2_filter", state.group2Filter.join(","))
  // Employee Overtime (HD-18): values may contain commas (dept names), so the filter travels as JSON.
  if (state.groupBy) params.set("group_by", state.groupBy)
  if (state.groupBy && state.groupFilter?.length) params.set("group_filter", JSON.stringify(state.groupFilter))
  if (state.comparePeriod && /^\d{6}$/.test(state.comparePeriod)) params.set("compare_period", state.comparePeriod)
  return params.toString()
}

/** Chart types that represent a trend over time — month selector is hidden for these.
 *  "mixed" is included because NET_PROFIT uses mixed with x_axis_field="period",
 *  which is semantically a trend chart and should NOT get the single-month override. */
export const TREND_CHART_TYPES = new Set(["line", "area", "multi_line", "mixed"])

/**
 * useDashboardData fetches the shaped chart payload for the viewer.
 *
 * @param code dashboard code
 * @param state viewer filter/drill state (synced to URL upstream)
 * @param refreshIntervalMs polling interval; 0 disables polling
 * @param isTrendChart when true selectedPeriod is ignored for the main query
 */
export function useDashboardData(
  code: string | undefined,
  state: ViewerState,
  refreshIntervalMs: number,
  isTrendChart = false,
  calendar?: string,
  ready = true,
) {
  return useQuery<ChartDataResponse | undefined>({
    queryKey: [...dashboardKeys.all, "data", code, state, isTrendChart, calendar] as const,
    queryFn: async () => {
      const qs = buildDataQuery(state, isTrendChart, calendar)
      const raw = await apiClient.get<unknown>(`/api/v1/finance/bi/dashboards/by-code/${code}/data?${qs}`)
      const parsed: GetDashboardDataResponse = GetDashboardDataResponseParser.fromJSON(raw)
      if (!parsed.base?.isSuccess) throw new Error(parsed.base?.message ?? "Failed to load chart data")
      return parsed.data
    },
    enabled: Boolean(code) && ready,
    refetchInterval: refreshIntervalMs > 0 ? refreshIntervalMs : false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}
