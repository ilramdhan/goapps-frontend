"use client"

// Over-limit monthly trend on top of Kepatuhan 14 Jam (H042, HD-22). Bars = orang-minggu per payroll month,
// line = karyawan unik (two different measures, never summed). Click a month to filter the weekly heatmap/table
// below (via onSelectMonth), then drill dept → orang (NIK, needs workforceemployee.view; the backend gates it too).

import { useState } from "react"
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { ChartDataResponse } from "@/types/bi"
import { biColors } from "@/lib/bi/color-tokens"
import { formatNumber } from "@/lib/bi/number-format"
import { useOtComputed, useOtTrend } from "@/hooks/bi/use-ot-queries"
import { usePermission } from "@/lib/hooks/use-permission"

export interface OtOverMonthConfig {
  trend_dashboard: string
  emp_dashboard: string
  nik_dashboard: string
  period_calendar?: string
}

interface Props {
  config: OtOverMonthConfig
  selectedPeriod?: string
  onSelectMonth: (period: string | undefined) => void
}


/** Trend payload → map label (YYYYMM) → value of the first series. */
export function toMonthMap(d: ChartDataResponse | undefined): Map<string, number> {
  const out = new Map<string, number>()
  const s = d?.series?.[0]
  const cats = d?.categories ?? []
  ;(s?.points ?? []).forEach((p, i) => {
    const key = /^\d{6}$/.test(p.category ?? "") ? p.category : cats[i]
    if (key) out.set(key, (out.get(key) ?? 0) + p.value)
  })
  return out
}

/** /computed payload → [category, value] rows, largest first. */
export function toRanked(d: ChartDataResponse | undefined): Array<[string, number]> {
  const out = new Map<string, number>()
  for (const s of d?.series ?? []) {
    for (const p of s.points ?? []) {
      const key = p.category || s.name
      if (key) out.set(key, (out.get(key) ?? 0) + p.value)
    }
  }
  return [...out.entries()].sort((a, b) => b[1] - a[1])
}

function RankTable({ first, rows, onPick }: { first: string; rows: Array<[string, number]>; onPick?: (k: string) => void }) {
  return (
    <div className="max-h-64 overflow-auto rounded border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{first}</TableHead>
            <TableHead className="text-right">Minggu over-limit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Tidak ada data</TableCell></TableRow>
          )}
          {rows.map(([k, v]) => (
            <TableRow key={k} className={cn(onPick && "cursor-pointer hover:bg-muted/50")} onClick={onPick ? () => onPick(k) : undefined}>
              <TableCell>{k}</TableCell>
              <TableCell className="text-right tabular-nums">{formatNumber(v, "raw", 0)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function OtOverMonthSection({ config, selectedPeriod, onSelectMonth }: Props) {
  const { hasPermission } = usePermission()
  const canEmployee = hasPermission("finance.bi.workforceemployee.view")
  const cal = config.period_calendar
  // The picked dept belongs to the month it was picked in, so changing the month elsewhere (FilterBar) drops it.
  const [pick, setPick] = useState<{ period: string; dept: string } | undefined>()
  const valid = selectedPeriod && /^\d{6}$/.test(selectedPeriod) ? selectedPeriod : undefined

  const dept = pick && pick.period === valid ? pick.dept : undefined
  const setDept = (d: string | undefined) => setPick(d && valid ? { period: valid, dept: d } : undefined)

  const weeksQ = useOtTrend(config.trend_dashboard, { period: "L12M", forceTrend: true, calendar: cal })
  const empsQ = useOtTrend(config.emp_dashboard, { period: "L12M", forceTrend: true, calendar: cal })
  const deptQ = useOtComputed({ code: config.trend_dashboard, groupBy: "group_1", period: valid ?? "", calendar: cal }, Boolean(valid))
  const nikQ = useOtComputed(
    { code: config.nik_dashboard, groupBy: "group_3", period: valid ?? "", calendar: cal, group1: dept },
    Boolean(valid && dept && canEmployee),
  )

  const trendError = weeksQ.isError || empsQ.isError
  const trendReady = weeksQ.isSuccess && empsQ.isSuccess
  const ok = trendReady ? { weeks: toMonthMap(weeksQ.data), emps: toMonthMap(empsQ.data) } : null
  const months = ok ? [...ok.weeks.keys()].sort() : []
  const chart = months.map((m) => ({ period: m, weeks: ok?.weeks.get(m) ?? 0, emps: ok?.emps.get(m) ?? 0 }))
  const deptRows = deptQ.isError ? "error" : deptQ.isSuccess ? toRanked(deptQ.data) : null
  const nikRows = nikQ.isError ? "error" : nikQ.isSuccess ? toRanked(nikQ.data) : null

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-semibold">Tren Over-limit per Bulan Payroll</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Orang-minggu = jumlah kejadian (satu orang over-limit di 3 minggu dihitung 3). Karyawan unik = jumlah orang
            berbeda (orang yang sama dihitung 1 per bulan); tidak boleh dijumlah antar bulan atau dept.
            Klik bulan untuk memfilter minggu-minggunya di bawah.
          </p>
        </div>
        {valid && (
          <button type="button" className="rounded border px-2 py-0.5 text-xs" onClick={() => onSelectMonth(undefined)}>
            Semua bulan
          </button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!trendReady && !trendError ? (
          <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">Loading…</div>
        ) : trendError ? (
          <p className="py-6 text-center text-sm text-destructive">Gagal memuat tren over-limit. Coba muat ulang.</p>
        ) : chart.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Belum ada data over-limit</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart
              data={chart}
              margin={{ top: 16, right: 16, bottom: 8, left: 8 }}
              onClick={(e) => {
                const p = (e as { activeLabel?: string } | undefined)?.activeLabel
                if (p) onSelectMonth(p === valid ? undefined : p)
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatNumber(v, "raw", 0)} />
              <Legend />
              <Bar dataKey="weeks" name="Orang-minggu" fill={biColors.primary} radius={[3, 3, 0, 0]} />
              <Line dataKey="emps" name="Karyawan unik" stroke={biColors.series[3]} strokeWidth={2} dot />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {valid && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Dept, bulan {valid} {canEmployee && "(klik dept untuk melihat karyawan)"}
              </p>
              {deptRows === null ? <p className="text-sm text-muted-foreground">Loading…</p> : deptRows === "error" ? (
                <p className="text-sm text-destructive">Gagal memuat data dept.</p>
              ) : (
                <RankTable first="Dept" rows={deptRows} onPick={canEmployee ? setDept : undefined} />
              )}
            </div>
            {canEmployee && dept && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Karyawan di {dept}, bulan {valid}</p>
                {nikRows === null ? <p className="text-sm text-muted-foreground">Loading…</p> : nikRows === "error" ? (
                  <p className="text-sm text-destructive">Gagal memuat data karyawan.</p>
                ) : (
                  <RankTable first="NIK" rows={nikRows} />
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
