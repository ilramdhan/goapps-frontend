// BI Dashboards — chart data for the viewer page.

import { NextRequest, NextResponse } from "next/server"
import { getBiChartDataClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"
import { CompareMode } from "@/types/generated/finance/v1/bi"

function compareKeyToEnum(s: string | null): CompareMode {
  switch (s) {
    case "MoM": return CompareMode.COMPARE_MODE_MOM
    case "QoQ": return CompareMode.COMPARE_MODE_QOQ
    case "YoY": return CompareMode.COMPARE_MODE_YOY
    case "YTD": return CompareMode.COMPARE_MODE_YTD
    case "R12": return CompareMode.COMPARE_MODE_R12
    case "NONE":
    case "none":
    case null:
    case undefined:
      return CompareMode.COMPARE_MODE_NONE
    default:
      return CompareMode.COMPARE_MODE_UNSPECIFIED
  }
}

/** Parse a JSON array of strings; anything else yields [] (no filter). */
const ALLOWED_GROUP_BY = new Set(["DIVISION", "DEPT", "COMPANY"])
const MAX_GROUP_FILTER = 50

function parseStringArray(raw: string | null): string[] {
  if (!raw) return []
  try {
    const v: unknown = JSON.parse(raw)
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
  } catch {
    return []
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params
    const sp = request.nextUrl.searchParams
    const metadata = createMetadataFromRequest(request)
    const client = getBiChartDataClient()

    const drillPath = sp.get("drill_path")
    let periodFromStr = sp.get("periodFrom")
    let periodToStr = sp.get("periodTo")
    let periodPresetOverride = sp.get("period") || "L12M"

    // selected_month=YYYYMM overrides the period to a single-month CUSTOM range.
    // Sent by the viewer when a categorical chart (waterfall/bar) has a month selected.
    const selectedMonth = sp.get("selected_month")
    if (selectedMonth && /^\d{6}$/.test(selectedMonth)) {
      const y = parseInt(selectedMonth.slice(0, 4), 10)
      const m = parseInt(selectedMonth.slice(4, 6), 10) - 1
      // PAYROLL_26_25 (HD-06): label YYYYMM = window 26th of previous month .. 25th of that month.
      const payroll = sp.get("period_calendar") === "PAYROLL_26_25"
      const from = payroll ? new Date(Date.UTC(y, m - 1, 26)) : new Date(Date.UTC(y, m, 1))
      const to = payroll ? new Date(Date.UTC(y, m, 25)) : new Date(Date.UTC(y, m + 1, 0)) // day-0 of next month = last day
      periodPresetOverride = "CUSTOM"
      periodFromStr = from.toISOString().slice(0, 10)
      periodToStr = to.toISOString().slice(0, 10)
    }

    // Forward filter-chip selections as gRPC metadata headers so the backend can
    // add WHERE group_1/group_2 IN (...) without proto changes.
    const group1Filter = sp.get("group1_filter")?.split(",").filter(Boolean) ?? []
    const group2Filter = sp.get("group2_filter")?.split(",").filter(Boolean) ?? []
    if (group1Filter.length > 0) metadata.set("x-group1-filter", group1Filter.join(","))
    if (group2Filter.length > 0) metadata.set("x-group2-filter", group2Filter.join(","))

    // Employee Overtime table (table_mode=employee_ot, HD-18): group-by key (whitelisted by the
    // backend) and the selected group values as a JSON array (values may contain commas).
    const groupByRaw = sp.get("group_by")
    const groupBy = groupByRaw && ALLOWED_GROUP_BY.has(groupByRaw) ? groupByRaw : null
    if (groupBy) metadata.set("x-group-by", groupBy)
    // Capped so a huge array cannot exceed the gRPC metadata size limit (would surface as an opaque 500).
    const groupFilter = parseStringArray(sp.get("group_filter")).slice(0, MAX_GROUP_FILTER)
    if (groupBy && groupFilter.length > 0) metadata.set("x-group-filter", JSON.stringify(groupFilter))

    // Employee OT comparison period (HD-25): payroll period YYYYMM, validated again by the backend.
    const comparePeriod = sp.get("compare_period")
    if (comparePeriod && /^\d{6}$/.test(comparePeriod)) metadata.set("x-compare-period", comparePeriod)

    // force_trend=true: instructs the backend to override x_axis_field and return a
    // time-series payload instead of a categorical/waterfall one. Used by CrossDashboardCard
    // to merge a secondary trend line (e.g. EBITDA) with the primary NP series.
    if (sp.get("force_trend") === "true") metadata.set("x-force-trend", "true")

    const response = await client.getDashboardData(
      {
        dashboardCode: code,
        periodPreset: periodPresetOverride,
        periodFrom: periodFromStr ? new Date(periodFromStr) : undefined,
        periodTo: periodToStr ? new Date(periodToStr) : undefined,
        compare: compareKeyToEnum(sp.get("compare")),
        drillPath: drillPath ? drillPath.split(",").filter(Boolean) : [],
      },
      metadata
    )
    return NextResponse.json({ base: response.base, data: response.data })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    console.error("Get BI chart data error:", error)
    return NextResponse.json(
      { base: { isSuccess: false, statusCode: "500", message: "Failed to load chart data", validationErrors: [] } },
      { status: 500 }
    )
  }
}
