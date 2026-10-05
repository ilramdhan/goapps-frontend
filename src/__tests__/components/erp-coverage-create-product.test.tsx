import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { CoverageTab } from "@/components/finance/erp-integration/detail/tabs/coverage-tab"

let allowed = true
let rows: Array<Record<string, unknown>> = []

vi.mock("@/lib/hooks/use-permission", () => ({ usePermission: () => ({ hasPermission: () => allowed }) }))
vi.mock("@/hooks/finance/use-erp-integration", () => ({
  useErpCoverage: () => ({ data: { items: rows } }),
  useErpLinkReport: () => ({ data: { items: [] } }),
  useExportErpCoverage: () => ({ isPending: false, mutate: vi.fn() }),
  useCreateErpProductFromDemand: () => ({ isPending: false, mutate: vi.fn() }),
}))

const line = (erpItemCode: string, status = "NO_MAPPING") => ({
  cecId: 1, erpItemCode, productId: "", productCode: "", qty: "1", costUsd: "", status, message: "",
})

describe("CoverageTab create product", () => {
  beforeEach(() => {
    allowed = true
  })
  it("shows for a yarn NO_MAPPING gap", () => {
    rows = [line("POY100")]
    render(<CoverageTab batchId={1} />)
    expect(screen.getByRole("button", { name: "Create product" })).toBeTruthy()
  })
  it("hides for MB lines", () => {
    rows = [line("CMB100")]
    render(<CoverageTab batchId={1} />)
    expect(screen.queryByRole("button", { name: "Create product" })).toBeNull()
  })
  it("hides without permission", () => {
    allowed = false
    rows = [line("POY100")]
    render(<CoverageTab batchId={1} />)
    expect(screen.queryByRole("button", { name: "Create product" })).toBeNull()
  })
})
