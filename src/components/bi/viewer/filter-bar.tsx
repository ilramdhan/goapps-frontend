"use client"

// Viewer filter bar — period preset dropdown + custom range + compare toggle + month selector.

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  type ViewerState,
  type PeriodPreset,
  type CompareKey,
  presetsForGrain,
  periodPresetLabel,
  COMPARE_LABELS,
} from "@/types/bi"
import { TREND_CHART_TYPES } from "@/hooks/bi/use-chart-data"

interface FilterBarProps {
  state: ViewerState
  onChange: (next: ViewerState) => void
  /** Compare modes the dashboard enables (subset of COMPARE_KEYS). NONE is always available. */
  compareModes: CompareKey[]
  /** Primary chart type from the dashboard config. */
  primaryChartType?: string
  /** Alternative chart types the viewer can switch to (from chart_config.available_chart_types). */
  availableChartTypes?: string[]
  /**
   * Period labels returned by the main chart query (e.g. ["202404", "202405", ...]).
   * Used to populate the Month selector when the active chart is categorical.
   */
  categories?: string[]
  /** Dashboard period calendar (CALENDAR | PAYROLL_26_25) — only changes preset wording. */
  periodCalendar?: string
  /** Restricts the period dropdown (e.g. employee_ot accepts payroll-period presets only). Default: all. */
  allowedPresets?: PeriodPreset[]
}

/** Human-readable label for a chart type string. */
function humanizeChartType(t: string): string {
  const labels: Record<string, string> = {
    waterfall: "Waterfall",
    bar: "Bar",
    line: "Line",
    area: "Area",
    multi_line: "Multi-Line",
    data_table: "Table",
    horizontal_bar: "Horiz. Bar",
    donut: "Donut",
    mixed: "Mixed",
    stacked_bar: "Stacked Bar",
    kpi_card: "KPI Card",
    treemap: "Treemap",
    heatmap: "Heatmap",
    scatter: "Scatter",
  }
  return labels[t] ?? t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function FilterBar({
  state,
  onChange,
  compareModes,
  primaryChartType = "",
  availableChartTypes = [],
  categories = [],
  periodCalendar,
  allowedPresets = presetsForGrain(),
}: FilterBarProps) {
  const availableCompares: CompareKey[] = ["NONE", ...compareModes.filter((c) => c !== "NONE")]
  const activeChartType = state.chartType || primaryChartType

  // Period categories are YYYYMM 6-digit strings — filter out group-name categories
  // that come from categorical charts (waterfall/bar at group_2 level).
  const periodCategories = categories.filter(c => /^\d{6}$/.test(c))

  // Show month selector when categorical chart type AND we have actual period labels to select.
  const showMonthSelector = !TREND_CHART_TYPES.has(activeChartType) && periodCategories.length > 0

  // "" = show all months (no selected_month override). Non-empty = filter to that month.
  const effectivePeriod = state.selectedPeriod ?? ""

  function fmtMonth(yyyymm: string): string {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    const m = parseInt(yyyymm.slice(4, 6), 10)
    return `${months[m - 1] ?? ""} ${yyyymm.slice(0, 4)}`
  }

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4">
      {/* Period preset */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase text-muted-foreground">Period</span>
        <Select
          value={state.period}
          onValueChange={(v) => onChange({ ...state, period: v as PeriodPreset, selectedPeriod: undefined })}
        >
          <SelectTrigger className="h-8 w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {allowedPresets.map((p) => (
              <SelectItem key={p} value={p}>
                {periodPresetLabel(p, periodCalendar)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Month selector — visible for categorical chart types once data is loaded.
          Selecting a month passes selected_month to the BFF to narrow the query.
          "All Months" (value="") clears selectedPeriod so the chart uses the full period range. */}
      {showMonthSelector && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Month</span>
          <select
            value={effectivePeriod}
            onChange={(e) => onChange({ ...state, selectedPeriod: e.target.value || undefined })}
            className="rounded border border-border bg-background px-2 py-1 text-xs"
          >
            <option value="">All Months</option>
            {[...periodCategories].reverse().map((c) => (
              <option key={c} value={c}>{fmtMonth(c)}</option>
            ))}
          </select>
        </div>
      )}

      {/* Custom date range */}
      {state.period === "CUSTOM" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={state.periodFrom ?? ""}
            onChange={(e) => onChange({ ...state, periodFrom: e.target.value })}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          />
          <span className="text-muted-foreground">→</span>
          <input
            type="date"
            value={state.periodTo ?? ""}
            onChange={(e) => onChange({ ...state, periodTo: e.target.value })}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          />
        </div>
      )}

      {/* Compare toggle */}
      {availableCompares.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-muted-foreground">Compare</span>
          <div className="flex rounded-md bg-muted p-0.5">
            {availableCompares.map((c) => (
              <Button
                key={c}
                type="button"
                size="sm"
                variant="ghost"
                className={cn(
                  "h-7 px-3 text-xs",
                  state.compare === c && "bg-background shadow-sm"
                )}
                onClick={() => onChange({ ...state, compare: c })}
              >
                {COMPARE_LABELS[c]}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Chart type switcher — only shown when available_chart_types is configured */}
      {availableChartTypes.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-muted-foreground">View as</span>
          <select
            value={activeChartType}
            onChange={(e) => onChange({ ...state, chartType: e.target.value === primaryChartType ? "" : e.target.value })}
            className="rounded border border-border bg-background px-2 py-1 text-xs font-medium"
          >
            <option value={primaryChartType}>{humanizeChartType(primaryChartType)}</option>
            {availableChartTypes.map((t) => (
              <option key={t} value={t}>
                {humanizeChartType(t)}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
