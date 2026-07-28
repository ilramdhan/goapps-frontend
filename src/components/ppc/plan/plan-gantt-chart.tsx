"use client"

import { useMemo } from "react"
import * as echarts from "echarts"
import ReactECharts from "echarts-for-react"

import type { GanttBar } from "@/types/ppc/plan-item"
import { PlanItemType, AREA_LABELS, PLAN_ITEM_TYPE_LABELS } from "@/types/ppc/common"

// Color palette per PlanItemType (changeover overrides to red-dashed).
const TYPE_COLORS: Record<number, string> = {
  [PlanItemType.PLAN_ITEM_TYPE_FG_DELIVERY]: "#2E75B6",
  [PlanItemType.PLAN_ITEM_TYPE_INTERMEDIATE]: "#59A14F",
  [PlanItemType.PLAN_ITEM_TYPE_MTS]: "#B07AA1",
  [PlanItemType.PLAN_ITEM_TYPE_UNSPECIFIED]: "#8C8C8C",
}
const CHANGEOVER_COLOR = "#a32d2d"
const UNASSIGNED = "unassigned"

/** Row meta for the Y-axis category list (one machine, or one unassigned machine group, per row). */
interface MachineRow {
  label: string
  machineNo: string
  machineGroupId: number
  area: number
}

/** Encoded data tuple index positions: [rowIndex, startMs, endMs]. */
interface GanttDatum {
  value: [number, number, number]
  bar: GanttBar
  itemStyle: { color: string; borderColor?: string; borderType?: "dashed"; borderWidth?: number }
}

interface PlanGanttChartProps {
  bars: GanttBar[]
  month: string
  onBarClick: (bar: GanttBar) => void
  /** groupId -> group name, so unassigned rows are labeled by name, never by id. */
  machineGroupNames?: Record<number, string>
}

function monthBounds(month: string): { min: number; max: number } {
  // month is "YYYY-MM"; fall back to current month if malformed.
  const match = /^(\d{4})-(\d{2})$/.exec(month)
  const now = new Date()
  const year = match ? Number(match[1]) : now.getFullYear()
  const mon = match ? Number(match[2]) - 1 : now.getMonth()
  const min = new Date(year, mon, 1).getTime()
  const max = new Date(year, mon + 1, 1).getTime()
  return { min, max }
}

export default function PlanGanttChart({
  bars,
  month,
  onBarClick,
  machineGroupNames,
}: PlanGanttChartProps) {
  const { rows, data } = useMemo(() => {
    // Row identity keeps the machine group in the key: plan items exist before
    // work orders, so most bars have no machine yet and would otherwise all
    // collapse into a single "— · -" row.
    const rowKey = (b: GanttBar) =>
      `${b.area}::${b.machineGroupId}::${b.machineNo || UNASSIGNED}`
    const rowMap = new Map<string, MachineRow>()
    for (const b of bars) {
      const key = rowKey(b)
      if (!rowMap.has(key)) {
        // Unassigned bars are labeled by machine-group name — never by group id.
        const groupName = machineGroupNames?.[b.machineGroupId]
        const suffix = b.machineNo || `${groupName ?? "Unassigned machine"} (unassigned)`
        rowMap.set(key, {
          label: `${AREA_LABELS[b.area] ?? "—"} · ${suffix}`,
          machineNo: b.machineNo,
          machineGroupId: b.machineGroupId,
          area: b.area,
        })
      }
    }
    const rowList = Array.from(rowMap.entries()).sort((a, z) => {
      if (a[1].area !== z[1].area) return a[1].area - z[1].area
      if (a[1].machineNo !== z[1].machineNo) return a[1].machineNo.localeCompare(z[1].machineNo)
      return a[1].label.localeCompare(z[1].label)
    })
    const rowIndex = new Map<string, number>()
    rowList.forEach(([key], i) => rowIndex.set(key, i))

    const datums: GanttDatum[] = bars.map((b) => {
      const start = new Date(b.startDate).getTime()
      const end = new Date(b.endDate).getTime()
      const idx = rowIndex.get(rowKey(b)) ?? 0
      const style = b.isChangeover
        ? {
            color: "rgba(163,45,45,0.15)",
            borderColor: CHANGEOVER_COLOR,
            borderType: "dashed" as const,
            borderWidth: 1.5,
          }
        : { color: TYPE_COLORS[b.type] ?? TYPE_COLORS[PlanItemType.PLAN_ITEM_TYPE_UNSPECIFIED] }
      return {
        value: [idx, start, end],
        bar: b,
        itemStyle: style,
      }
    })

    return { rows: rowList.map(([, r]) => r.label), data: datums }
  }, [bars, machineGroupNames])

  const { min, max } = useMemo(() => monthBounds(month), [month])

  const option = useMemo(() => {
    // renderItem draws one rounded rect per bar, clipped to the grid.
    const renderItem = (
      params: { coordSys: { x: number; y: number; width: number; height: number } },
      api: { value: (i: number) => number; coord: (v: [number, number]) => number[]; size: (v: [number, number]) => number[]; style: () => object }
    ) => {
      const rowIdx = api.value(0)
      const start = api.coord([api.value(1), rowIdx])
      const end = api.coord([api.value(2), rowIdx])
      const heightPx = api.size([0, 1])[1] * 0.6
      const rectShape = echarts.graphic.clipRectByRect(
        {
          x: start[0],
          y: start[1] - heightPx / 2,
          width: Math.max(end[0] - start[0], 2),
          height: heightPx,
        },
        {
          x: params.coordSys.x,
          y: params.coordSys.y,
          width: params.coordSys.width,
          height: params.coordSys.height,
        }
      )
      return (
        rectShape && {
          type: "rect",
          transition: ["shape"],
          shape: { ...rectShape, r: 3 },
          style: api.style(),
        }
      )
    }

    return {
      grid: { left: 8, right: 24, top: 16, bottom: 48, containLabel: true },
      tooltip: {
        formatter: (p: { data?: GanttDatum }) => {
          const b = p.data?.bar
          if (!b) return ""
          const typeLabel = PLAN_ITEM_TYPE_LABELS[b.type] ?? "-"
          const co = b.isChangeover ? " (Changeover)" : ""
          return [
            `<strong>${b.productCode || "-"}</strong>${co}`,
            b.productName || "",
            `Type: ${typeLabel}`,
            `Qty: ${b.qtyTarget || "-"}`,
            b.lotNo ? `Lot: ${b.lotNo}` : "",
            `${b.startDate} → ${b.endDate}`,
          ]
            .filter(Boolean)
            .join("<br/>")
        },
      },
      xAxis: {
        type: "time",
        min,
        max,
        axisLabel: { formatter: "{d}", hideOverlap: true },
        splitLine: { show: true, lineStyle: { color: "rgba(128,128,128,0.15)" } },
      },
      yAxis: {
        type: "category",
        data: rows,
        axisLabel: { fontSize: 11 },
        axisTick: { show: false },
      },
      series: [
        {
          type: "custom",
          renderItem,
          encode: { x: [1, 2], y: 0 },
          data,
        },
      ],
    }
  }, [rows, data, min, max])

  const height = Math.max(400, rows.length * 34 + 80)

  return (
    <ReactECharts
      option={option}
      style={{ height }}
      notMerge
      lazyUpdate
      onEvents={{
        click: (p: { data?: GanttDatum }) => {
          if (p?.data?.bar) onBarClick(p.data.bar)
        },
      }}
    />
  )
}
