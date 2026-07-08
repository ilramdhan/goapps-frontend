/**
 * Tests for RequestFormDialog — P2-T9: shade code/name split.
 * Verifies:
 *  - Submitting with only shade code (no shade name) succeeds.
 *  - The all-or-nothing spec validation group no longer includes shade fields
 *    (product description + tube type only) — leaving those two blank while
 *    filling only shade code does not trigger the "fill in all spec fields" error.
 */
import { describe, it, expect, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// jsdom doesn't implement these — Radix's Select relies on them for pointer
// interactions during open/close. Without the polyfill, clicking the tube
// type Select throws "hasPointerCapture is not a function".
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

// ─── Module mocks ─────────────────────────────────────────────────────────────

const mutateAsync = vi.fn().mockResolvedValue({ requestId: 1, requestNo: "REQ-0001" })

vi.mock("@/hooks/finance/use-cost-product-request", () => ({
  useCreateCostProductRequest: () => ({ mutateAsync, isPending: false }),
  useUpdateCostProductRequest: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock("@/components/finance/comboboxes", () => ({
  RequestTypeCombobox: ({ onChange }: { onChange: (typeId: number, code: string, variant: string) => void }) => (
    <button type="button" onClick={() => onChange(7, "QUOTE", "quote")}>
      pick-request-type
    </button>
  ),
  ProductMasterCombobox: ({
    onChange,
  }: {
    onChange: (productSysId: number, productCode: string, productName: string) => void
  }) => (
    <button type="button" onClick={() => onChange(42, "PM-42", "Reference Product")}>
      pick-reference-product
    </button>
  ),
}))

// ─── Import under test (after all mocks are registered) ──────────────────────

import { RequestFormDialog } from "@/components/finance/cost-product-request/request-form-dialog"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderDialog() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <RequestFormDialog open onOpenChange={() => {}} request={null} />
    </QueryClientProvider>,
  )
}

async function fillRequiredBaseFields() {
  await userEvent.click(screen.getByRole("button", { name: "pick-request-type" }))
  await userEvent.type(screen.getByLabelText(/title \*/i), "New product request")
  await userEvent.type(screen.getByLabelText(/customer name \*/i), "Acme Corp")
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("RequestFormDialog — shade code/name split (P2-T9)", () => {
  it("submits successfully with only shade code filled (no shade name)", async () => {
    mutateAsync.mockClear()
    renderDialog()

    await fillRequiredBaseFields()
    await userEvent.type(screen.getByLabelText(/shade code/i), "NL")

    await userEvent.click(screen.getByRole("button", { name: /create request/i }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))

    const payload = mutateAsync.mock.calls[0][0]
    expect(payload.spec).toBeUndefined()
    expect(screen.queryByText(/fill in all spec fields/i)).not.toBeInTheDocument()
  })

  it("does not require shade fields as part of the all-or-nothing spec group", async () => {
    mutateAsync.mockClear()
    renderDialog()

    await fillRequiredBaseFields()
    // Fill only the all-or-nothing pair (description + tube type), leave shade blank.
    await userEvent.type(screen.getByLabelText(/product description/i), "PET bottle grade resin")
    await userEvent.click(screen.getByRole("combobox", { name: /tube/i }))
    await userEvent.click(await screen.findByRole("option", { name: "Paper" }))

    await userEvent.click(screen.getByRole("button", { name: /create request/i }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))

    const payload = mutateAsync.mock.calls[0][0]
    expect(payload.spec).toBeDefined()
    expect(payload.spec.shadeCode).toBe("")
    expect(payload.spec.shadeName).toBe("")
    expect(screen.queryByText(/fill in all spec fields/i)).not.toBeInTheDocument()
  })

  it("rejects a half-filled all-or-nothing group (description without tube type) while shade is irrelevant to that check", async () => {
    mutateAsync.mockClear()
    renderDialog()

    await fillRequiredBaseFields()
    await userEvent.type(screen.getByLabelText(/product description/i), "PET bottle grade resin")
    await userEvent.type(screen.getByLabelText(/shade code/i), "NL")
    await userEvent.type(screen.getByLabelText(/shade name/i), "Natural")

    await userEvent.click(screen.getByRole("button", { name: /create request/i }))

    expect(await screen.findAllByText(/fill in all spec fields/i)).not.toHaveLength(0)
    expect(mutateAsync).not.toHaveBeenCalled()
  })
})

describe("RequestFormDialog — reference product field (P2-T18)", () => {
  it("submits successfully with the reference product left unset", async () => {
    mutateAsync.mockClear()
    renderDialog()

    await fillRequiredBaseFields()
    await userEvent.click(screen.getByRole("button", { name: /create request/i }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))

    const payload = mutateAsync.mock.calls[0][0]
    expect(payload.referenceProductSysId).toBeUndefined()
    expect(screen.queryByText(/reference product/i)).toBeInTheDocument() // label still rendered, just optional
  })

  it("submits the picked reference product sys id when one is selected", async () => {
    mutateAsync.mockClear()
    renderDialog()

    await fillRequiredBaseFields()
    await userEvent.click(screen.getByRole("button", { name: "pick-reference-product" }))
    await userEvent.click(screen.getByRole("button", { name: /create request/i }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))

    const payload = mutateAsync.mock.calls[0][0]
    expect(payload.referenceProductSysId).toBe(42)
  })
})
