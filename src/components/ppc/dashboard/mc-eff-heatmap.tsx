"use client"

// Machine-efficiency heatmap for the daily-performance dashboard. Bespoke
// ECharts heatmap (echarts already bundled) — X = shift, Y = machine, color = eff%.

import ReactECharts from "echarts-for-react"

import type { McEffCell } from "@/types/ppc/dashboard"

interface McEffHeatmapProps {
  cells: McEffCell[]
  height?: number
}

export function McEffHeatmap({ cells, height = 420 }: McEffHeatmapProps) {
  // Y axis = machines (unique, stable order); X axis = shift labels.
  const machines = Array.from(new Map(cells.map((c) => [c.machineNo, c.machineNo])).keys())
  const shifts = ["1", "2", "3"]
  const xLabels = shifts.map((s) => `Shift ${s}`)

  const data: [number, number, number][] = []
  cells.forEach((c) => {
    const yi = machines.indexOf(c.machineNo)
    const xi = shifts.indexOf(c.shift)
    if (yi < 0 || xi < 0) return
    data.push([xi, yi, Number(c.effPct) || 0])
  })

  const option = {
    tooltip: {
      position: "top" as const,
      formatter: (p: { data: [number, number, number] }) =>
        `${machines[p.data[1]]} · ${xLabels[p.data[0]]}<br/><b>${p.data[2].toFixed(1)}%</b>`,
    },
    grid: { left: 90, right: 24, top: 24, bottom: 40, containLabel: true },
    xAxis: { type: "category" as const, data: xLabels, splitArea: { show: true } },
    yAxis: { type: "category" as const, data: machines, splitArea: { show: true } },
    visualMap: {
      min: 0,
      max: 100,
      calculable: true,
      orient: "horizontal" as const,
      left: "center",
      bottom: 0,
      inRange: { color: ["#a32d2d", "#e0b400", "#1d9e75"] },
    },
    series: [
      {
        name: "Efficiency",
        type: "heatmap" as const,
        data,
        label: { show: true, formatter: (p: { data: [number, number, number] }) => `${p.data[2].toFixed(0)}` },
        emphasis: { itemStyle: { shadowBlur: 8, shadowColor: "rgba(0,0,0,0.3)" } },
      },
    ],
  }

  return <ReactECharts option={option} style={{ height, width: "100%" }} notMerge lazyUpdate />
}
