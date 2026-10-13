import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { render, screen, fireEvent } from "@testing-library/react"
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

describe("ExportCostSheetButton", () => {
  it("primary click with >200 asks to confirm, not exported yet", () => {
    render(<ExportCostSheetButton filters={{ period: "202601" }} totalCount={500} label="Export" />)
    fireEvent.click(screen.getByText("Export"))
    expect(mutate).not.toHaveBeenCalled()
    expect(screen.getByText("Export a large product set")).toBeTruthy()
  })
})
