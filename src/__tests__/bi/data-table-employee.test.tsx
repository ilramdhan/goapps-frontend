import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import BiDataTable from "@/components/bi/chart-engine/data-table"
import type { ChartDataResponse } from "@/types/bi"

const pt = (category: string, value: number) => ({
  category,
  value,
  label: String(value),
  meta: { name: "Ani", dept: "PRODUKSI" },
})

const data = {
  series: [
    { name: "HOURS", points: [pt("N1", 17)] },
    { name: "EXCESS", points: [pt("N1", 3)] },
    { name: "CHRONIC", points: [pt("N1", 2)] },
  ],
  categories: ["N1"],
  kpis: [],
  drillContext: { currentPath: [], canDrill: true, nextField: "", nextValues: [] },
} as unknown as ChartDataResponse

describe("BiDataTable employee_week", () => {
  it("renders NIK, name, dept and the three numeric columns", () => {
    render(<BiDataTable config={{ table_mode: "employee_week", number_format: "raw", decimals: 2 }} data={data} />)
    expect(screen.getByText("N1")).toBeTruthy()
    expect(screen.getByText("Ani")).toBeTruthy()
    expect(screen.getByText("PRODUKSI")).toBeTruthy()
    expect(screen.getByText("Minggu berturut-turut")).toBeTruthy()
  })

  it("keeps the generic table without table_mode", () => {
    render(<BiDataTable config={{}} data={data} />)
    expect(screen.getByText("Category")).toBeTruthy()
  })
})

const otPt = (category: string, value: number, group: string, division: string) => ({
  category,
  value,
  label: String(value),
  meta: { name: `Nama ${category}`, group, division, dept: "DEPT A" },
})

const otData = {
  series: [
    { name: "PERIOD_HOURS", points: [otPt("N1", 40, "DIV A", "DIV A"), otPt("N2", 10, "DIV A", "DIV A"), otPt("N3", 5, "DIV B", "DIV B")] },
    { name: "W:2026-10-19", points: [otPt("N1", 17, "DIV A", "DIV A"), otPt("N2", 0, "DIV A", "DIV A"), otPt("N3", 12, "DIV B", "DIV B")] },
    { name: "EXCESS", points: [otPt("N1", 3, "DIV A", "DIV A"), otPt("N2", 0, "DIV A", "DIV A"), otPt("N3", 0, "DIV B", "DIV B")] },
    { name: "CHRONIC", points: [otPt("N1", 2, "DIV A", "DIV A"), otPt("N2", 0, "DIV A", "DIV A"), otPt("N3", 0, "DIV B", "DIV B")] },
  ],
  categories: ["N1", "N2", "N3"],
  kpis: [],
  drillContext: { currentPath: [], canDrill: true, nextField: "", nextValues: [] },
} as unknown as ChartDataResponse

const otConfig = {
  table_mode: "employee_ot",
  number_format: "raw",
  decimals: 2,
  employee_ot: {
    group_by: "DIVISION",
    group_options: ["DIVISION", "DEPT"],
    truncated: true,
    max_rows: 2000,
    subtotals: [
      { group: "DIV A", employees: 2, PERIOD_HOURS: 50, "W:2026-10-19": 17, EXCESS: 3 },
      { group: "DIV B", employees: 1, PERIOD_HOURS: 5, "W:2026-10-19": 12, EXCESS: 0 },
    ],
    weeks: [
      { key: "W:2026-10-19", label: "W4", period: "202610", from: "2026-10-19", to: "2026-10-25", partial: false },
    ],
    ranges: {
      period_from: "2026-09-26", period_to: "2026-10-25", last_period_from: "2026-09-26", day_from: "2026-09-26",
      week_from: "2026-10-19", week_to: "2026-10-25", week_label: "2026-W43",
    },
  },
}

describe("BiDataTable employee_ot", () => {
  it("renders group subtotal rows, range headers and the truncated notice", () => {
    render(<BiDataTable config={otConfig} data={otData} />)
    expect(screen.getByText("Divisi: DIV A")).toBeTruthy()
    expect(screen.getByText("Divisi: DIV B")).toBeTruthy()
    expect(screen.getByText("50.00")).toBeTruthy() // DIV A period subtotal
    expect(screen.getByText("26 Sep 2026 – 25 Okt 2026")).toBeTruthy()
    expect(screen.getByText("W4")).toBeTruthy()
    expect(screen.getByText("19 Okt 2026 – 25 Okt 2026")).toBeTruthy()
    expect(screen.queryByText("Jam hitung batas")).toBeNull()
    // N1 has 17 h in W4: flagged with sr-only text; N3 (12 h) is not
    expect(screen.getAllByText("Melebihi 14 jam")).toHaveLength(1)
    expect(screen.getByText(/Dibatasi 2000 karyawan/)).toBeTruthy()
  })

  it("keeps over-limit and chronic visible and filters to them", () => {
    render(<BiDataTable config={otConfig} data={otData} />)
    expect(screen.getByText("Total: 3 karyawan")).toBeTruthy()
    fireEvent.click(screen.getByRole("checkbox", { name: "Hanya melebihi 14 jam" }))
    expect(screen.getByText("Total: 1 karyawan")).toBeTruthy()
    expect(screen.getByText("N1")).toBeTruthy()
    expect(screen.queryByText("N2")).toBeNull()
    expect(screen.queryByText("Divisi: DIV B")).toBeNull()
  })

  it("shows the comparison column and KPI deltas, dash when there is no previous period (H046)", () => {
    const withPrev = (pt: { meta?: Record<string, unknown> }, prev: number | null, delta: number | null) => ({
      ...pt,
      meta: { ...pt.meta, prev_hours: prev, delta_pct: delta },
    })
    const d = {
      ...otData,
      series: otData.series.map((s) =>
        s.name !== "PERIOD_HOURS"
          ? s
          : {
              ...s,
              points: [withPrev(s.points[0], 32, 25), withPrev(s.points[1], 20, -50), withPrev(s.points[2], null, null)],
            },
      ),
    } as unknown as ChartDataResponse
    const cfg = {
      ...otConfig,
      employee_ot: {
        ...otConfig.employee_ot,
        summary: {
          employees: 3, total_period_hours: 55, over_limit: 1, chronic: 1,
          prev: { total_period_hours: 52, employees: 2, hours_delta_pct: 5.8, employees_delta_pct: 50 },
        },
        ranges: { ...otConfig.employee_ot.ranges, prev_from: "2026-08-26", prev_to: "2026-09-25" },
      },
    }
    render(<BiDataTable config={cfg} data={d} />)
    expect(screen.getByRole("columnheader", { name: /vs Sep 2026/ })).toBeTruthy()
    expect(screen.getByText("26 Agu 2026 – 25 Sep 2026")).toBeTruthy()
    const rowDeltas = screen.getAllByTestId("employee-ot-row-delta").map((e) => e.textContent)
    expect(rowDeltas).toEqual(["▲ 25,0%", "▼ 50,0%", "–"])
    const kpiDeltas = screen.getAllByTestId("employee-ot-delta").map((e) => e.textContent)
    expect(kpiDeltas[0]).toContain("▲ 50,0%")
    expect(kpiDeltas[1]).toContain("▲ 5,8%")
  })

  it("shows a dash in KPI and rows when the backend sends no comparison", () => {
    render(<BiDataTable config={otConfig} data={otData} />)
    expect(screen.getAllByTestId("employee-ot-row-delta").every((e) => e.textContent === "–")).toBe(true)
    expect(screen.getAllByTestId("employee-ot-delta").every((e) => (e.textContent ?? "").startsWith("–"))).toBe(true)
  })

  it("notes truncated week columns and lists hidden over weeks (H053)", () => {
    const d = {
      ...otData,
      series: otData.series.map((s) =>
        s.name !== "PERIOD_HOURS"
          ? s
          : {
              ...s,
              points: s.points.map((pt, i) =>
                i === 0 ? { ...pt, meta: { ...pt.meta, hidden_over: [{ from: "2026-07-20", hours: 24.6 }], hidden_over_count: 1 } } : pt,
              ),
            },
      ),
    } as unknown as ChartDataResponse
    const cfg = { ...otConfig, decimals: 1, employee_ot: { ...otConfig.employee_ot, weeks_truncated: true, weeks_total: 52 } }
    render(<BiDataTable config={cfg} data={d} />)
    const n = otConfig.employee_ot.weeks?.length ?? 0
    expect(screen.getByTestId("employee-ot-weeks-note").textContent).toContain(`Menampilkan ${n} dari 52 minggu terakhir`)
    expect(screen.getByTestId("employee-ot-hidden-over").textContent).toContain("20 Jul · 24.6 j")
  })

  it("shows no note when nothing is truncated (H053)", () => {
    render(<BiDataTable config={otConfig} data={otData} />)
    expect(screen.queryByTestId("employee-ot-weeks-note")).toBeNull()
    expect(screen.queryByTestId("employee-ot-hidden-over")).toBeNull()
  })

  it("drills NIK to days", () => {
    const onDrill = vi.fn()
    render(<BiDataTable config={otConfig} data={otData} onDrill={onDrill} />)
    fireEvent.click(screen.getByText("N3"))
    expect(onDrill).toHaveBeenCalledWith(["N3"])
  })

  it("renders the day drill with actual and limit hours", () => {
    const day = {
      series: [
        { name: "ACTUAL", points: [{ category: "2026-10-20", value: 4, label: "4" }] },
        { name: "LIMIT", points: [{ category: "2026-10-20", value: 3.5, label: "3.5" }] },
      ],
      categories: ["2026-10-20"],
      kpis: [],
      drillContext: { currentPath: ["N1"], canDrill: false, nextField: "", nextValues: [] },
    } as unknown as ChartDataResponse
    render(<BiDataTable config={{ table_mode: "employee_ot", number_format: "raw", decimals: 2 }} data={day} />)
    expect(screen.getByText("20 Okt 2026")).toBeTruthy()
    expect(screen.getByText("4.00")).toBeTruthy()
    expect(screen.getByText("3.50")).toBeTruthy()
  })
})
