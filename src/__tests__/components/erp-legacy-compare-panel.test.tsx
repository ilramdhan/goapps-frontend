import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { LegacyComparePanel } from "@/components/finance/erp-integration/detail/legacy-compare-panel"

vi.mock("@/services/finance/erp-integration-api", () => ({
  listStdCost: vi.fn().mockResolvedValue({
    items: [{ basis: "SPPTY", erpItemCode: "I1", gradeCode: "AA", shadeCode: "S1", stdCost: "1.5" }],
    pagination: { totalPages: 1 },
  }),
}))

describe("LegacyComparePanel", () => {
  it("renders summary after upload", async () => {
    render(<LegacyComparePanel batchId={1} />)
    const file = new File(["basis,item,grade,shade,rate\nSPPTY,I1,AA,S1,1.5\n"], "l.csv", { type: "text/csv" })
    await userEvent.upload(screen.getByLabelText("Legacy CSV"), file)
    await waitFor(() => expect(screen.getByText("Download comparison CSV")).toBeTruthy())
    expect(screen.getAllByText("Basis").length).toBeGreaterThan(0)
  })
})
