"use client"

// Employee Overtime table (table_mode=employee_ot, HD-18): one row per NIK with R1 period hours and
// one column per week of the period (HD-25), grouped by the viewer's "Kelompokkan per" with a subtotal row per group.
// Drill NIK → day shows actual OT and limit hours per day.

import { Fragment, useState } from "react"
import { AlertOctagon, AlertTriangle, ArrowDown, ArrowUp } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import type { ChartProps } from "@/components/bi/chart-engine/types"
import { toRechartsRows, cfgStr, cfgNum, type RechartsRow } from "@/lib/bi/data-adapter"
import { formatNumber, type NumberFormat } from "@/lib/bi/number-format"
import {
  readEmployeeOTBlock,
  fmtDay,
  fmtRange,
  fmtHiddenOver,
  hiddenOverLines,
  fmtDelta,
  localSubtotals,
  localSummary,
  otLevel,
  barPercent,
  GROUP_BY_LABELS,
  fmtPayrollLabel,
  payrollLabelOf,
  WEEK_LIMIT_HOURS,
  WEEK_HEADER_TOOLTIP,
  CHRONIC_WEEKS_THRESHOLD,
  type EmployeeOTSubtotal,
  type OTLevel,
} from "@/lib/bi/employee-ot"
import { EmployeeOTKpiRow } from "@/components/bi/chart-engine/employee-ot-kpi"
import { cn } from "@/lib/utils"

type NumKey = string

interface SortState {
  key: NumKey
  desc: boolean
}

/** More OT than the previous window is the alert direction; no data keeps the default color. */
const deltaClass = (d: unknown) => (typeof d === "number" && d > 0 ? "text-destructive" : "")

const BAR_CLASS = {
  none: "bg-primary/40",
  over: "bg-amber-500 dark:bg-amber-400",
  chronic: "bg-destructive",
} as const

const LEVEL_TEXT = {
  none: "",
  over: "Melebihi 14 jam/minggu",
  chronic: `Kronis: melebihi batas ≥ ${CHRONIC_WEEKS_THRESHOLD} minggu berturut-turut`,
} as const

/** Period hours with a bar scaled to the largest displayed row; the level is also shown as icon + title, not color alone. */
function PeriodHoursCell({ text, pct, level }: { text: string; pct: number; level: OTLevel }) {
  const Icon = level === "chronic" ? AlertOctagon : AlertTriangle
  return (
    <div className="flex flex-col items-end gap-1" title={LEVEL_TEXT[level] || undefined}>
      <span className="inline-flex items-center gap-1">
        {level !== "none" && (
          <Icon
            className={cn("h-3 w-3", level === "chronic" ? "text-destructive" : "text-amber-600 dark:text-amber-400")}
            aria-hidden="true"
          />
        )}
        {text}
        {level !== "none" && <span className="sr-only">{LEVEL_TEXT[level]}</span>}
      </span>
      <span className="block h-1.5 w-24 rounded-full bg-muted" aria-hidden="true">
        <span
          data-testid="employee-ot-bar"
          data-level={level}
          className={cn("block h-full rounded-full", BAR_CLASS[level])}
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  )
}

/** Limit hours of one week; above 14 is flagged with icon + sr-only text, not color alone (HD-25). */
function WeekCell({ text, over }: { text: string; over: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1", over && "font-semibold text-amber-700 dark:text-amber-400")} title={over ? `Melebihi ${WEEK_LIMIT_HOURS} jam` : undefined}>
      {over && <AlertTriangle className="h-3 w-3" aria-hidden="true" />}
      {text}
      {over && <span className="sr-only">Melebihi {WEEK_LIMIT_HOURS} jam</span>}
    </span>
  )
}

/** Excess hours plus, when over weeks have no column, a few short lines naming them; the full list is the cell tooltip (H053). */
function ExcessCell({ text, lines, more }: { text: string; lines: string[]; more: number }) {
  return (
    <span className="flex flex-col items-end">
      {text}
      {lines.length > 0 && (
        <span data-testid="employee-ot-hidden-over" className="mt-0.5 flex flex-col items-end text-[11px] font-normal leading-tight text-muted-foreground">
          <span>Di luar kolom:</span>
          {lines.map((l) => (
            <span key={l} className="whitespace-nowrap">{l}</span>
          ))}
          {more > 0 && <span>+{more} lagi</span>}
        </span>
      )}
    </span>
  )
}

const num = (r: RechartsRow, k: string) => (typeof r[k] === "number" ? (r[k] as number) : 0)

export function EmployeeOTTable({ config, data, onDrill, height }: ChartProps & { height: number }) {
  const [onlyOver, setOnlyOver] = useState(false)
  const [sort, setSort] = useState<SortState | null>(null)
  const block = readEmployeeOTBlock(config)
  const fmt = cfgStr(config, "number_format", "raw") as NumberFormat
  const decimals = cfgNum(config, "decimals", 1)
  const currentPath = data.drillContext?.currentPath ?? []
  const canDrill = Boolean(data.drillContext?.canDrill) && Boolean(onDrill)
  const grouped = Boolean(block?.groupBy)
  const r = block?.ranges

  const weekCols = (block?.weeks ?? []).map((w) => ({
    key: w.key,
    label: w.label,
    sub: `${fmtRange(w.from, w.to)}${w.partial ? " (berjalan)" : ""}`,
    title: `${w.period} · ${WEEK_HEADER_TOOLTIP}`,
    week: true,
    decimals: undefined as number | undefined,
  }))
  const columns: { key: NumKey; label: string; sub?: string; title?: string; week?: boolean; decimals?: number }[] = [
    { key: "PERIOD_HOURS", label: "Jam OT periode", sub: r ? fmtRange(r.periodFrom, r.periodTo) : undefined },
    ...weekCols,
    { key: "EXCESS", label: "Kelebihan > 14 jam" },
    { key: "WEEKS_OVER", label: "Minggu > 14 jam", decimals: 0 },
    { key: "CHRONIC", label: "Minggu berturut-turut", decimals: 0 },
  ]

  let rows = toRechartsRows(data)
  if (onlyOver) rows = rows.filter((x) => num(x, "EXCESS") > 0)
  if (sort) {
    const dir = sort.desc ? -1 : 1
    // Stable within the group order the backend returned; only the rank inside each group changes.
    rows = [...rows].sort((a, b) =>
      grouped && a.__group !== b.__group
        ? String(a.__group ?? "").localeCompare(String(b.__group ?? ""))
        : dir * (num(a, sort.key) - num(b, sort.key)),
    )
  }
  const subtotals = new Map(
    (onlyOver || !block ? localSubtotals(rows) : block.subtotals).map((s) => [s.group, s]),
  )

  const maxPeriod = rows.reduce((m, x) => Math.max(m, num(x, "PERIOD_HOURS")), 0)

  const summary = onlyOver || !block?.summary ? localSummary(rows) : block.summary

  const fmtVal = (v: number, d?: number) => formatNumber(v, fmt, d ?? decimals)
  const toggleSort = (key: NumKey) =>
    setSort((s) => (s?.key === key ? (s.desc ? { key, desc: false } : null) : { key, desc: true }))
  const subtotalCell = (key: NumKey, s: EmployeeOTSubtotal) =>
    key === "CHRONIC" || key === "WEEKS_OVER" ? "" : key.startsWith("W:") ? fmtVal(s.weekSums[key] ?? 0) : fmtVal(key === "PERIOD_HOURS" ? s.PERIOD_HOURS : s.EXCESS)
  const totalCols = 5 + columns.length

  return (
    <div className="space-y-2">
      <EmployeeOTKpiRow summary={summary} fmtHours={(v) => fmtVal(v)} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <label className="flex cursor-pointer items-center gap-2">
          <Checkbox checked={onlyOver} onCheckedChange={(v) => setOnlyOver(v === true)} aria-label="Hanya melebihi 14 jam" />
          Hanya melebihi 14 jam/minggu
        </label>
        <span>Total: {rows.length} karyawan</span>
        {block?.weeksTruncated && (
          <span data-testid="employee-ot-weeks-note">
            Menampilkan {block.weeks.length} dari {block.weeksTotal} minggu terakhir; kelebihan tetap dihitung dari semua minggu.
          </span>
        )}
        {block?.truncated && (
          <span className="text-amber-600 dark:text-amber-400">
            Dibatasi {block.maxRows} karyawan teratas; persempit dengan filter grup.
          </span>
        )}
      </div>
      <div className="overflow-auto" style={{ maxHeight: height }}>
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead>NIK</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Divisi</TableHead>
              <TableHead>Dept</TableHead>
              {columns.map((c) => (
                <TableHead key={c.key} className="text-right" title={c.title}>
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort(c.key)}>
                    {c.label}
                    {sort?.key === c.key && (sort.desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
                  </button>
                  {c.sub && <div className="text-[10px] font-normal text-muted-foreground">{c.sub}</div>}
                </TableHead>
              ))}
              <TableHead className="text-right">
                {r?.prevTo && payrollLabelOf(r.prevTo) ? `vs ${fmtPayrollLabel(payrollLabelOf(r.prevTo))}` : "vs periode lalu"}
                {r?.prevFrom && r.prevTo && (
                  <div className="text-[10px] font-normal text-muted-foreground">{fmtRange(r.prevFrom, r.prevTo)}</div>
                )}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => {
              const g = String(row.__group ?? "")
              const s = grouped && (i === 0 || rows[i - 1].__group !== row.__group) ? subtotals.get(g) : undefined
              return (
                <Fragment key={String(row.category)}>
                  {s && (
                    <TableRow className="bg-muted/60 font-semibold hover:bg-muted/60">
                      <TableCell colSpan={4}>
                        {GROUP_BY_LABELS[block?.groupBy ?? ""] ?? block?.groupBy}: {g || "(kosong)"}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {s.employees} karyawan · rata-rata {fmtVal(s.avg_period_hours)} jam · {formatNumber(s.over_pct, "raw", 1)}% over-limit
                        </span>
                      </TableCell>
                      {columns.map((c) => (
                        <TableCell key={c.key} className="text-right tabular-nums">
                          {subtotalCell(c.key, s)}
                        </TableCell>
                      ))}
                      <TableCell />
                    </TableRow>
                  )}
                  <TableRow
                    className={cn(canDrill ? "cursor-pointer hover:bg-muted/50" : "")}
                    onClick={canDrill ? () => onDrill?.([...currentPath, String(row.category)]) : undefined}
                  >
                    <TableCell className="font-mono text-xs">{row.category}</TableCell>
                    <TableCell>{String(row.__name || "—")}</TableCell>
                    <TableCell>{String(row.__division || "—")}</TableCell>
                    <TableCell>{String(row.__dept || "—")}</TableCell>
                    {columns.map((c) => (
                      <TableCell
                        key={c.key}
                        className={cn(
                          "text-right tabular-nums",
                          c.key === "EXCESS" && num(row, "EXCESS") > 0 && "font-semibold text-destructive",
                        )}
                        title={c.key === "EXCESS" ? fmtHiddenOver(row, (v) => fmtVal(v)) || undefined : undefined}
                      >
                        {c.key === "PERIOD_HOURS" ? (
                          <PeriodHoursCell
                            text={fmtVal(num(row, c.key), c.decimals)}
                            pct={barPercent(num(row, c.key), maxPeriod)}
                            level={otLevel(num(row, "EXCESS"), num(row, "CHRONIC"))}
                          />
                        ) : c.week ? (
                          <WeekCell text={fmtVal(num(row, c.key), c.decimals)} over={num(row, c.key) > WEEK_LIMIT_HOURS} />
                        ) : c.key === "EXCESS" ? (
                          <ExcessCell text={fmtVal(num(row, c.key), c.decimals)} {...hiddenOverLines(row, (v) => fmtVal(v))} />
                        ) : (
                          fmtVal(num(row, c.key), c.decimals)
                        )}
                      </TableCell>
                    ))}
                    <TableCell className={cn("text-right tabular-nums", deltaClass(row.__delta_pct))} data-testid="employee-ot-row-delta">
                      {fmtDelta(typeof row.__delta_pct === "number" ? row.__delta_pct : null)}
                    </TableCell>
                  </TableRow>
                </Fragment>
              )
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={totalCols} className="py-6 text-center text-sm text-muted-foreground">
                  Tidak ada karyawan yang cocok dengan filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

/** NIK → day drill: actual OT hours per day and the limit hours of the R2 week days. */
export function EmployeeOTDayTable({ config, data, height }: ChartProps & { height: number }) {
  const rows = toRechartsRows(data)
  const fmt = cfgStr(config, "number_format", "raw") as NumberFormat
  const decimals = cfgNum(config, "decimals", 1)
  return (
    <div className="overflow-auto" style={{ maxHeight: height }}>
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow>
            <TableHead>Tanggal</TableHead>
            <TableHead className="text-right">Jam OT aktual</TableHead>
            <TableHead className="text-right">Jam hitung batas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={String(row.category)}>
              <TableCell>{fmtDay(String(row.category))}</TableCell>
              <TableCell className="text-right tabular-nums">{formatNumber(num(row, "ACTUAL"), fmt, decimals)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatNumber(num(row, "LIMIT"), fmt, decimals)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
