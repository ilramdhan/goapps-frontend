"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/common/page-header"
import { DashboardWizard } from "@/components/bi/admin/wizard/dashboard-wizard"
import { ViewerErrorState } from "@/components/bi/viewer/states"
import { useDashboardById } from "@/hooks/bi/use-dashboard"
import type { Dashboard, DashboardFormData, KpiEntry } from "@/types/bi"

/** Convert a loaded proto Dashboard into the wizard's DashboardFormData. */
function dashboardToForm(d: Dashboard): DashboardFormData {
  // kpi_config arrives as a Struct {items:[...]}; extract the array.
  const kpiItems = ((d.kpiConfig as Record<string, unknown> | undefined)?.items as Record<string, unknown>[] | undefined) ?? []
  const kpiConfig: KpiEntry[] = kpiItems.map((k) => ({
    label: String(k.label ?? ""),
    valueField: String(k.value_field ?? "display_value"),
    agg: (String(k.agg ?? "sum")) as KpiEntry["agg"],
    compare: (String(k.compare ?? "none")) as KpiEntry["compare"],
    format: String(k.format ?? "currency_thousands"),
    kpiPeriod: (String(k.period ?? "")) as KpiEntry["kpiPeriod"],
    decimals: typeof k.decimals === "number" ? k.decimals : undefined,
    showSparkline: Boolean(k.show_sparkline),
    sparklinePeriods: typeof k.sparkline_periods === "number" ? k.sparkline_periods : undefined,
  }))

  return {
    dashboardCode: d.dashboardCode,
    dashboardTitle: d.dashboardTitle,
    description: d.description,
    filterType: d.filterType,
    filterGroup1: d.filterGroup1,
    periodeGrain: d.periodeGrain,
    periodCalendar: (d.periodCalendar || "CALENDAR") as DashboardFormData["periodCalendar"],
    defaultPeriod: (d.defaultPeriod || "L12M") as DashboardFormData["defaultPeriod"],
    chartType: d.chartType,
    chartConfig: (d.chartConfig as Record<string, unknown>) ?? {},
    layoutConfig: (d.layoutConfig as Record<string, unknown> | undefined) ?? null,
    kpiConfig,
    compareModes: d.compareModes ?? [],
    drillEnabled: d.drillEnabled,
    maxDrillLevel: d.maxDrillLevel,
    cacheTtlSec: d.cacheTtlSec,
    refreshIntervalSec: d.refreshIntervalSec,
    displayOrder: d.displayOrder,
    groupId: d.groupId,
    isActive: d.isActive,
    allowedRoleCodes: d.allowedRoleCodes ?? [],
  }
}

export default function EditDashboardClient({ id }: { id: string }) {
  const { data: result, isLoading, isError } = useDashboardById(id)
  const dashboard = result?.data ?? null

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    )
  }
  if (isError || !dashboard) return <ViewerErrorState message="Dashboard not found" />

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit: ${dashboard.dashboardTitle}`} subtitle={dashboard.dashboardCode} />
      <DashboardWizard mode="edit" dashboardId={id} initial={dashboardToForm(dashboard)} />
    </div>
  )
}
