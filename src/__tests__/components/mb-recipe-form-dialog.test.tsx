/**
 * MBRecipeFormDialog — K-4: `mbhDozing` must never be sent as a fabricated 0.
 *
 * `mbh_dozing` is a retired, contaminated column (D30): it is not rendered in the
 * form, so any value it carries into a payload was never typed by a user. The old
 * zod chain was `z.coerce.number().min(0).max(100).optional().or(z.literal(""))` —
 * the coercion ran first, so the empty default "" became 0, passed min(0), and the
 * `""` branch was never reached. That wrote a fake 0 on create AND overwrote an
 * existing NULL with 0 on update.
 *
 * These tests lock the corrected behaviour: "" stays "" → `toOptNum` → `undefined`
 * → ts-proto skips the field → column stays NULL. Existing values still round-trip.
 *
 * NOTE: the frozen legacy path (`mb-head-form-dialog-legacy.tsx`) deliberately keeps
 * the old quirk — see `mb-head-form-dialog-legacy.test.tsx`. Do not unify them.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// ─── Module mocks ─────────────────────────────────────────────────────────────

const createMutateAsync = vi.fn().mockResolvedValue({ base: { isSuccess: true } })
const updateMutateAsync = vi.fn().mockResolvedValue({ base: { isSuccess: true } })

vi.mock("@/hooks/finance/use-mb-head", () => ({
  useCreateMBHead: () => ({ mutateAsync: createMutateAsync, isPending: false }),
  useUpdateMBHead: () => ({ mutateAsync: updateMutateAsync, isPending: false }),
}))

vi.mock("@/components/finance/comboboxes/machine-combobox", () => ({
  MachineCombobox: ({ value, disabled }: { value: string | undefined; disabled?: boolean }) => (
    <input data-testid="machine-combobox" readOnly value={value ?? ""} disabled={disabled} />
  ),
}))

// ─── Import under test (after the mocks are registered) ───────────────────────

import { MBRecipeFormDialog } from "@/components/finance/mb-recipe/mb-recipe-form-dialog"
import type { MBHead } from "@/types/finance/mb-head"

// ─── Fixtures ────────────────────────────────────────────────────────────────

const BASE_ROW = {
  mbhId: "mbh-1",
  mbhOracleSysId: "ORA-1",
  mbhMbCosting: "MBH-2024-001",
  mbhMgtName: "Mgt One",
  mbhDenier: 150.5,
  mbhFilament: 48,
  mbhDozing: undefined,
  mbhIsActive: true,
  mbhCheckStatus: "Approved",
  mbhStatus: "Spinning",
  mbhLdrPrsn: 1.25,
  mbhRunLdrPct: 3.55,
  mbhFinalProduct: "FP-1",
  mbhCode: "C-1",
  entryStatus: "DRAFT",
  isBoughtout: false,
  audit: undefined,
  currentVersion: 1,
  machineFixedTotal: "0",
  stateReason: "",
  devCode: "DEV-1",
  shadeCode: "SH-1",
  shadeName: "Shade One",
  crossSection: "ROUND",
  lustureCode: "SD",
  costProductId: 0,
  costGeneratedAt: "",
  costGeneratedBy: "",
  paramWaste: "",
  paramQualityLoss: "",
  paramEfficiency: "",
  paramDevExpense: "",
  paramPacking: "",
  paramMbProdPerDay: "",
  paramThroughputPerHour: "",
  paramNoOfProcess: "",
  machineId: "mc-1",
} satisfies MBHead

/** A row whose `mbh_dozing` is NULL in the DB — the case the old chain corrupted. */
const ROW_WITH_NULL_DOZING: MBHead = { ...BASE_ROW }

/** A row that legitimately carries a dozing value — must survive untouched. */
const ROW_WITH_DOZING: MBHead = { ...BASE_ROW, mbhDozing: 3.55 }

function renderDialog(mbHead: MBHead | null = null) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MBRecipeFormDialog open onOpenChange={() => {}} mbHead={mbHead} />
    </QueryClientProvider>,
  )
}

function input(label: RegExp) {
  return screen.getByLabelText(label) as HTMLInputElement
}

async function submit() {
  await userEvent.click(screen.getByRole("button", { name: /^(create|update)$/i }))
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, "error").mockImplementation(() => {})
})

// ============================================================================
// K-4 — the empty dozing field must not become 0
// ============================================================================

describe("MBRecipeFormDialog — K-4 mbhDozing must not be fabricated as 0", () => {
  it("(a) omits mbhDozing entirely on create when dozing was never filled in", async () => {
    renderDialog()
    fireEvent.change(input(/mb costing code/i), { target: { value: "MBH-NEW-1" } })
    await submit()

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1))
    const payload = createMutateAsync.mock.calls[0][0]
    // The regression this guards: the old zod chain sent 0 here.
    expect(payload.mbhDozing).not.toBe(0)
    expect(payload.mbhDozing).toBeUndefined()
  })

  it("(b) leaves a NULL dozing NULL on update when the row is saved untouched", async () => {
    renderDialog(ROW_WITH_NULL_DOZING)
    await submit()

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1))
    const data = updateMutateAsync.mock.calls[0][0].data
    // The old chain coerced the "" prefill to 0 and overwrote the NULL server-side.
    expect(data.mbhDozing).not.toBe(0)
    expect(data.mbhDozing).toBeUndefined()
  })

  it("(c) round-trips an existing dozing value unchanged (fix does not clobber real data)", async () => {
    renderDialog(ROW_WITH_DOZING)
    await submit()

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1))
    expect(updateMutateAsync.mock.calls[0][0].data.mbhDozing).toBe(3.55)
  })

  it("still never renders a Dozing input (D30 stays in force)", () => {
    renderDialog(ROW_WITH_DOZING)
    expect(document.querySelector('[name="mbhDozing"]')).toBeNull()
    expect(screen.queryByLabelText(/dozing/i)).not.toBeInTheDocument()
  })
})

// ============================================================================
// Surrounding payload must be unaffected by the schema change
// ============================================================================

describe("MBRecipeFormDialog — payload shape unchanged around the fix", () => {
  it("submits a minimal create with every untouched optional omitted", async () => {
    renderDialog()
    fireEvent.change(input(/mb costing code/i), { target: { value: "MBH-NEW-1" } })
    await submit()

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1))
    expect(createMutateAsync.mock.calls[0][0]).toEqual({
      mbhMbCosting: "MBH-NEW-1",
      mbhOracleSysId: undefined,
      mbhMgtName: undefined,
      mbhDenier: undefined,
      mbhFilament: undefined,
      mbhDozing: undefined,
      mbhCheckStatus: undefined,
      mbhStatus: undefined,
      mbhLdrPrsn: undefined,
      mbhRunLdrPct: undefined,
      mbhFinalProduct: undefined,
      mbhCode: undefined,
      mbhIsBoughtout: false,
      mbhDevCode: undefined,
      mbhShadeCode: undefined,
      mbhShadeName: undefined,
      mbhCrossSection: undefined,
      mbhLustureCode: undefined,
      mbhMachineId: undefined,
    })
  })

  it("refuses to submit without the required MB Costing code", async () => {
    renderDialog()
    await submit()

    expect(await screen.findByText(/mb costing code is required/i)).toBeInTheDocument()
    expect(createMutateAsync).not.toHaveBeenCalled()
  })

  it("keeps the LDR fields intact on update", async () => {
    renderDialog(ROW_WITH_NULL_DOZING)

    expect(input(/ldr rencana/i).value).toBe("1.25")
    expect(input(/ldr aktual/i).value).toBe("3.55")

    await submit()
    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1))
    expect(updateMutateAsync.mock.calls[0][0].data).toMatchObject({
      mbhId: "mbh-1",
      mbhLdrPrsn: 1.25,
      mbhRunLdrPct: 3.55,
      mbhIsActive: true,
    })
  })
})
