import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DataTable } from "@/components/shared/data-table"
import { EXPORT_LAYOUT_OPTIONS } from "@/lib/finance/export-layout"
import { CostSheetExportLayout } from "@/types/generated/finance/v1/cost_calc"

const requestProductCostSheetExport = vi.fn()
vi.mock("@/lib/grpc", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/grpc")>()
  return {
    ...actual,
    createMetadataFromRequest: () => ({}),
    getCostCalcClient: () => ({ requestProductCostSheetExport }),
  }
})

import { POST } from "@/app/api/v1/finance/cost-results/request-export/route"
import { toExportLayout } from "@/lib/grpc/cost-calc-enums"
import { normalizeExportLayout } from "@/lib/finance/export-layout"
import { needsBatchConfirm, ExportCostSheetButton } from "@/components/finance/cost-results/export-cost-sheet-button"

const mutate = vi.fn()
vi.mock("@/hooks/finance/use-cost-calc", () => ({
  useRequestCostSheetExport: () => ({ mutate, isPending: false }),
  useExportJobStatus: () => ({ data: undefined }),
  useExportBatchProgress: () => null,
}))

function post(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/v1/finance/cost-results/request-export", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  requestProductCostSheetExport.mockResolvedValue({ base: { isSuccess: true }, data: { jobId: "j", layout: 2 } })
})

describe("BFF layout mapping", () => {
  it("maps strings to enum", () => {
    expect(toExportLayout("HORIZONTAL")).toBe(CostSheetExportLayout.COST_SHEET_EXPORT_LAYOUT_HORIZONTAL)
    expect(toExportLayout("vertical")).toBe(CostSheetExportLayout.COST_SHEET_EXPORT_LAYOUT_VERTICAL)
    expect(toExportLayout("COMBINED")).toBe(CostSheetExportLayout.COST_SHEET_EXPORT_LAYOUT_COMBINED)
    expect(toExportLayout(undefined)).toBe(CostSheetExportLayout.COST_SHEET_EXPORT_LAYOUT_UNSPECIFIED)
  })
  it("forwards layout to gRPC and normalizes response", async () => {
    const res = await post({ period: "202601", layout: "VERTICAL" })
    expect(requestProductCostSheetExport.mock.calls[0][0].layout).toBe(3)
    expect((await res.json()).data.layout).toBe("HORIZONTAL")
  })
  it("absent layout -> unspecified", async () => {
    await post({ period: "202601" })
    expect(requestProductCostSheetExport.mock.calls[0][0].layout).toBe(0)
  })
})

describe("normalizeExportLayout", () => {
  it("handles numbers and strings; unspecified -> COMBINED", () => {
    expect(normalizeExportLayout(0)).toBe("COMBINED")
    expect(normalizeExportLayout(undefined)).toBe("COMBINED")
    expect(normalizeExportLayout(2)).toBe("HORIZONTAL")
    expect(normalizeExportLayout("COST_SHEET_EXPORT_LAYOUT_VERTICAL")).toBe("VERTICAL")
  })
})

describe("needsBatchConfirm", () => {
  it("horizontal never confirms; combined/vertical confirm >200", () => {
    expect(needsBatchConfirm("HORIZONTAL", 5000)).toBe(false)
    expect(needsBatchConfirm("VERTICAL", 201)).toBe(true)
    expect(needsBatchConfirm("COMBINED", 201)).toBe(true)
    expect(needsBatchConfirm("COMBINED", 200)).toBe(false)
  })
})

describe("BFF deadline", () => {
  it("passes a deadline and maps DEADLINE_EXCEEDED to 504", async () => {
    requestProductCostSheetExport.mockRejectedValueOnce({ code: 4, details: "Deadline exceeded" })
    const res = await post({ period: "202601" })
    expect(requestProductCostSheetExport.mock.calls[0][2].deadline).toBeGreaterThan(Date.now())
    expect(res.status).toBe(504)
  })
})

async function openMenu(name: string) {
  const user = userEvent.setup()
  await user.click(screen.getByRole("button", { name }))
  return user
}

describe("ExportCostSheetButton", () => {
  it("click opens the menu and does not export", async () => {
    render(<ExportCostSheetButton filters={{ period: "202601" }} totalCount={5} label="Export" />)
    await openMenu("Export")
    expect(await screen.findAllByRole("menuitem")).toHaveLength(3)
    expect(mutate).not.toHaveBeenCalled()
  })
  it("horizontal skips confirm even with >200", async () => {
    render(<ExportCostSheetButton filters={{ period: "202601" }} totalCount={500} label="Export" />)
    const user = await openMenu("Export")
    await user.click(await screen.findByText("Horizontal — all data"))
    expect(mutate).toHaveBeenCalledTimes(1)
    expect(mutate.mock.calls[0][0].layout).toBe("HORIZONTAL")
  })
  it("vertical with >200 asks to confirm first", async () => {
    render(<ExportCostSheetButton filters={{ period: "202601" }} totalCount={500} label="Export" />)
    const user = await openMenu("Export")
    await user.click(await screen.findByText("Vertical — cost sheet per product"))
    expect(mutate).not.toHaveBeenCalled()
    expect(screen.getByText("Export a large product set")).toBeTruthy()
  })
})

describe("DataTable row action menu", () => {
  it("renders 3 items and calls onSelect per layout", async () => {
    const onSelect = vi.fn()
    const row = { id: 1 }
    render(
      <DataTable
        data={[row]}
        columns={[{ id: "id", header: "ID", cell: (r: { id: number }) => String(r.id) }]}
        keyField="id"
        actions={[
          {
            id: "export",
            label: "Export cost sheet",
            menu: EXPORT_LAYOUT_OPTIONS.map((o) => ({ id: o.layout, label: o.label, onSelect: () => onSelect(o.layout) })),
          },
        ]}
      />,
    )
    const user = userEvent.setup()
    await user.click(screen.getAllByRole("button", { name: "Export cost sheet" })[0])
    expect(await screen.findAllByRole("menuitem")).toHaveLength(3)
    await user.click(screen.getByText("Vertical — cost sheet per product"))
    expect(onSelect).toHaveBeenCalledWith("VERTICAL")
  })
})
