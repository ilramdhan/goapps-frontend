"use client"

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { Loader2, X } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { EmptyState, StatusBadge } from "@/components/common"
import { MachineGroupCombobox } from "@/components/ppc/comboboxes"

import { useGanttView, useUpdatePlanItem } from "@/hooks/ppc/use-plan-item"
import { useMachineGroups } from "@/hooks/ppc/use-masters"
import type { GanttBar, GanttViewParams } from "@/types/ppc/plan-item"
import {
  AREA_OPTIONS,
  AREA_LABELS,
  AreaCode,
  PLAN_ITEM_TYPE_LABELS,
  planItemStatusToken,
  currentMonth,
} from "@/types/ppc/common"

// ECharts custom-series chart uses echarts.graphic + a DOM-sized canvas, so it
// must render client-only. Dynamic import with ssr:false avoids hydration cost.
const PlanGanttChart = dynamic(() => import("./plan-gantt-chart"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
})

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

export function PlanGantt() {
  const [params, setParams] = useState<GanttViewParams>({
    month: currentMonth(),
    area: AreaCode.AREA_CODE_UNSPECIFIED,
  })
  const [selected, setSelected] = useState<GanttBar | null>(null)
  const [deadlineDraft, setDeadlineDraft] = useState("")
  // Seed the deadline draft from the selected bar during render (keyed by
  // planItemId) instead of in an effect.
  const [seededId, setSeededId] = useState<number | null>(null)

  const { data: bars, isLoading, isError } = useGanttView(params)
  const updateMutation = useUpdatePlanItem()

  if (selected && selected.planItemId !== seededId) {
    setSeededId(selected.planItemId)
    setDeadlineDraft(selected.startDate ? selected.startDate.slice(0, 10) : "")
  } else if (!selected && seededId !== null) {
    setSeededId(null)
  }

  // Machine-group names for the chart's unassigned-row labels (no raw ids in UI).
  const { data: machineGroupPage } = useMachineGroups({ pageSize: 200 })
  const machineGroupNames = useMemo(() => {
    const map: Record<number, string> = {}
    for (const g of machineGroupPage?.data ?? []) map[g.groupId] = g.groupName
    return map
  }, [machineGroupPage])

  const handleMachineGroupChange = (groupId: number | undefined) => {
    setParams((p) => ({ ...p, machineGroupId: groupId }))
  }

  // Phase-1: drag rescheduling deferred. The panel offers a best-effort deadline
  // edit that calls useUpdatePlanItem directly.
  const handleSaveDeadline = async () => {
    if (!selected || !deadlineDraft) return
    try {
      await updateMutation.mutateAsync({
        id: String(selected.planItemId),
        data: { planItemId: selected.planItemId, deadline: deadlineDraft },
      })
      setSelected(null)
    } catch (error) {
      console.error("Failed to update deadline:", error)
    }
  }

  const hasBars = !!bars && bars.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Plan Timeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Month</Label>
            <Input
              type="month"
              value={params.month}
              onChange={(e) => setParams((p) => ({ ...p, month: e.target.value }))}
              className="w-[150px]"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Area</Label>
            <Select
              value={String(params.area ?? AreaCode.AREA_CODE_UNSPECIFIED)}
              onValueChange={(v) =>
                // Changing area invalidates a group picked from the previous area.
                setParams((p) => ({ ...p, area: Number(v) as AreaCode, machineGroupId: undefined }))
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Area" />
              </SelectTrigger>
              <SelectContent>
                {AREA_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Machine Group</Label>
            <div className="flex items-center gap-1">
              <MachineGroupCombobox
                value={params.machineGroupId}
                onChange={(id) => handleMachineGroupChange(id)}
                area={params.area === AreaCode.AREA_CODE_UNSPECIFIED ? undefined : params.area}
                placeholder="All machine groups"
                className="w-[220px]"
              />
              {params.machineGroupId !== undefined && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Clear machine group filter"
                  onClick={() => handleMachineGroupChange(undefined)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Chart / states */}
        {isLoading && (
          <div className="flex h-[400px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {isError && !isLoading && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
            Failed to load the Gantt view.
          </div>
        )}
        {!isLoading && !isError && !hasBars && (
          <EmptyState
            title="No scheduled bars"
            description="No plan bars for this month, area, or machine group. Adjust the filters above."
          />
        )}
        {!isLoading && !isError && hasBars && (
          <PlanGanttChart
            bars={bars}
            month={params.month}
            onBarClick={setSelected}
            machineGroupNames={machineGroupNames}
          />
        )}
      </CardContent>

      {/* Detail side panel */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{selected?.productCode || "Plan Bar"}</SheetTitle>
            <SheetDescription>{selected?.productName || ""}</SheetDescription>
          </SheetHeader>

          {selected && (
            <div className="space-y-5 px-4 pb-4">
              <div className="grid grid-cols-2 gap-4">
                <Detail label="Machine">
                  {AREA_LABELS[selected.area] ?? "—"} ·{" "}
                  {selected.machineNo ||
                    `${machineGroupNames[selected.machineGroupId] ?? "Unassigned machine"} (unassigned)`}
                </Detail>
                <Detail label="Type">{PLAN_ITEM_TYPE_LABELS[selected.type] ?? "-"}</Detail>
                <Detail label="Qty Target">{selected.qtyTarget || "-"}</Detail>
                <Detail label="Lot No">{selected.lotNo || "-"}</Detail>
                <Detail label="Start">{selected.startDate || "-"}</Detail>
                <Detail label="End">{selected.endDate || "-"}</Detail>
                <Detail label="Status">
                  <StatusBadge status={planItemStatusToken(selected.status)} type="ppcPlan" size="sm" />
                </Detail>
                <Detail label="Changeover">{selected.isChangeover ? "Yes" : "No"}</Detail>
              </div>

              {/* Phase-1: drag rescheduling deferred — best-effort deadline edit. */}
              <div className="space-y-2 border-t pt-4">
                <Label className="text-xs text-muted-foreground">Reschedule deadline</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={deadlineDraft}
                    onChange={(e) => setDeadlineDraft(e.target.value)}
                    className="w-[180px]"
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveDeadline}
                    disabled={updateMutation.isPending || !deadlineDraft}
                  >
                    {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Drag-to-reschedule is deferred to a later phase.
                </p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </Card>
  )
}
