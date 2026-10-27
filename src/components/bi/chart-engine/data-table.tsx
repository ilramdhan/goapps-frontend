"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { ChartProps } from "@/components/bi/chart-engine/types"
import { toRechartsRows, seriesNames, cfgStr, cfgNum } from "@/lib/bi/data-adapter"
import { formatNumber, type NumberFormat } from "@/lib/bi/number-format"
import { cn } from "@/lib/utils"
import { EmployeeOTTable, EmployeeOTDayTable } from "@/components/bi/chart-engine/employee-ot-table"
import { EMPLOYEE_OT_MODE } from "@/lib/bi/employee-ot"

const EMPLOYEE_COLUMNS: { key: string; label: string; decimals?: number }[] = [
  { key: "HOURS", label: "Jam minggu terakhir" },
  { key: "EXCESS", label: "Kelebihan (jam)" },
  { key: "CHRONIC", label: "Minggu berturut-turut", decimals: 0 },
]

// Employee table (R2, table_mode=employee_week): one row per NIK; name and dept arrive in point meta.
function EmployeeTable({ config, data, onDrill, height }: ChartProps & { height: number }) {
  const rows = toRechartsRows(data)
  const fmt = cfgStr(config, "number_format", "raw") as NumberFormat
  const decimals = cfgNum(config, "decimals", 1)
  const currentPath = data.drillContext?.currentPath ?? []
  const canDrill = Boolean(data.drillContext?.canDrill) && Boolean(onDrill)
  return (
    <div className="overflow-auto" style={{ maxHeight: height }}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>NIK</TableHead>
            <TableHead>Nama</TableHead>
            <TableHead>Dept</TableHead>
            {EMPLOYEE_COLUMNS.map((c) => (
              <TableHead key={c.key} className="text-right">{c.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow
              key={r.category}
              className={cn(canDrill ? "cursor-pointer hover:bg-muted/50" : "")}
              onClick={canDrill ? () => onDrill?.([...currentPath, String(r.category)]) : undefined}
            >
              <TableCell className="font-mono text-xs">{r.category}</TableCell>
              <TableCell>{String(r.__name ?? "—")}</TableCell>
              <TableCell>{String(r.__dept ?? "—")}</TableCell>
              {EMPLOYEE_COLUMNS.map((c) => (
                <TableCell key={c.key} className="text-right tabular-nums">
                  {typeof r[c.key] === "number" ? formatNumber(r[c.key] as number, fmt, c.decimals ?? decimals) : "—"}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default function BiDataTable(props: ChartProps) {
  const { config, data, onDrill, height = 360 } = props
  if (cfgStr(config, "table_mode", "") === EMPLOYEE_OT_MODE) {
    return (data.drillContext?.currentPath ?? []).length === 0
      ? <EmployeeOTTable {...props} height={height} />
      : <EmployeeOTDayTable {...props} height={height} />
  }
  if (cfgStr(config, "table_mode", "") === "employee_week" && (data.drillContext?.currentPath ?? []).length === 0) {
    return <EmployeeTable {...props} height={height} />
  }
  const rows = toRechartsRows(data)
  const names = seriesNames(data)
  const fmt = cfgStr(config, "number_format", "thousands") as NumberFormat
  const decimals = cfgNum(config, "decimals", 1)
  // Use drillContext.currentPath so multi-level drill paths are preserved correctly.
  const currentPath = data.drillContext?.currentPath ?? []
  const canDrill = Boolean(data.drillContext?.canDrill) && Boolean(onDrill)

  return (
    <div className="overflow-auto" style={{ maxHeight: height }}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            {names.map((n) => (
              <TableHead key={n} className="text-right">
                {n}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow
              key={i}
              className={cn(canDrill ? "cursor-pointer hover:bg-muted/50" : "")}
              onClick={canDrill ? () => onDrill?.([...currentPath, String(r.category)]) : undefined}
            >
              <TableCell className="font-medium">{r.category}</TableCell>
              {names.map((n) => (
                <TableCell key={n} className="text-right tabular-nums">
                  {typeof r[n] === "number" ? formatNumber(r[n] as number, fmt, decimals) : "—"}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
