"use client"

// OT type mix card (H036): per-month share of OT hours by type (stacked 100%), tooltip with hours + %,
// and the share shift (percentage points) of the latest month vs the previous one.
// Uses the dashboard's primary data (series = OT type, point.category = YYYYMM, value = hours), so it
// follows the period range and dept/type chips. Shares are ratios computed here (HD-08), not facts.

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ChartDataResponse } from "@/types/bi"
import { seriesColor } from "@/lib/bi/color-tokens"
import { formatNumber } from "@/lib/bi/number-format"
import { periodLabel as formatPeriod } from "@/lib/bi/period"

interface OtMixCardProps {
  title?: string
  data: ChartDataResponse
  decimals?: number
  span?: "full" | "half" | "third"
}

const periodLabel = (p: string) => formatPeriod(p, "MONTHLY")

export interface MixRow {
  period: string
  total: number
  hours: Record<string, number>
  share: Record<string, number> // percent; sums to 100 when total > 0
}

export interface MixShift {
  type: string
  share: number
  shiftPp: number | null // null = no previous month with data
}

/** Primary payload → one row per YYYYMM (ascending) with hours and percent share per OT type. */
export function buildMix(d: ChartDataResponse | undefined): { types: string[]; rows: MixRow[] } {
  const types: string[] = []
  const byPeriod = new Map<string, Record<string, number>>()
  for (const s of d?.series ?? []) {
    if (!types.includes(s.name)) types.push(s.name)
    for (const p of s.points ?? []) {
      if (!/^\d{6}$/.test(p.category)) continue
      const h = byPeriod.get(p.category) ?? {}
      h[s.name] = (h[s.name] ?? 0) + p.value
      byPeriod.set(p.category, h)
    }
  }
  const rows = [...byPeriod.keys()].sort().map((period) => {
    const hours = byPeriod.get(period) ?? {}
    const total = types.reduce((a, t) => a + (hours[t] ?? 0), 0)
    const share: Record<string, number> = {}
    for (const t of types) share[t] = total > 0 ? ((hours[t] ?? 0) / total) * 100 : 0
    return { period, total, hours, share }
  })
  return { types, rows }
}

/** Share shift of the latest month vs the month before it (percentage points). */
export function buildShifts(types: string[], rows: MixRow[]): MixShift[] {
  const cur = rows[rows.length - 1]
  const prev = rows.length > 1 ? rows[rows.length - 2] : undefined
  if (!cur || cur.total <= 0) return []
  const prevOk = prev && prev.total > 0
  return types.map((type) => ({
    type,
    share: cur.share[type] ?? 0,
    shiftPp: prevOk ? (cur.share[type] ?? 0) - (prev.share[type] ?? 0) : null,
  }))
}

export function OtMixCard({ title, data, decimals, span }: OtMixCardProps) {
  const dec = decimals ?? 1
  const { types, rows } = buildMix(data)
  const shown = rows.filter((r) => r.total > 0)
  const shifts = buildShifts(types, rows)
  const latest = rows[rows.length - 1]
  const chartData = shown.map((r) => ({ label: periodLabel(r.period), period: r.period, ...r.share }))

  return (
    <Card className={cn(span === "full" && "lg:col-span-2")}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title ?? "Komposisi Tipe OT (%)"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {shown.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Belum ada data OT</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip
                  formatter={(v: number, name: string, item: { payload?: { period?: string } }) => {
                    const row = rows.find((r) => r.period === item.payload?.period)
                    return [`${formatNumber(row?.hours[name] ?? 0, "raw", dec)} jam · ${formatNumber(v, "raw", 1)}%`, name]
                  }}
                />
                <Legend />
                {types.map((t, i) => (
                  <Bar key={t} dataKey={t} stackId="mix" fill={seriesColor(i)} />
                ))}
              </BarChart>
            </ResponsiveContainer>

            {shifts.length > 0 && latest && (
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Pergeseran porsi {periodLabel(latest.period)} vs bulan sebelumnya (poin persentase)
                </div>
                <div className="flex flex-wrap gap-3">
                  {shifts.map((s) => (
                    <div key={s.type} className="rounded border px-3 py-1.5 text-sm">
                      <div className="text-xs text-muted-foreground">{s.type}</div>
                      <div className="tabular-nums">
                        {formatNumber(s.share, "raw", 1)}%{" "}
                        {s.shiftPp === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className={s.shiftPp > 0 ? "text-red-600" : s.shiftPp < 0 ? "text-emerald-600" : "text-muted-foreground"}>
                            {s.shiftPp > 0 ? "▲ +" : s.shiftPp < 0 ? "▼ " : ""}
                            {formatNumber(s.shiftPp, "raw", 1)} pp
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
