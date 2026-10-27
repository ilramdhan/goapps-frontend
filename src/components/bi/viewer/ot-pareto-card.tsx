"use client"

// OT concentration card (H037): monthly trend of the % of OT hours worked by the top 10% of employees
// (company-wide Pareto), with the change in percentage points vs the previous month.
// Source is the companion dashboard HR_OT_PARETO (fact HR_OT_PARETO: group_1 = TOP_10PCT / TOTAL, MONTHLY).
// The trend path of /data sums both group_1 values into one series, so months come from /data and each
// month is read from /computed (group_by=group_1), like the OT comparison card. The ratio TOP/TOTAL×100
// is computed here (HD-08), not stored. A month with no TOTAL is skipped, never shown as 0.

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { biColors } from "@/lib/bi/color-tokens"
import { formatNumber } from "@/lib/bi/number-format"
import { useOtComputedMany, useOtTrend } from "@/hooks/bi/use-ot-queries"
import { periodLabel as formatPeriod } from "@/lib/bi/period"
import { toTotals } from "./ot-compare-card"

const MAX_MONTHS = 12

const periodLabel = (p: string) => formatPeriod(p, "MONTHLY")

interface OtParetoCardProps {
  title?: string
  sourceDashboardCode: string
  topKey?: string
  totalKey?: string
  periodCalendar?: string
  decimals?: number
  span?: "full" | "half" | "third"
}

export interface ParetoRow {
  period: string
  top: number
  total: number
  pct: number
  deltaPp: number | null // null = no previous month with data
}

/** Per-month group_1 totals (YYYYMM → {TOP_10PCT, TOTAL}) → monthly % rows, ascending, with Δ pp. */
export function buildPareto(
  byPeriod: Record<string, Map<string, number> | null>,
  topKey = "TOP_10PCT",
  totalKey = "TOTAL",
): ParetoRow[] {
  const rows: ParetoRow[] = []
  for (const period of Object.keys(byPeriod).filter((p) => /^\d{6}$/.test(p)).sort()) {
    const m = byPeriod[period]
    const t = m?.get(totalKey) ?? 0
    if (t <= 0) continue
    const tp = m?.get(topKey) ?? 0
    const pct = (tp / t) * 100
    const prev = rows[rows.length - 1]
    rows.push({ period, top: tp, total: t, pct, deltaPp: prev ? pct - prev.pct : null })
  }
  return rows
}

export function OtParetoCard({ title, sourceDashboardCode, topKey, totalKey, periodCalendar, decimals, span }: OtParetoCardProps) {
  const dec = decimals ?? 1
  const trend = useOtTrend(sourceDashboardCode, { period: "L24M", calendar: periodCalendar })
  const months = (trend.data?.categories ?? []).filter((c) => /^\d{6}$/.test(c)).slice(-MAX_MONTHS)
  const monthly = useOtComputedMany(
    months.map((period) => ({ code: sourceDashboardCode, groupBy: "group_1", period, calendar: periodCalendar })),
    trend.isSuccess,
  )
  const isError = trend.isError || monthly.some((q) => q.isError)
  const loaded = trend.isSuccess && monthly.every((q) => !q.isPending)
  const byPeriod: Record<string, Map<string, number> | null> = {}
  months.forEach((p, i) => { byPeriod[p] = toTotals(monthly[i]?.data) })

  const rows = buildPareto(byPeriod, topKey, totalKey)
  const last = rows[rows.length - 1]
  const chartData = rows.map((r) => ({ label: periodLabel(r.period), period: r.period, pct: r.pct }))

  return (
    <Card className={cn(span === "full" && "lg:col-span-2")}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title ?? "Konsentrasi Lembur (Pareto)"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isError ? (
          <p className="py-6 text-center text-sm text-destructive">Gagal memuat data Pareto OT. Coba muat ulang.</p>
        ) : !loaded ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Belum ada data Pareto OT</p>
        ) : (
          <>
            {last && (
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-2xl font-semibold tabular-nums">{formatNumber(last.pct, "raw", dec)}%</span>
                <span className="text-sm text-muted-foreground">{periodLabel(last.period)}</span>
                {last.deltaPp === null ? (
                  <span className="text-sm text-muted-foreground">—</span>
                ) : (
                  <span className={cn("text-sm tabular-nums", last.deltaPp > 0 ? "text-red-600" : last.deltaPp < 0 ? "text-emerald-600" : "text-muted-foreground")}>
                    {last.deltaPp > 0 ? "▲ +" : last.deltaPp < 0 ? "▼ " : ""}
                    {formatNumber(last.deltaPp, "raw", dec)} pp vs bulan lalu
                  </span>
                )}
              </div>
            )}
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip
                  formatter={(v: number, _n: string, item: { payload?: { period?: string } }) => {
                    const r = rows.find((x) => x.period === item.payload?.period)
                    return [`${formatNumber(v, "raw", dec)}% (${formatNumber(r?.top ?? 0, "raw", 1)} dari ${formatNumber(r?.total ?? 0, "raw", 1)} jam)`, "Top 10%"]
                  }}
                />
                <Line type="monotone" dataKey="pct" stroke={biColors.primary} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground">
              Naik = lembur makin menumpuk di sedikit orang; turun = makin merata. Baca bersama kartu
              &quot;% Karyawan Lembur&quot; di atas: persentase lembur kecil + konsentrasi tinggi = beban menumpuk.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
