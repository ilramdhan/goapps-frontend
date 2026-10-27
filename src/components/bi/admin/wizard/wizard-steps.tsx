"use client"

// The seven wizard steps. Each step receives the form data + an updater and renders
// only the fields it owns. Zero-JSON: every input is a control, never a raw JSON box.

import { useState } from "react"
import { HexColorPicker } from "react-colorful"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import {
  ChartType,
  PeriodeGrain,
  CompareMode,
  presetsForGrain,
  PERIOD_CALENDAR_LABELS,
  periodPresetLabel,
  type DashboardFormData,
  type KpiEntry,
  type ViewModeConfig,
  chartTypeToString,
} from "@/types/bi"
import { allChartTypes } from "@/lib/bi/chart-registry"
import { useFactDistincts } from "@/hooks/bi/use-fact-distincts"
import { useDashboardGroups } from "@/hooks/bi/use-group"
import { useRoles } from "@/hooks/iam/use-roles"

type SetForm = (updater: (prev: DashboardFormData) => DashboardFormData) => void

interface StepProps {
  form: DashboardFormData
  setForm: SetForm
}

// =========================================================================
// Step 1 — Basic
// =========================================================================

export function StepBasic({ form, setForm }: StepProps) {
  const { data: groups } = useDashboardGroups()
  return (
    <div className="space-y-4">
      <Field label="Dashboard Code" hint="Uppercase, digits, underscore. Immutable after create.">
        <Input
          value={form.dashboardCode}
          onChange={(e) => setForm((p) => ({ ...p, dashboardCode: e.target.value.toUpperCase() }))}
          placeholder="EBITDA"
        />
      </Field>
      <Field label="Title">
        <Input
          value={form.dashboardTitle}
          onChange={(e) => setForm((p) => ({ ...p, dashboardTitle: e.target.value }))}
          placeholder="EBITDA Performance"
        />
      </Field>
      <Field label="Description">
        <Textarea
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          rows={2}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Group">
          <Select value={form.groupId} onValueChange={(v) => setForm((p) => ({ ...p, groupId: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select group" />
            </SelectTrigger>
            <SelectContent>
              {(groups ?? []).map((g) => (
                <SelectItem key={g.groupId} value={g.groupId}>
                  {g.groupName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Display Order">
          <Input
            type="number"
            value={form.displayOrder}
            onChange={(e) => setForm((p) => ({ ...p, displayOrder: Number(e.target.value) || 0 }))}
          />
        </Field>
      </div>
      <ToggleRow
        label="Active"
        checked={form.isActive}
        onChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
      />
    </div>
  )
}

// =========================================================================
// Step 2 — Data binding
// =========================================================================

export function StepDataBinding({ form, setForm }: StepProps) {
  const { data: typesDistinct } = useFactDistincts("")
  const { data: scopedDistinct } = useFactDistincts(form.filterType)
  const types = typesDistinct?.types ?? []
  const group1s = scopedDistinct?.group1s ?? []

  return (
    <div className="space-y-4">
      <Field label="Data Type" hint="The fact-table TYPE this dashboard reads (e.g. MIS).">
        {types.length > 0 ? (
          <Select value={form.filterType} onValueChange={(v) => setForm((p) => ({ ...p, filterType: v, filterGroup1: "" }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {types.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm text-muted-foreground">No data ingested yet — upload Excel or wait for ETL.</p>
        )}
      </Field>

      {form.filterType && (
        <Field label="Group 1 Filter (optional)" hint="Pre-narrow to one GROUP_1 (e.g. EBITDA → show its breakdown).">
          <Select
            value={form.filterGroup1 || "__none__"}
            onValueChange={(v) => setForm((p) => ({ ...p, filterGroup1: v === "__none__" ? "" : v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {group1s.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {/* Filter chip labels — optional; only needed when this dashboard shows filter chips */}
      <div className="rounded-md border border-dashed border-border/60 p-3 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Filter Chip Labels <span className="font-normal normal-case">(optional — shown in viewer above the chart)</span>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Group 1 Chip Label" hint='e.g. "Delivery Type"'>
            <Input
              value={(form.chartConfig["filter_chips_group1_label"] as string) ?? ""}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  chartConfig: { ...p.chartConfig, filter_chips_group1_label: e.target.value || undefined },
                }))
              }
              placeholder="Filter"
            />
          </Field>
          <Field label="Group 2 Chip Label" hint='e.g. "Category"'>
            <Input
              value={(form.chartConfig["filter_chips_group2_label"] as string) ?? ""}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  chartConfig: { ...p.chartConfig, filter_chips_group2_label: e.target.value || undefined },
                }))
              }
              placeholder="Category"
            />
          </Field>
        </div>
      </div>

      <Field label="Period Grain">
        <Select
          value={String(form.periodeGrain)}
          onValueChange={(v) => setForm((p) => ({ ...p, periodeGrain: Number(v) as PeriodeGrain }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={String(PeriodeGrain.PERIODE_GRAIN_DAILY)}>Daily</SelectItem>
            <SelectItem value={String(PeriodeGrain.PERIODE_GRAIN_WEEKLY)}>Weekly</SelectItem>
            <SelectItem value={String(PeriodeGrain.PERIODE_GRAIN_MONTHLY)}>Monthly</SelectItem>
            <SelectItem value={String(PeriodeGrain.PERIODE_GRAIN_QUARTERLY)}>Quarterly</SelectItem>
            <SelectItem value={String(PeriodeGrain.PERIODE_GRAIN_YEARLY)}>Yearly</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field label="Period Calendar">
        <Select value={form.periodCalendar} onValueChange={(v) => setForm((p) => ({ ...p, periodCalendar: v as DashboardFormData["periodCalendar"] }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PERIOD_CALENDAR_LABELS) as DashboardFormData["periodCalendar"][]).map((c) => (
              <SelectItem key={c} value={c}>
                {PERIOD_CALENDAR_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Default Period">
        <Select value={form.defaultPeriod} onValueChange={(v) => setForm((p) => ({ ...p, defaultPeriod: v as DashboardFormData["defaultPeriod"] }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {presetsForGrain(form.periodeGrain).map((preset) => (
              <SelectItem key={preset} value={preset}>
                {periodPresetLabel(preset, form.periodCalendar)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  )
}

// =========================================================================
// Step 3 — Chart type gallery
// =========================================================================

/** Compatible alternative chart types a viewer can switch to, keyed by primary chart type. */
const COMPATIBLE_TYPES: Record<string, string[]> = {
  waterfall:    ["bar", "line", "data_table"],
  bar:          ["line", "area", "horizontal_bar", "data_table"],
  line:         ["bar", "area", "data_table"],
  multi_line:   ["bar", "area", "data_table"],
  area:         ["bar", "line", "data_table"],
  mixed:        ["line", "bar", "data_table"],
  donut:        ["bar", "data_table"],
  stacked_bar:  ["bar", "line", "data_table"],
  kpi_card:     [],
  data_table:   [],
  treemap:      [],
  heatmap:      [],
  scatter:      [],
}

export function StepChartType({ form, setForm }: StepProps) {
  const registrations = allChartTypes()
  const selectedStr = chartTypeToString(form.chartType)
  const compatibles = COMPATIBLE_TYPES[selectedStr] ?? []
  const selectedAlts = (form.chartConfig.available_chart_types as string[] | undefined) ?? []

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {registrations.map((reg) => {
          const selected = reg.type === selectedStr
          return (
            <button
              key={reg.type}
              type="button"
              onClick={() => {
                // Only reset chartConfig when switching to a DIFFERENT chart type.
                // If the user clicks the already-selected tile (e.g. to confirm selection),
                // preserve the existing config — otherwise required fields like x_axis_field
                // and series_defs would be wiped, causing backend validation errors on save.
                if (reg.type === selectedStr) return
                setForm((p) => ({
                  ...p,
                  chartType: stringToChartTypeEnum(reg.type),
                  chartConfig: { ...reg.defaultConfig, available_chart_types: [] },
                }))
              }}
              className={cn(
                "rounded-lg border p-3 text-left text-sm transition-colors hover:border-primary",
                selected && "border-primary bg-primary/5 ring-1 ring-primary"
              )}
            >
              <div className="font-semibold">{reg.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">{reg.lib === "echarts" ? "Advanced" : "Standard"}</div>
            </button>
          )
        })}
      </div>

      {/* Compatible viewer chart types */}
      {compatibles.length > 0 && (
        <div className="mt-4 space-y-2 border-t pt-4">
          <p className="text-sm font-medium text-foreground">Viewer can also display as:</p>
          <div className="flex flex-wrap gap-3">
            {compatibles.map((alt) => {
              const checked = selectedAlts.includes(alt)
              const reg = allChartTypes().find((r) => r.type === alt)
              return (
                <label key={alt} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border"
                    checked={checked}
                    onChange={() => {
                      const next = checked
                        ? selectedAlts.filter((t) => t !== alt)
                        : [...selectedAlts, alt]
                      setForm((p) => ({
                        ...p,
                        chartConfig: { ...p.chartConfig, available_chart_types: next },
                      }))
                    }}
                  />
                  {reg?.label ?? humanize(alt)}
                </label>
              )
            })}
          </div>
        </div>
      )}

      {/* Per-view-type configuration */}
      {(() => {
        const primaryStr = chartTypeToString(form.chartType as ChartType) || ""
        const alts = (form.chartConfig.available_chart_types as string[] | undefined) ?? []
        const allTypes = primaryStr ? [primaryStr, ...alts.filter((t) => t !== primaryStr)] : alts
        if (allTypes.length === 0) return null

        const currentViewConfigs = (form.chartConfig.view_configs as Record<string, ViewModeConfig> | undefined) ?? {}

        return (
          <div className="mt-4 space-y-2 border-t pt-4">
            <p className="text-sm font-medium">Configure per-view display</p>
            <p className="text-xs text-muted-foreground">Set the title and behavior for each chart type in the viewer.</p>
            <div className="space-y-2">
              {allTypes.map((ct) => {
                const existing = currentViewConfigs[ct]
                const defaultConfig: ViewModeConfig = {
                  titleTemplate: ct.replace(/_/g, " "),
                  drillEnabled: !["line", "area", "multi_line", "scatter", "heatmap", "kpi_card", "data_table"].includes(ct),
                  hint: "",
                }
                const cfg: ViewModeConfig = existing ?? defaultConfig
                return (
                  <ViewConfigEditor
                    key={ct}
                    chartType={ct}
                    config={cfg}
                    onChange={(updated) => {
                      setForm((p) => ({
                        ...p,
                        chartConfig: {
                          ...p.chartConfig,
                          view_configs: { ...currentViewConfigs, [ct]: updated },
                        },
                      }))
                    }}
                  />
                )
              })}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// =========================================================================
// ViewConfigEditor — per-chart-type viewer configuration panel
// =========================================================================

interface ViewConfigEditorProps {
  chartType: string
  config: ViewModeConfig
  onChange: (updated: ViewModeConfig) => void
}

function ViewConfigEditor({ chartType, config, onChange }: ViewConfigEditorProps) {
  return (
    <div className="rounded border border-border/60 bg-muted/20 p-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {chartType.replace(/_/g, " ")}
      </p>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">
          Title template <span className="font-mono">{"{period}"}</span> = formatted month
        </label>
        <Input
          value={config.titleTemplate}
          onChange={(e) => onChange({ ...config, titleTemplate: e.target.value })}
          placeholder={`${chartType.replace(/_/g, " ")} — {period}`}
          className="h-7 text-xs"
        />
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
        <Checkbox
          checked={config.drillEnabled}
          onCheckedChange={(v) => onChange({ ...config, drillEnabled: Boolean(v) })}
        />
        Enable drill-down on click
      </label>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Hint text (shown below chart title)</label>
        <Input
          value={config.hint ?? ""}
          onChange={(e) => onChange({ ...config, hint: e.target.value })}
          placeholder="Click any bar to drill down…"
          className="h-7 text-xs"
        />
      </div>
    </div>
  )
}

// =========================================================================
// Step 4 — Field mapping (registry-driven)
// =========================================================================

const AXIS_FIELDS = ["group_1", "group_2", "group_3", "period", "dimension_key"]
const VALUE_FIELDS = ["value", "display_value"]

// isMeasureField decides whether a chart's required field is a numeric measure (→ VALUE_FIELDS)
// or a dimension (→ AXIS_FIELDS). The mapping is chart-type-aware because the y-axis is a measure
// for cartesian charts (bar/line/area/waterfall/mixed/stacked) but a dimension for a heatmap, and
// the x-axis is a measure only for a scatter plot.
function isMeasureField(field: string, chartType: string): boolean {
  if (field.includes("value")) return true // value_field
  if (field === "y_axis_field") return chartType !== "heatmap"
  if (field === "x_axis_field") return chartType === "scatter"
  return false
}

export function StepFieldMapping({ form, setForm }: StepProps) {
  const typeStr = chartTypeToString(form.chartType)
  const reg = allChartTypes().find((r) => r.type === typeStr)
  if (!reg) return <p className="text-sm text-muted-foreground">Select a chart type first.</p>

  const setConfig = (key: string, value: unknown) =>
    setForm((p) => ({ ...p, chartConfig: { ...p.chartConfig, [key]: value } }))

  return (
    <div className="space-y-4">
      {reg.requiredFields.map((f) => {
        // series_defs is handled by the mixed chart and edited as KPI-like rows; skip here.
        if (f === "series_defs" || f === "stack_by_field" || f === "parent_field") {
          return (
            <Field key={f} label={humanize(f)}>
              <Select value={(form.chartConfig[f] as string) ?? ""} onValueChange={(v) => setConfig(f, v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  {AXIS_FIELDS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {humanize(opt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )
        }
        const opts = isMeasureField(f, typeStr) ? VALUE_FIELDS : AXIS_FIELDS
        return (
          <Field key={f} label={humanize(f)}>
            <Select value={(form.chartConfig[f] as string) ?? ""} onValueChange={(v) => setConfig(f, v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {opts.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {humanize(opt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )
      })}
      {reg.supportsDrill && (
        <Field label="Drill Into (optional)">
          <Select value={(form.chartConfig.drill_to as string) ?? "__none__"} onValueChange={(v) => setConfig("drill_to", v === "__none__" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              <SelectItem value="group_2">Group 2</SelectItem>
              <SelectItem value="group_3">Group 3</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      )}
    </div>
  )
}

// =========================================================================
// Step 5 — Style
// =========================================================================

const NUMBER_FORMATS = ["raw", "thousands", "millions", "percent", "currency_thousands", "currency_millions"]

export function StepStyle({ form, setForm }: StepProps) {
  const setConfig = (key: string, value: unknown) =>
    setForm((p) => ({ ...p, chartConfig: { ...p.chartConfig, [key]: value } }))
  const cfg = form.chartConfig

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <ColorField label="Primary" value={(cfg.primary_color as string) ?? "#1F4E79"} onChange={(c) => setConfig("primary_color", c)} />
        <ColorField label="Positive" value={(cfg.positive_color as string) ?? "#1d9e75"} onChange={(c) => setConfig("positive_color", c)} />
        <ColorField label="Negative" value={(cfg.negative_color as string) ?? "#a32d2d"} onChange={(c) => setConfig("negative_color", c)} />
        <ColorField label="Total" value={(cfg.total_color as string) ?? "#534AB7"} onChange={(c) => setConfig("total_color", c)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Number Format">
          <Select value={(cfg.number_format as string) ?? "thousands"} onValueChange={(v) => setConfig("number_format", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NUMBER_FORMATS.map((nf) => (
                <SelectItem key={nf} value={nf}>
                  {humanize(nf)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Decimals">
          <Input
            type="number"
            min={0}
            max={6}
            value={(cfg.decimals as number) ?? 1}
            onChange={(e) => setConfig("decimals", Number(e.target.value))}
          />
        </Field>
      </div>
      <ToggleRow label="Show Data Labels" checked={Boolean(cfg.show_data_labels)} onChange={(v) => setConfig("show_data_labels", v)} />
      <ToggleRow label="Show Total Bar (waterfall)" checked={Boolean(cfg.show_total_bar)} onChange={(v) => setConfig("show_total_bar", v)} />
    </div>
  )
}

// =========================================================================
// Step 6 — Compare modes + KPIs
// =========================================================================

const COMPARE_OPTIONS: { key: CompareMode; label: string }[] = [
  { key: CompareMode.COMPARE_MODE_MOM, label: "MoM" },
  { key: CompareMode.COMPARE_MODE_QOQ, label: "QoQ" },
  { key: CompareMode.COMPARE_MODE_YOY, label: "YoY" },
  { key: CompareMode.COMPARE_MODE_YTD, label: "YTD" },
  { key: CompareMode.COMPARE_MODE_R12, label: "R12" },
]

export function StepCompareAndKpi({ form, setForm }: StepProps) {
  const toggleCompare = (mode: CompareMode) =>
    setForm((p) => ({
      ...p,
      compareModes: p.compareModes.includes(mode)
        ? p.compareModes.filter((m) => m !== mode)
        : [...p.compareModes, mode],
    }))

  const addKpi = () =>
    setForm((p) => ({
      ...p,
      kpiConfig: [
        ...p.kpiConfig,
        { label: "", valueField: "display_value", agg: "sum", compare: "none", format: "currency_thousands" },
      ],
    }))
  const updateKpi = (idx: number, patch: Partial<KpiEntry>) =>
    setForm((p) => ({ ...p, kpiConfig: p.kpiConfig.map((k, i) => (i === idx ? { ...k, ...patch } : k)) }))
  const removeKpi = (idx: number) =>
    setForm((p) => ({ ...p, kpiConfig: p.kpiConfig.filter((_, i) => i !== idx) }))

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-xs font-semibold uppercase text-muted-foreground">Compare Modes</Label>
        <div className="mt-2 flex flex-wrap gap-3">
          {COMPARE_OPTIONS.map((c) => (
            <label key={c.key} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
              <Checkbox checked={form.compareModes.includes(c.key)} onCheckedChange={() => toggleCompare(c.key)} />
              {c.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">KPI Cards (max 6)</Label>
          <Button type="button" size="sm" variant="outline" onClick={addKpi} disabled={form.kpiConfig.length >= 6}>
            + Add KPI
          </Button>
        </div>
        <div className="mt-2 space-y-3">
          {form.kpiConfig.map((k, i) => (
            <Card key={i}>
              <CardContent className="grid grid-cols-2 gap-3 p-3">
                <Field label="Label">
                  <Input value={k.label} onChange={(e) => updateKpi(i, { label: e.target.value })} />
                </Field>
                <Field label="Value Field">
                  <Select value={k.valueField} onValueChange={(v) => updateKpi(i, { valueField: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VALUE_FIELDS.map((vf) => <SelectItem key={vf} value={vf}>{humanize(vf)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Aggregation">
                  <Select value={k.agg} onValueChange={(v) => updateKpi(i, { agg: v as KpiEntry["agg"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["sum", "avg", "min", "max", "last"].map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Compare">
                  <Select value={k.compare} onValueChange={(v) => updateKpi(i, { compare: v as KpiEntry["compare"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["none", "MoM", "QoQ", "YoY", "YTD_vs_LY"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Period Scope" hint="Dynamic = widget updates with month/period selection">
                  <Select
                    value={k.kpiPeriod || "__dynamic__"}
                    onValueChange={(v) => updateKpi(i, { kpiPeriod: v === "__dynamic__" ? "" : v as KpiEntry["kpiPeriod"] })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__dynamic__">Dynamic (follows viewer)</SelectItem>
                      <SelectItem value="selected_ytd">YTD — Jan to selected month</SelectItem>
                      <SelectItem value="current_month">Current Month (fixed)</SelectItem>
                      <SelectItem value="ytd">Full YTD (fixed to today)</SelectItem>
                      <SelectItem value="l12m">Last 12 Months (fixed)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <div className="col-span-2 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={Boolean(k.showSparkline)} onCheckedChange={(v) => updateKpi(i, { showSparkline: Boolean(v) })} />
                    Sparkline
                  </label>
                  <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => removeKpi(i)}>
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

// =========================================================================
// Step 7 — Access
// =========================================================================

const TTL_PRESETS = [0, 300, 900, 1800, 3600]
const REFRESH_PRESETS = [0, 15, 30, 60, 120, 300]

export function StepAccess({ form, setForm }: StepProps) {
  const { data: rolesResult } = useRoles({ page: 1, pageSize: 100 })
  const roles = rolesResult?.data ?? []

  const toggleRole = (code: string) =>
    setForm((p) => ({
      ...p,
      allowedRoleCodes: p.allowedRoleCodes.includes(code)
        ? p.allowedRoleCodes.filter((c) => c !== code)
        : [...p.allowedRoleCodes, code],
    }))

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs font-semibold uppercase text-muted-foreground">
          Allowed Roles <span className="font-normal normal-case">(empty = visible to all view-permitted users)</span>
        </Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {roles.map((r) => (
            <label key={r.roleId} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
              <Checkbox checked={form.allowedRoleCodes.includes(r.roleCode)} onCheckedChange={() => toggleRole(r.roleCode)} />
              {r.roleName}
            </label>
          ))}
        </div>
      </div>

      <ToggleRow label="Drill Enabled" checked={form.drillEnabled} onChange={(v) => setForm((p) => ({ ...p, drillEnabled: v }))} />

      <Field label="Max Drill Level">
        <Select value={String(form.maxDrillLevel)} onValueChange={(v) => setForm((p) => ({ ...p, maxDrillLevel: Number(v) }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {[1, 2, 3].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Cache TTL (seconds)">
        <ChipRow values={TTL_PRESETS} current={form.cacheTtlSec} onPick={(v) => setForm((p) => ({ ...p, cacheTtlSec: v }))} />
      </Field>

      <Field label="Auto-refresh Interval (seconds)">
        <ChipRow values={REFRESH_PRESETS} current={form.refreshIntervalSec} onPick={(v) => setForm((p) => ({ ...p, refreshIntervalSec: v }))} />
      </Field>
    </div>
  )
}

// =========================================================================
// Step 8 — Sidebar (create mode only)
// =========================================================================

export function StepSidebar({ form, setForm }: StepProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Optionally add this dashboard to the sidebar navigation under &quot;Executive Dashboard&quot;.
        This creates an IAM menu entry visible to all users with access to the BI module.
      </p>
      <ToggleRow
        label="Add to Sidebar"
        checked={form.addToSidebar ?? false}
        onChange={(v) => setForm((p) => ({ ...p, addToSidebar: v }))}
      />
      {(form.addToSidebar) && (
        <>
          <Field label="Menu Title">
            <Input
              value={form.sidebarTitle ?? form.dashboardTitle}
              onChange={(e) => setForm((p) => ({ ...p, sidebarTitle: e.target.value }))}
              placeholder="Dashboard Title"
            />
          </Field>
          <Field label="Icon (lucide-react name)">
            <Input
              value={form.sidebarIcon ?? "BarChart2"}
              onChange={(e) => setForm((p) => ({ ...p, sidebarIcon: e.target.value }))}
              placeholder="BarChart2"
            />
          </Field>
        </>
      )}
    </div>
  )
}

// =========================================================================
// Shared small UI helpers
// =========================================================================

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <Label className="text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function ChipRow({ values, current, onPick }: { values: number[]; current: number; onPick: (v: number) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((v) => (
        <Button
          key={v}
          type="button"
          size="sm"
          variant={current === v ? "default" : "outline"}
          onClick={() => onPick(v)}
        >
          {v === 0 ? "Off" : `${v}s`}
        </Button>
      ))}
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative space-y-1.5">
      <Label className="text-xs font-semibold uppercase text-muted-foreground">{label}</Label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center gap-2 rounded-md border px-2 text-sm"
      >
        <span className="h-5 w-5 rounded border" style={{ backgroundColor: value }} />
        {value}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 rounded-md border bg-popover p-3 shadow-md">
          <HexColorPicker color={value} onChange={onChange} />
          <Input value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 h-8" />
          <Button type="button" size="sm" variant="outline" className="mt-2 w-full" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      )}
    </div>
  )
}

function humanize(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function stringToChartTypeEnum(s: string): ChartType {
  const map: Record<string, ChartType> = {
    bar: ChartType.CHART_TYPE_BAR,
    horizontal_bar: ChartType.CHART_TYPE_HORIZONTAL_BAR,
    stacked_bar: ChartType.CHART_TYPE_STACKED_BAR,
    line: ChartType.CHART_TYPE_LINE,
    area: ChartType.CHART_TYPE_AREA,
    waterfall: ChartType.CHART_TYPE_WATERFALL,
    donut: ChartType.CHART_TYPE_DONUT,
    kpi_card: ChartType.CHART_TYPE_KPI_CARD,
    treemap: ChartType.CHART_TYPE_TREEMAP,
    heatmap: ChartType.CHART_TYPE_HEATMAP,
    scatter: ChartType.CHART_TYPE_SCATTER,
    mixed: ChartType.CHART_TYPE_MIXED,
    data_table: ChartType.CHART_TYPE_DATA_TABLE,
  }
  return map[s] ?? ChartType.CHART_TYPE_UNSPECIFIED
}
