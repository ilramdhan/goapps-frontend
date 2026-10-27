// KPI strip above the Employee Overtime table (HD-24). Small and fact-free on purpose: the numbers come
// from the table's own `summary` block, so it is not a KpiGrid (which reads bi_fact_metric series).

import { fmtDelta, type EmployeeOTSummary } from "@/lib/bi/employee-ot"
import { cn } from "@/lib/utils"

interface Props {
  summary: EmployeeOTSummary
  fmtHours: (v: number) => string
}

export function EmployeeOTKpiRow({ summary, fmtHours }: Props) {
  const prev = summary.prev
  const items: { label: string; value: string; alert?: boolean; delta?: number | null; hasDelta?: boolean }[] = [
    { label: "Karyawan ber-OT", value: String(summary.employees), hasDelta: true, delta: prev?.employeesDeltaPct ?? null },
    { label: "Total jam OT periode", value: fmtHours(summary.totalPeriodHours), hasDelta: true, delta: prev?.hoursDeltaPct ?? null },
    { label: "Over-limit (> 14 jam)", value: String(summary.overLimit), alert: summary.overLimit > 0 },
    { label: "Kronis", value: String(summary.chronic), alert: summary.chronic > 0 },
  ]
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="employee-ot-kpi">
      {items.map((it) => (
        <div key={it.label} className="rounded-md border px-3 py-2">
          <div className="text-xs text-muted-foreground">{it.label}</div>
          <div className={cn("text-lg font-semibold tabular-nums", it.alert && "text-destructive")}>{it.value}</div>
          {it.hasDelta && (
            <div className="text-xs text-muted-foreground tabular-nums" data-testid="employee-ot-delta" title="vs periode lalu">
              {fmtDelta(it.delta)} <span className="font-normal">vs periode lalu</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
