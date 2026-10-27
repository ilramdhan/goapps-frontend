// BFF route: GET /api/v1/finance/bi/dashboards/by-code/[code]/computed
//
// Fetches a computed-ratio secondary chart payload. Passes a ComputedRatioConfig
// JSON blob to the backend via the x-computed-ratio gRPC metadata header so the
// query planner can execute planComputedRatio grouped by the configured column.
//
// Query params:
//   numerator   - metric_name for the dividend  (default: MARGIN)
//   denominator - metric_name for the divisor   (default: ""; empty = SUM(numerator) only)
//   scale       - multiplier for the ratio/sum   (default: 100 for ratio, 1 for sum)
//   group_by    - grouping column                (default: group_2)
//   period      - YYYYMM string OR preset (L12M, L24M, THIS_YEAR, etc.; default: L12M)
//                 A YYYYMM string is converted to a CUSTOM range (first→last day of that month).

import { NextRequest, NextResponse } from "next/server"
import { getBiChartDataClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"
import { CompareMode } from "@/types/generated/finance/v1/bi"

/**
 * Converts a YYYYMM string to [firstDay, lastDay] of that month as Date objects.
 * Returns undefined if the input is not a 6-digit string.
 */
function yyyymmToRange(s: string, payroll = false): [Date, Date] | undefined {
  if (!/^\d{6}$/.test(s)) return undefined
  const year = parseInt(s.slice(0, 4), 10)
  const month = parseInt(s.slice(4, 6), 10) - 1 // 0-indexed
  // PAYROLL_26_25 (HD-06): label YYYYMM = 26th of previous month .. 25th of that month.
  const from = payroll ? new Date(Date.UTC(year, month - 1, 26)) : new Date(Date.UTC(year, month, 1))
  const to = payroll
    ? new Date(Date.UTC(year, month, 25, 23, 59, 59, 999))
    : new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999))
  return [from, to]
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params
    const sp = request.nextUrl.searchParams

    // denominator may be "" (empty string) for single-metric SUM aggregation.
    // Use null-check rather than ?? to preserve explicit empty string from caller.
    const denominator = sp.get("denominator")
    const cr = {
      numerator: sp.get("numerator") ?? "MARGIN",
      denominator: denominator !== null ? denominator : "",
      scale: parseFloat(sp.get("scale") ?? "100"),
      group_by: sp.get("group_by") ?? "group_2",
    }

    const metadata = createMetadataFromRequest(request)
    // Inject the computed-ratio config as a gRPC metadata header.
    // The backend's applyMetadataFilters() reads this and populates ViewerFilters.ComputedRatio,
    // which routes Plan() to planComputedRatio (CASE-WHEN pivot grouped by group_2).
    metadata.set("x-computed-ratio", JSON.stringify(cr))

    // Forward group_1 / group_2 filter chip selections so planComputedRatio applies them.
    const group1Filter = sp.get("group1_filter")
    const group2Filter = sp.get("group2_filter")
    if (group1Filter) metadata.set("x-group1-filter", group1Filter)
    if (group2Filter) metadata.set("x-group2-filter", group2Filter)

    // Resolve period: if caller passes a YYYYMM string (e.g. "202604"), convert it to a
    // CUSTOM range so ResolvePeriod on the backend applies the correct single-month filter.
    // Otherwise forward the preset string (L12M, L24M, THIS_YEAR, etc.) verbatim.
    const periodParam = sp.get("period") ?? "L12M"
    const yyyymmRange = yyyymmToRange(periodParam, sp.get("period_calendar") === "PAYROLL_26_25")
    let periodPreset = periodParam
    let periodFrom: Date | undefined
    let periodTo: Date | undefined
    if (yyyymmRange) {
      periodPreset = "CUSTOM"
      periodFrom = yyyymmRange[0]
      periodTo = yyyymmRange[1]
    }

    const client = getBiChartDataClient()
    const response = await client.getDashboardData(
      {
        dashboardCode: code,
        periodPreset,
        periodFrom,
        periodTo,
        compare: CompareMode.COMPARE_MODE_NONE,
        drillPath: [],
      },
      metadata,
    )

    return NextResponse.json({ base: response.base, data: response.data })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    console.error("Get BI computed ratio error:", error)
    return NextResponse.json(
      {
        base: {
          isSuccess: false,
          statusCode: "500",
          message: "Failed to load computed chart data",
          validationErrors: [],
        },
      },
      { status: 500 },
    )
  }
}
