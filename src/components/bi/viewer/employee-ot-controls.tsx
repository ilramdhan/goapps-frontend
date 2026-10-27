"use client"

// Employee Overtime controls (table_mode=employee_ot, HD-18): "Kelompokkan per" dropdown from the
// response group_options, plus a value filter whose values come from the table rows (no extra
// endpoint). Values seen while unfiltered are kept so narrowing the filter does not hide the others.

import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ChartDataResponse, ViewerState } from "@/types/bi"
import { comparePeriodOptions, employeeOTGroupValues, fmtPayrollLabel, GROUP_BY_LABELS, type EmployeeOTBlock } from "@/lib/bi/employee-ot"
import { FilterChips } from "./filter-chips"

const NONE = "__none__"
const PREV = "__prev__"

interface EmployeeOTControlsProps {
  state: ViewerState
  onChange: (next: ViewerState) => void
  block: EmployeeOTBlock | undefined
  data: ChartDataResponse | undefined
  /** True while the shown data belongs to the previous query (keepPreviousData). */
  stale: boolean
}

export function EmployeeOTControls({ state, onChange, block, data, stale }: EmployeeOTControlsProps) {
  const groupBy = state.groupBy ?? ""
  const selected = state.groupFilter ?? []
  const scope = `${groupBy}|${state.period}`
  const [known, setKnown] = useState<{ scope: string; values: string[] }>({ scope: "", values: [] })

  // Remember the full value list from an unfiltered, current response of this group-by + period.
  if (!stale && groupBy && selected.length === 0 && block?.groupBy === groupBy) {
    const fresh = employeeOTGroupValues(data)
    if (known.scope !== scope || known.values.join("\u001f") !== fresh.join("\u001f")) {
      setKnown({ scope, values: fresh })
    }
  }
  const base = known.scope === scope ? known.values : []
  // Employees without the attribute have "" as group; the subtotal row labels them, the chips skip them.
  const values = [...new Set([...base, ...selected])].filter(Boolean).sort()

  const options = block?.groupOptions ?? []
  const toggle = (v: string) =>
    onChange({ ...state, groupFilter: selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v] })

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-[90px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Kelompokkan per:
        </span>
        <Select
          value={groupBy || NONE}
          onValueChange={(v) => onChange({ ...state, groupBy: v === NONE ? "" : v, groupFilter: [] })}
        >
          <SelectTrigger className="h-8 w-[180px]" aria-label="Kelompokkan per">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Tanpa grup</SelectItem>
            {options.map((o) => (
              <SelectItem key={o} value={o}>
                {GROUP_BY_LABELS[o] ?? o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Bandingkan dengan:
        </span>
        <Select
          value={state.comparePeriod || PREV}
          onValueChange={(v) => onChange({ ...state, comparePeriod: v === PREV ? "" : v })}
        >
          <SelectTrigger className="h-8 w-[180px]" aria-label="Bandingkan dengan">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PREV}>Periode sebelumnya</SelectItem>
            {comparePeriodOptions(block?.ranges?.periodFrom ?? "").map((p) => (
              <SelectItem key={p} value={p}>
                {fmtPayrollLabel(p)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {groupBy && values.length > 0 && (
        <FilterChips
          label={GROUP_BY_LABELS[groupBy] ?? groupBy}
          values={values}
          selected={selected}
          onToggle={toggle}
          onSelectAll={() => onChange({ ...state, groupFilter: [] })}
        />
      )}
    </div>
  )
}
