"use client"

// OT trend comparison card (H041): grouped bar (selected period vs MoM/YoY comparison, per OT type),
// Δ table per type sorted by largest increase, and each dept's contribution to the total Δ.
// Data comes from the /computed BFF (SUM of one metric grouped by group_2 / group_1) for two periods;
// Δ is computed here. A period with no series at all means "no data" (shown as such, never as 0).

import { useState } from "react"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { ChartDataResponse } from "@/types/bi"
import { biColors } from "@/lib/bi/color-tokens"
import { formatNumber } from "@/lib/bi/number-format"
import { periodLabel as formatPeriod } from "@/lib/bi/period"
import { useOtComputedMany } from "@/hooks/bi/use-ot-queries"

type CompareKey = "MoM" | "YoY"
type Totals = Map<string, number> | null // null = no data for that period

interface OtCompareCardProps {
  title?: string
  dashboardCode: string
  metric: string
  periodCalendar?: string
  selectedPeriod?: string
  decimals?: number
  span?: "full" | "half" | "third"
  group1Filter?: string[]
  group2Filter?: string[]
}

const periodLabel = (p: string) => formatPeriod(p, "MONTHLY")

/** YYYYMM shifted back by one month (MoM) or twelve (YoY). */
export function comparePeriod(p: string, mode: CompareKey): string {
  const y = parseInt(p.slice(0, 4), 10)
  const m = parseInt(p.slice(4, 6), 10) - 1
  const t = mode === "YoY" ? y * 12 + m - 12 : y * 12 + m - 1
  return `${Math.floor(t / 12)}${String((t % 12) + 1).padStart(2, "0")}`
}

/**
 * /computed payload → bucket totals, null when empty. The backend returns ONE series (named after the
 * dashboard) with one point per bucket (category = dept / OT type); a series-per-bucket shape
 * (name = bucket, single unnamed point) is also accepted.
 */
export function toTotals(d: ChartDataResponse | undefined): Totals {
  const out = new Map<string, number>()
  for (const s of d?.series ?? []) {
    for (const p of s.points ?? []) {
      const key = p.category || s.name
      if (key) out.set(key, (out.get(key) ?? 0) + p.value)
    }
  }
  return out.size === 0 ? null : out
}

export interface DeltaRow {
  key: string
  cur: number
  prev: number | null
  delta: number | null
  pct: number | null
}

/** Δ rows over the union of buckets, largest increase first. prev=null when the comparison has no data. */
export function buildDeltaRows(cur: Totals, prev: Totals): DeltaRow[] {
  const keys = new Set<string>([...(cur?.keys() ?? []), ...(prev?.keys() ?? [])])
  const rows = [...keys].map((key) => {
    const c = cur?.get(key) ?? 0
    const p = prev === null ? null : (prev.get(key) ?? 0)
    const delta = p === null ? null : c - p
    const pct = p === null || p === 0 ? null : ((c - p) / p) * 100
    return { key, cur: c, prev: p, delta, pct }
  })
  return rows.sort((a, b) => (b.delta ?? -Infinity) - (a.delta ?? -Infinity))
}

function DeltaCell({ v, dec, suffix = "" }: { v: number | null; dec: number; suffix?: string }) {
  if (v === null) return <span className="text-muted-foreground">—</span>
  const cls = v > 0 ? "text-red-600" : v < 0 ? "text-emerald-600" : "text-muted-foreground"
  return (
    <span className={cn("tabular-nums", cls)}>
      {v > 0 ? "▲ +" : v < 0 ? "▼ " : ""}
      {formatNumber(v, "raw", dec)}
      {suffix}
    </span>
  )
}

export function OtCompareCard(props: OtCompareCardProps) {
  const { title, dashboardCode, metric, periodCalendar, selectedPeriod, span, group1Filter, group2Filter } = props
  const dec = props.decimals ?? 1
  const [mode, setMode] = useState<CompareKey>("MoM")
  const g1 = (group1Filter ?? []).join(",")
  const g2 = (group2Filter ?? []).join(",")
  const validPeriod = selectedPeriod && /^\d{6}$/.test(selectedPeriod) ? selectedPeriod : undefined
  const prevPeriod = validPeriod ? comparePeriod(validPeriod, mode) : undefined
  const q = (groupBy: string, period: string | undefined) => ({
    code: dashboardCode, numerator: metric, groupBy, period: period ?? "", calendar: periodCalendar, group1: g1, group2: g2,
  })
  const results = useOtComputedMany(
    [q("group_2", validPeriod), q("group_2", prevPeriod), q("group_1", validPeriod), q("group_1", prevPeriod)],
    Boolean(validPeriod && prevPeriod),
  )
  const isError = results.some((r) => r.isError)
  const ready = Boolean(validPeriod) && results.every((r) => r.isSuccess)
  const loaded = ready
    ? { types: [toTotals(results[0].data), toTotals(results[1].data)] as [Totals, Totals], depts: [toTotals(results[2].data), toTotals(results[3].data)] as [Totals, Totals] }
    : null

  const typeRows = loaded ? buildDeltaRows(...loaded.types) : []
  const deptRows = loaded ? buildDeltaRows(...loaded.depts) : []
  const noPrev = loaded !== null && loaded.types[1] === null
  const totalCur = typeRows.reduce((a, r) => a + r.cur, 0)
  const totalDelta = noPrev ? null : typeRows.reduce((a, r) => a + (r.delta ?? 0), 0)
  const curLabel = validPeriod ? periodLabel(validPeriod) : ""
  const prevLabel = prevPeriod ? periodLabel(prevPeriod) : ""
  const barData = typeRows.map((r) => ({ category: r.key, [curLabel]: r.cur, [prevLabel]: r.prev ?? 0 }))

  return (
    <Card className={cn(span === "full" && "lg:col-span-2")}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold">
          {title ?? "Perbandingan periode"}
          {validPeriod && <span className="ml-2 text-xs font-normal text-muted-foreground">— {curLabel} vs {prevLabel}</span>}
        </CardTitle>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={mode}
          onValueChange={(v) => v && setMode(v as CompareKey)}
          aria-label="Pembanding periode"
        >
          <ToggleGroupItem value="MoM" className="px-2 text-xs">MoM</ToggleGroupItem>
          <ToggleGroupItem value="YoY" className="px-2 text-xs">YoY</ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent className="space-y-4">
        {!validPeriod ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Pilih periode untuk membandingkan.</p>
        ) : isError ? (
          <p className="py-6 text-center text-sm text-destructive">Gagal memuat perbandingan. Coba muat ulang.</p>
        ) : loaded === null ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <>
            {noPrev && (
              <p className="rounded border border-dashed px-3 py-2 text-xs text-muted-foreground">
                Data {mode} ({prevLabel}) belum ada, jadi selisih tidak dapat dihitung.
              </p>
            )}
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} margin={{ top: 16, right: 16, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatNumber(v, "raw", 0)} />
                <Tooltip formatter={(v: number) => formatNumber(v, "raw", dec)} />
                <Legend />
                <Bar dataKey={curLabel} fill={biColors.primary} radius={[3, 3, 0, 0]} />
                {!noPrev && <Bar dataKey={prevLabel} fill={biColors.neutral} radius={[3, 3, 0, 0]} />}
              </BarChart>
            </ResponsiveContainer>

            <div className="grid gap-4 lg:grid-cols-2">
              <DeltaTable heading="Δ per tipe OT (kenaikan terbesar dulu)" first="Tipe" rows={typeRows}
                curLabel={curLabel} prevLabel={prevLabel} dec={dec} />
              <DeltaTable heading="Kontribusi dept ke Δ total" first="Dept" rows={deptRows}
                curLabel={curLabel} prevLabel={prevLabel} dec={dec} totalDelta={totalDelta} totalCur={totalCur} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function DeltaTable({ heading, first, rows, curLabel, prevLabel, dec, totalDelta, totalCur }: {
  heading: string; first: string; rows: DeltaRow[]; curLabel: string; prevLabel: string; dec: number
  totalDelta?: number | null; totalCur?: number
}) {
  const showShare = totalDelta !== undefined
  return (
    <div className="min-w-0 space-y-1">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{heading}</div>
      <div className="max-h-[320px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{first}</TableHead>
              <TableHead className="text-right">{curLabel}</TableHead>
              <TableHead className="text-right">{prevLabel}</TableHead>
              <TableHead className="text-right">Δ jam</TableHead>
              <TableHead className="text-right">Δ%</TableHead>
              {showShare && <TableHead className="text-right">Kontribusi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.key}>
                <TableCell>{r.key}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(r.cur, "raw", dec)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.prev === null ? <span className="text-muted-foreground">—</span> : formatNumber(r.prev, "raw", dec)}
                </TableCell>
                <TableCell className="text-right"><DeltaCell v={r.delta} dec={dec} /></TableCell>
                <TableCell className="text-right"><DeltaCell v={r.pct} dec={1} suffix="%" /></TableCell>
                {showShare && (
                  <TableCell className="text-right tabular-nums">
                    {r.delta === null || !totalDelta ? "—" : `${formatNumber((r.delta / totalDelta) * 100, "raw", 0)}%`}
                  </TableCell>
                )}
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={showShare ? 6 : 5} className="text-center text-muted-foreground">Belum ada data</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {showShare && totalDelta !== undefined && (
        <div className="text-xs text-muted-foreground">
          Total {formatNumber(totalCur ?? 0, "raw", dec)} jam · Δ total{" "}
          {totalDelta === null ? "—" : <DeltaCell v={totalDelta} dec={dec} />}
        </div>
      )}
    </div>
  )
}
