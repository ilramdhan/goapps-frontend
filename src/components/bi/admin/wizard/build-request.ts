// Converts the wizard's DashboardFormData into the proto request shapes expected by
// the BFF/gRPC layer. Centralised so create + update + preview stay consistent.

import {
  ChartType,
  PeriodeGrain,
  CompareMode,
  type CreateDashboardRequest,
  type UpdateDashboardRequest,
  type PreviewDashboardRequest,
  type DashboardFormData,
  type KpiEntry,
  type ViewModeConfig,
} from "@/types/bi"

/** kpi_config travels as a Struct wrapping an "items" array (matches backend structListToMaps). */
function kpiConfigStruct(kpis: KpiEntry[]): Record<string, unknown> {
  return {
    items: kpis.map((k) => ({
      label: k.label,
      value_field: k.valueField,
      agg: k.agg,
      compare: k.compare,
      format: k.format,
      ...(k.kpiPeriod ? { period: k.kpiPeriod } : {}),  // omit period when empty → backend defaults to "selected" (dynamic)
      ...(k.decimals !== undefined ? { decimals: k.decimals } : {}),
      ...(k.showSparkline ? { show_sparkline: true } : {}),
      ...(k.sparklinePeriods ? { sparkline_periods: k.sparklinePeriods } : {}),
    })),
  }
}

/**
 * Normalize chart_config before sending to the backend.
 *
 * Two transforms are applied:
 * 1. view_configs entries are re-keyed from camelCase (TypeScript interface) to snake_case
 *    (what parseViewConfigs on the backend reads: title_template, drill_enabled, hint).
 * 2. available_chart_types is preserved as-is (the backend stores it in chart_config JSONB).
 */
function normalizeChartConfig(raw: Record<string, unknown>): Record<string, unknown> {
  const out = { ...raw }

  const vc = raw.view_configs as Record<string, unknown> | undefined
  if (vc && typeof vc === "object") {
    out.view_configs = Object.fromEntries(
      Object.entries(vc).map(([ct, v]) => {
        // v may be a camelCase ViewModeConfig (new entry from wizard) OR already
        // a snake_case object (existing entry loaded from DB via Struct.unwrap).
        const cfg = v as Record<string, unknown>
        const titleTemplate =
          (cfg.title_template as string | undefined) ??
          (cfg.titleTemplate as ViewModeConfig["titleTemplate"] | undefined) ??
          ""
        const drillEnabled =
          (cfg.drill_enabled as boolean | undefined) ??
          (cfg.drillEnabled as ViewModeConfig["drillEnabled"] | undefined) ??
          false
        const hint =
          (cfg.hint as string | undefined) ?? ""
        return [ct, { title_template: titleTemplate, drill_enabled: drillEnabled, hint }]
      })
    )
  }

  return out
}

/** Convert the FE period preset string to the default_period field (same string keys). */
function defaultPeriodString(form: DashboardFormData): string {
  return form.defaultPeriod
}

/** Build a CreateDashboardRequest from wizard form data. */
export function buildCreateRequest(form: DashboardFormData): CreateDashboardRequest {
  return {
    dashboardCode: form.dashboardCode,
    dashboardTitle: form.dashboardTitle,
    description: form.description,
    filterType: form.filterType,
    filterGroup1: form.filterGroup1,
    periodeGrain: form.periodeGrain,
    periodCalendar: form.periodCalendar,
    defaultPeriod: defaultPeriodString(form),
    chartType: form.chartType,
    chartConfig: normalizeChartConfig(form.chartConfig),
    layoutConfig: form.layoutConfig ?? undefined,
    compareModes: form.compareModes,
    kpiConfig: kpiConfigStruct(form.kpiConfig),
    drillEnabled: form.drillEnabled,
    maxDrillLevel: form.maxDrillLevel,
    cacheTtlSec: form.cacheTtlSec,
    refreshIntervalSec: form.refreshIntervalSec,
    displayOrder: form.displayOrder,
    groupId: form.groupId,
    allowedRoleCodes: form.allowedRoleCodes,
    isActive: form.isActive,
  } as CreateDashboardRequest
}

/** Build an UpdateDashboardRequest (full replace; the wizard always sends all fields). */
export function buildUpdateRequest(form: DashboardFormData): Omit<UpdateDashboardRequest, "dashboardId"> {
  return {
    dashboardTitle: form.dashboardTitle,
    description: form.description,
    filterType: form.filterType,
    filterGroup1: form.filterGroup1,
    periodeGrain: form.periodeGrain,
    periodCalendar: form.periodCalendar,
    defaultPeriod: defaultPeriodString(form),
    chartType: form.chartType,
    chartConfig: normalizeChartConfig(form.chartConfig),
    layoutConfig: form.layoutConfig ?? undefined,
    compareModes: form.compareModes,
    kpiConfig: kpiConfigStruct(form.kpiConfig),
    drillEnabled: form.drillEnabled,
    maxDrillLevel: form.maxDrillLevel,
    cacheTtlSec: form.cacheTtlSec,
    refreshIntervalSec: form.refreshIntervalSec,
    displayOrder: form.displayOrder,
    groupId: form.groupId,
    isActive: form.isActive,
    allowedRoleCodes: form.allowedRoleCodes,  // was missing — caused roles to reset on every save
  } as Omit<UpdateDashboardRequest, "dashboardId">
}

/** Build a PreviewDashboardRequest from the in-progress form. */
export function buildPreviewRequest(form: DashboardFormData): PreviewDashboardRequest {
  return {
    filterType: form.filterType,
    filterGroup1: form.filterGroup1,
    periodeGrain: form.periodeGrain,
    chartType: form.chartType,
    chartConfig: normalizeChartConfig(form.chartConfig),
    kpiConfig: kpiConfigStruct(form.kpiConfig),
    compareModes: form.compareModes,
  } as PreviewDashboardRequest
}

/** Empty form defaults for the "create" wizard. */
export function emptyForm(): DashboardFormData {
  return {
    dashboardCode: "",
    dashboardTitle: "",
    description: "",
    filterType: "",
    filterGroup1: "",
    periodeGrain: PeriodeGrain.PERIODE_GRAIN_MONTHLY,
    periodCalendar: "CALENDAR",
    defaultPeriod: "L12M",
    chartType: ChartType.CHART_TYPE_BAR,
    chartConfig: {},
    layoutConfig: null,
    kpiConfig: [],
    compareModes: [],
    drillEnabled: true,
    maxDrillLevel: 3,
    cacheTtlSec: 1800,
    refreshIntervalSec: 0,
    displayOrder: 0,
    groupId: "",
    isActive: true,
    allowedRoleCodes: [],
  }
}

/** Whether the required fields for the current step are satisfied (used to gate "Next"). */
export function isStepValid(step: number, form: DashboardFormData, requiredFields: string[]): boolean {
  switch (step) {
    case 0: // Basic
      return /^[A-Z][A-Z0-9_]*$/.test(form.dashboardCode) && form.dashboardTitle.trim().length > 0 && form.groupId !== ""
    case 1: // Data binding
      return form.filterType !== ""
    case 2: // Chart type
      return form.chartType !== ChartType.CHART_TYPE_UNSPECIFIED
    case 3: // Field mapping — every required field must be set in chart_config
      return requiredFields.every((f) => {
        const v = form.chartConfig[f]
        return typeof v === "string" ? v.length > 0 : v !== undefined && v !== null
      })
    default:
      return true
  }
}

export { CompareMode }
