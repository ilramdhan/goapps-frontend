/**
 * SpinFixedCostFormDialog — form-schema and immutability behaviour.
 *
 * The two divisors (commonPoyDenier, poyProduction) must reject 0: a zero there
 * silently zeroes the fixed cost of every POY product in the calc engine rather
 * than erroring. The four monthly cost fields legitimately accept 0.
 * `period` is immutable — disabled on edit, and never part of the update payload.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// ─── Module mocks ─────────────────────────────────────────────────────────────

const createMutateAsync = vi.fn().mockResolvedValue({ base: { isSuccess: true } })
const updateMutateAsync = vi.fn().mockResolvedValue({ base: { isSuccess: true } })

vi.mock("@/hooks/finance/use-spin-fixed-cost", () => ({
  useCreateSpinFixedCost: () => ({ mutateAsync: createMutateAsync, isPending: false }),
  useUpdateSpinFixedCost: () => ({ mutateAsync: updateMutateAsync, isPending: false }),
}))

// ─── Import under test (after the mocks are registered) ───────────────────────

import { SpinFixedCostFormDialog } from "@/components/finance/spin-fixed-cost/spin-fixed-cost-form-dialog"
import type { SpinFixedCost } from "@/types/finance/spin-fixed-cost"

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EXISTING_ROW: SpinFixedCost = {
  id: "sfc-1",
  period: "202604",
  commonPoyDenier: 150.5,
  poyProduction: 2_000_000,
  spinPowerMonth: 1_000,
  spinManpowerMonth: 2_000,
  spinOverheadsMonth: 3_000,
  spinConssprsMonth: 4_000,
  isActive: true,
  audit: undefined,
}

function renderDialog(spinFixedCost: SpinFixedCost | null = null) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <SpinFixedCostFormDialog open onOpenChange={() => {}} spinFixedCost={spinFixedCost} />
    </QueryClientProvider>,
  )
}

function periodInput() {
  return screen.getByLabelText(/^period$/i) as HTMLInputElement
}

function numberField(label: RegExp) {
  return screen.getByLabelText(label) as HTMLInputElement
}

/** Replace the value of a controlled number input. */
function setNumber(label: RegExp, value: string) {
  fireEvent.change(numberField(label), { target: { value } })
}

const FIELD_LABELS = {
  commonPoyDenier: /common poy denier/i,
  poyProduction: /poy production/i,
  spinPowerMonth: /spin power \/ month/i,
  spinManpowerMonth: /spin manpower \/ month/i,
  spinOverheadsMonth: /spin overheads \/ month/i,
  spinConssprsMonth: /spin cons\. spares \/ month/i,
} as const

/** Fill a valid create form, then override the named fields. */
function fillValidCreateForm(overrides: Partial<Record<keyof typeof FIELD_LABELS, string>> = {}) {
  fireEvent.change(periodInput(), { target: { value: "2026-05" } })
  const values: Record<keyof typeof FIELD_LABELS, string> = {
    commonPoyDenier: "150.5",
    poyProduction: "2000000",
    spinPowerMonth: "1000",
    spinManpowerMonth: "2000",
    spinOverheadsMonth: "3000",
    spinConssprsMonth: "4000",
    ...overrides,
  }
  for (const key of Object.keys(FIELD_LABELS) as Array<keyof typeof FIELD_LABELS>) {
    setNumber(FIELD_LABELS[key], values[key])
  }
}

async function submit() {
  await userEvent.click(screen.getByRole("button", { name: /^(create|update)$/i }))
}

// The static field description also reads "Must be greater than 0 (divisor).",
// so the assertions key off the schema message's distinctive tail instead.
const DIVISOR_ERROR = /divisor in the calc engine, and zero would zero out the fixed cost of every POY product/i

/** The rendered <FormMessage> for a field, or null when the field is valid. */
function fieldError(name: string): string | null {
  const input = document.querySelector(`[name="${name}"]`)
  const describedBy = input?.getAttribute("aria-describedby") ?? ""
  const messageId = describedBy.split(/\s+/).find((id) => id.endsWith("-form-item-message"))
  if (!messageId) return null
  return document.getElementById(messageId)?.textContent ?? null
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, "error").mockImplementation(() => {})
})

// ============================================================================
// Divisor validation (> 0)
// ============================================================================

describe("SpinFixedCostFormDialog — divisor validation", () => {
  it("accepts a fully valid create form", async () => {
    renderDialog()
    fillValidCreateForm()
    await submit()

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1))
    expect(createMutateAsync.mock.calls[0][0]).toEqual({
      period: "202605",
      commonPoyDenier: 150.5,
      poyProduction: 2_000_000,
      spinPowerMonth: 1_000,
      spinManpowerMonth: 2_000,
      spinOverheadsMonth: 3_000,
      spinConssprsMonth: 4_000,
    })
  })

  it("rejects 0 on commonPoyDenier with a calc-engine explanation", async () => {
    renderDialog()
    fillValidCreateForm({ commonPoyDenier: "0" })
    await submit()

    expect(await screen.findByText(DIVISOR_ERROR)).toBeInTheDocument()
    // The error is attached to the offending field, not a sibling.
    await waitFor(() => expect(fieldError("commonPoyDenier")).toMatch(DIVISOR_ERROR))
    expect(fieldError("poyProduction")).toBeNull()
    expect(createMutateAsync).not.toHaveBeenCalled()
  })

  it("rejects 0 on poyProduction with a calc-engine explanation", async () => {
    renderDialog()
    fillValidCreateForm({ poyProduction: "0" })
    await submit()

    expect(await screen.findByText(DIVISOR_ERROR)).toBeInTheDocument()
    await waitFor(() => expect(fieldError("poyProduction")).toMatch(DIVISOR_ERROR))
    expect(fieldError("commonPoyDenier")).toBeNull()
    expect(createMutateAsync).not.toHaveBeenCalled()
  })

  it("accepts 0 on all four monthly cost fields", async () => {
    renderDialog()
    fillValidCreateForm({
      spinPowerMonth: "0",
      spinManpowerMonth: "0",
      spinOverheadsMonth: "0",
      spinConssprsMonth: "0",
    })
    await submit()

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1))
    expect(createMutateAsync.mock.calls[0][0]).toMatchObject({
      spinPowerMonth: 0,
      spinManpowerMonth: 0,
      spinOverheadsMonth: 0,
      spinConssprsMonth: 0,
      commonPoyDenier: 150.5,
      poyProduction: 2_000_000,
    })
  })

  it("accepts a small positive divisor (only zero and below are refused)", async () => {
    renderDialog()
    fillValidCreateForm({ commonPoyDenier: "0.000001", poyProduction: "0.5" })
    await submit()

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1))
    expect(createMutateAsync.mock.calls[0][0]).toMatchObject({
      commonPoyDenier: 0.000001,
      poyProduction: 0.5,
    })
  })
})

// ============================================================================
// Negative values
// ============================================================================

describe("SpinFixedCostFormDialog — negative values", () => {
  it.each(Object.keys(FIELD_LABELS) as Array<keyof typeof FIELD_LABELS>)(
    "never submits a negative %s",
    async (field) => {
      renderDialog()
      fillValidCreateForm({ [field]: "-1" })
      await submit()

      // Two layers refuse a negative. The browser's native min="0" constraint
      // blocks the submit event first, so react-hook-form/zod is never reached
      // and no <FormMessage> renders — the mutation simply never fires.
      await waitFor(() => expect(numberField(FIELD_LABELS[field]).validity.rangeUnderflow).toBe(true))
      expect(numberField(FIELD_LABELS[field]).checkValidity()).toBe(false)
      expect(createMutateAsync).not.toHaveBeenCalled()
    },
  )

  it.each(Object.keys(FIELD_LABELS) as Array<keyof typeof FIELD_LABELS>)(
    "still rejects a negative %s in the zod schema when the native min guard is bypassed",
    async (field) => {
      renderDialog()
      fillValidCreateForm({ [field]: "-1" })
      // Drop the native constraint so the submit reaches react-hook-form and the
      // zod layer is what does the refusing — this is the guard that survives if
      // min="0" is ever removed from the inputs.
      numberField(FIELD_LABELS[field]).removeAttribute("min")
      await submit()

      await waitFor(() => expect(fieldError(field)).toBeTruthy())
      expect(fieldError(field)).toMatch(/must be (greater than 0|0 or greater)/i)
      expect(createMutateAsync).not.toHaveBeenCalled()
    },
  )
})

// ============================================================================
// Period validation and immutability
// ============================================================================

describe("SpinFixedCostFormDialog — period", () => {
  it("rejects an empty period on create", async () => {
    renderDialog()
    // Everything but the period.
    for (const key of Object.keys(FIELD_LABELS) as Array<keyof typeof FIELD_LABELS>) {
      setNumber(FIELD_LABELS[key], "10")
    }
    await submit()

    expect(await screen.findByText(/period is required/i)).toBeInTheDocument()
    expect(createMutateAsync).not.toHaveBeenCalled()
  })

  it("rejects a malformed period (the month picker yields '' for bad input)", async () => {
    renderDialog()
    fillValidCreateForm()
    // A tampered/cleared month input maps to "" — which fails YYYYMM.
    fireEvent.change(periodInput(), { target: { value: "not-a-month" } })
    await submit()

    await waitFor(() => expect(createMutateAsync).not.toHaveBeenCalled())
    expect(screen.getByText(/period (is required|must be in yyyymm format)/i)).toBeInTheDocument()
  })

  it("is enabled when creating", () => {
    renderDialog()
    expect(periodInput()).not.toBeDisabled()
  })

  it("is disabled when editing an existing row", () => {
    renderDialog(EXISTING_ROW)
    expect(periodInput()).toBeDisabled()
    expect(periodInput().value).toBe("2026-04")
    expect(screen.getByText(/april 2026 — the period is fixed once the row exists\./i)).toBeInTheDocument()
  })

  it("never sends `period` in the update payload", async () => {
    renderDialog(EXISTING_ROW)
    setNumber(FIELD_LABELS.commonPoyDenier, "160")
    await submit()

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1))
    const payload = updateMutateAsync.mock.calls[0][0]
    expect(payload.data).not.toHaveProperty("period")
    expect(JSON.stringify(payload)).not.toContain("202604")
    expect(payload.id).toBe("sfc-1")
    expect(payload.data.commonPoyDenier).toBe(160)
  })
})

// ============================================================================
// Edit-mode shape
// ============================================================================

describe("SpinFixedCostFormDialog — edit mode", () => {
  it("prefills every numeric from the existing row", () => {
    renderDialog(EXISTING_ROW)

    expect(numberField(FIELD_LABELS.commonPoyDenier).value).toBe("150.5")
    expect(numberField(FIELD_LABELS.poyProduction).value).toBe("2000000")
    expect(numberField(FIELD_LABELS.spinPowerMonth).value).toBe("1000")
    expect(numberField(FIELD_LABELS.spinConssprsMonth).value).toBe("4000")
  })

  it("exposes the Active Status switch only when editing", () => {
    renderDialog()
    expect(screen.queryByLabelText(/active status/i)).not.toBeInTheDocument()

    renderDialog(EXISTING_ROW)
    expect(screen.getByRole("switch")).toBeInTheDocument()
  })

  it("still enforces the divisor rule on update", async () => {
    renderDialog(EXISTING_ROW)
    setNumber(FIELD_LABELS.poyProduction, "0")
    await submit()

    await waitFor(() => expect(fieldError("poyProduction")).toMatch(DIVISOR_ERROR))
    expect(updateMutateAsync).not.toHaveBeenCalled()
  })

  it("tells the user that a create on an existing period is the wrong path", () => {
    renderDialog()
    expect(screen.getByText(/if the period already exists, edit that row instead/i)).toBeInTheDocument()
  })
})
