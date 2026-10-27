"use client"

// Shared TanStack Query hooks for the Workforce OT cards (ot-compare, ot-pareto, ot-over-month).
// All keys live under dashboardKeys.all so one invalidation refreshes them. Failures throw, so the
// cards can show an error instead of "no data". Past payroll months never change, hence the longer
// staleTime on per-month /computed: remounting a card reuses the cache instead of refetching.

import { useQueries, useQuery } from "@tanstack/react-query"

import type { ChartDataResponse } from "@/types/bi"
import { dashboardKeys } from "./use-dashboard"

const BASE = "/api/v1/finance/bi/dashboards/by-code"
const TREND_STALE_MS = 60_000
const MONTH_STALE_MS = 5 * 60_000

export interface ComputedParams {
  code: string
  numerator?: string
  groupBy: string
  period: string
  calendar?: string
  group1?: string
  group2?: string
}

async function getData(url: string): Promise<ChartDataResponse | undefined> {
  const r = await fetch(url, { credentials: "include" })
  if (!r.ok) throw new Error(`Gagal memuat data (${r.status})`)
  const j = (await r.json()) as { data?: ChartDataResponse }
  return j.data
}

function computedUrl(p: ComputedParams): string {
  const q = new URLSearchParams({
    numerator: p.numerator ?? "VALUE", denominator: "", scale: "1", group_by: p.groupBy, period: p.period,
  })
  if (p.calendar) q.set("period_calendar", p.calendar)
  if (p.group1) q.set("group1_filter", p.group1)
  if (p.group2) q.set("group2_filter", p.group2)
  return `${BASE}/${p.code}/computed?${q.toString()}`
}

function computedKey(p: ComputedParams) {
  return [...dashboardKeys.all, "ot-computed", p.code, p.numerator ?? "VALUE", p.groupBy, p.period, p.calendar ?? "", p.group1 ?? "", p.group2 ?? ""] as const
}

/** One /computed request (SUM of a metric grouped by a column) for one period. */
export function useOtComputed(p: ComputedParams, enabled = true) {
  return useQuery<ChartDataResponse | undefined>({
    queryKey: computedKey(p),
    queryFn: () => getData(computedUrl(p)),
    enabled: enabled && Boolean(p.code),
    staleTime: MONTH_STALE_MS,
    refetchOnWindowFocus: false,
  })
}

/** Several /computed requests (same dashboard, one per period) sharing the cache with useOtComputed. */
export function useOtComputedMany(items: ComputedParams[], enabled = true) {
  return useQueries({
    queries: items.map((p) => ({
      queryKey: computedKey(p),
      queryFn: () => getData(computedUrl(p)),
      enabled: enabled && Boolean(p.code),
      staleTime: MONTH_STALE_MS,
      refetchOnWindowFocus: false,
    })),
  })
}

/** Trend payload of a dashboard (/data), used for the month list (L24M) or the force_trend series (L12M). */
export function useOtTrend(code: string, opts: { period: string; forceTrend?: boolean; calendar?: string }, enabled = true) {
  const { period, forceTrend, calendar } = opts
  return useQuery<ChartDataResponse | undefined>({
    queryKey: [...dashboardKeys.all, "ot-trend", code, period, Boolean(forceTrend), calendar ?? ""] as const,
    queryFn: () => {
      const q = new URLSearchParams({ period })
      if (forceTrend) q.set("force_trend", "true")
      if (calendar) q.set("period_calendar", calendar)
      return getData(`${BASE}/${code}/data?${q.toString()}`)
    },
    enabled: enabled && Boolean(code),
    staleTime: TREND_STALE_MS,
    refetchOnWindowFocus: false,
  })
}
