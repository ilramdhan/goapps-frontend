/**
 * Tests for CostProductRequestImportDialog (P4-T4, design.md §4 Area D6):
 *  - error rows render as "Row {rowNumber}: {field} - {message}"
 *  - success/failure counts render correctly after an import completes
 *  - a fully successful import (no errors) shows zero failures and no error list
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// jsdom doesn't implement scrollIntoView / hasPointerCapture — some shared UI
// primitives touch these during interaction; polyfill defensively like other
// dialog tests in this suite.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

// ─── Module mocks ─────────────────────────────────────────────────────────────

const importMutateAsync = vi.fn()
const templateMutateAsync = vi.fn().mockResolvedValue({})

vi.mock("@/hooks/finance/use-cost-product-request", () => ({
  useImportCostProductRequests: () => ({ mutateAsync: importMutateAsync, isPending: false }),
  useDownloadCostProductRequestTemplate: () => ({ mutateAsync: templateMutateAsync, isPending: false }),
}))

vi.mock("@/lib/api", () => ({
  readFileAsBytes: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
}))

// ─── Import under test (after all mocks are registered) ──────────────────────

import { CostProductRequestImportDialog } from "@/components/finance/cost-product-request/cost-product-request-import-dialog"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderDialog(onSuccess = vi.fn()) {
  return render(
    <CostProductRequestImportDialog open onOpenChange={() => {}} onSuccess={onSuccess} />,
  )
}

async function selectFile() {
  const file = new File(["dummy content"], "requests.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  await userEvent.upload(input, file)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("CostProductRequestImportDialog", () => {
  beforeEach(() => {
    importMutateAsync.mockReset()
    templateMutateAsync.mockClear()
  })

  it("renders error rows as 'Row {rowNumber}: {field} - {message}'", async () => {
    importMutateAsync.mockResolvedValue({
      successCount: 2,
      skippedCount: 0,
      updatedCount: 0,
      failedCount: 1,
      errors: [
        { rowNumber: 3, field: "requestTypeId", message: "unknown request type code 'BOGUS'" },
      ],
    })

    renderDialog()
    await selectFile()
    await userEvent.click(screen.getByRole("button", { name: "Import" }))

    expect(
      await screen.findByText("Row 3: requestTypeId - unknown request type code 'BOGUS'"),
    ).toBeInTheDocument()
  })

  it("renders success and failure counts after import completes", async () => {
    importMutateAsync.mockResolvedValue({
      successCount: 5,
      skippedCount: 0,
      updatedCount: 0,
      failedCount: 2,
      errors: [
        { rowNumber: 2, field: "spec.productDescription", message: "required" },
        { rowNumber: 4, field: "spec.shadeId", message: "shade code or id required" },
      ],
    })

    const onSuccess = vi.fn()
    renderDialog(onSuccess)
    await selectFile()
    await userEvent.click(screen.getByRole("button", { name: "Import" }))

    expect(await screen.findByText("Import Complete")).toBeInTheDocument()
    expect(screen.getByText("5")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
    expect(onSuccess).toHaveBeenCalled()
  })

  it("renders zero failures and no error list for a fully successful import", async () => {
    importMutateAsync.mockResolvedValue({
      successCount: 4,
      skippedCount: 0,
      updatedCount: 0,
      failedCount: 0,
      errors: [],
    })

    renderDialog()
    await selectFile()
    await userEvent.click(screen.getByRole("button", { name: "Import" }))

    expect(await screen.findByText("Import Complete")).toBeInTheDocument()
    expect(screen.getByText("4")).toBeInTheDocument()
    expect(screen.queryByText(/^Errors:$/)).not.toBeInTheDocument()
  })
})
