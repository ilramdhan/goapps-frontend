/**
 * MBHeadFormDialogLegacy — penjaga jalur rollback D16 (P1 / R22).
 *
 * Berkas `mb-head-form-dialog-legacy.tsx` adalah salinan BEKU dari form MB Head
 * sebelum pemecahan P1. Test ini bukan snapshot penuh (terlalu rapuh terhadap
 * perubahan kelas Tailwind / markup shadcn); ia mengunci hal-hal yang benar-benar
 * menentukan apakah jalur rollback masih utuh:
 *   1. Kontrak field yang dirender (create dan edit) — mendeteksi field area A/B
 *      yang diam-diam menempel ke jalur beku ini.
 *   2. Invarian D30: input "Dozing" tidak pernah dirender, tetapi nilainya tetap
 *      round-trip lewat state form dan ikut terkirim pada payload.
 *   3. Payload create/update tetap sama bentuknya.
 *   4. Immutability: mbhMbCosting / Oracle SYS ID / Bought-out terkunci saat edit.
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

// The machine picker does its own data fetching; the legacy form only needs it to
// surface a value, so it is stubbed down to a plain input.
vi.mock("@/components/finance/comboboxes/machine-combobox", () => ({
  MachineCombobox: ({ value, disabled }: { value: string | undefined; disabled?: boolean }) => (
    <input data-testid="machine-combobox" readOnly value={value ?? ""} disabled={disabled} />
  ),
}))

// ─── Import under test (after the mocks are registered) ───────────────────────

import { MBHeadFormDialogLegacy } from "@/components/finance/mb-head/mb-head-form-dialog-legacy"
import type { MBHead } from "@/types/finance/mb-head"

// ─── Fixtures ────────────────────────────────────────────────────────────────

const EXISTING_ROW = {
  mbhId: "mbh-1",
  mbhOracleSysId: "ORA-1",
  mbhMbCosting: "MBH-2024-001",
  mbhMgtName: "Mgt One",
  mbhDenier: 150.5,
  mbhFilament: 48,
  // D30: contaminated legacy column — must survive a round-trip untouched.
  mbhDozing: 3.55,
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

function renderDialog(mbHead: MBHead | null = null) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MBHeadFormDialogLegacy open onOpenChange={() => {}} mbHead={mbHead} />
    </QueryClientProvider>,
  )
}

/** The set of `name=` attributes the legacy form actually renders. */
function renderedFieldNames(): string[] {
  return Array.from(document.querySelectorAll("[name]"))
    .map((el) => el.getAttribute("name") ?? "")
    .filter(Boolean)
    .sort()
}

function input(label: RegExp) {
  return screen.getByLabelText(label) as HTMLInputElement
}

async function submit() {
  await userEvent.click(screen.getByRole("button", { name: /^(create|update)$/i }))
}

/** Fields the frozen form renders when creating. Bought-out is a Switch, not [name]. */
const CREATE_FIELD_NAMES = [
  // ⛔ "mbhCheckStatus" was REMOVED from this list on 2026-08-23 (plan §11 item 105,
  // decision K-1) because the field itself was removed from the legacy form.
  // `mbh_check_status` is the FROZEN Oracle import trace: read-only on the detail
  // page, never writable. The reverse-guard describe block below fails if it returns.
  "mbhCode",
  "mbhCrossSection",
  "mbhDenier",
  "mbhDevCode",
  "mbhFilament",
  "mbhFinalProduct",
  "mbhLdrPrsn",
  "mbhLustureCode",
  "mbhMbCosting",
  "mbhMgtName",
  "mbhOracleSysId",
  "mbhRunLdrPct",
  "mbhShadeCode",
  "mbhShadeName",
  "mbhStatus",
].sort()

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, "error").mockImplementation(() => {})
})

// ============================================================================
// Field contract — the actual rollback guard
// ============================================================================

describe("MBHeadFormDialogLegacy — frozen field contract", () => {
  it("renders exactly the frozen create-mode field set (no area A/B field crept in)", () => {
    renderDialog()
    expect(renderedFieldNames()).toEqual(CREATE_FIELD_NAMES)
  })

  it("renders the same field set in edit mode", () => {
    renderDialog(EXISTING_ROW)
    expect(renderedFieldNames()).toEqual(CREATE_FIELD_NAMES)
  })

  // ── REVERSE GUARD: plan §11 item 105 + decision K-1 ────────────────────────
  // `mbh_check_status` is the FROZEN Oracle import trace. The user explicitly
  // ordered the writable field removed from this legacy form (the freeze on this
  // file was lifted for that one change). These tests FAIL if it ever comes back —
  // as a rendered input, or silently inside a create/update payload.
  it("never renders a check-status input (create mode)", () => {
    renderDialog()
    expect(document.querySelector('[name="mbhCheckStatus"]')).toBeNull()
    expect(renderedFieldNames()).not.toContain("mbhCheckStatus")
    expect(screen.queryByLabelText(/check status/i)).toBeNull()
  })

  it("never renders a check-status input (edit mode, row already has one)", () => {
    renderDialog(EXISTING_ROW)
    expect(document.querySelector('[name="mbhCheckStatus"]')).toBeNull()
    expect(renderedFieldNames()).not.toContain("mbhCheckStatus")
    expect(screen.queryByLabelText(/check status/i)).toBeNull()
  })

  it("never sends mbhCheckStatus in a create payload", async () => {
    renderDialog()
    fireEvent.change(input(/mb costing code/i), { target: { value: "MBH-GUARD-1" } })
    await submit()

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1))
    expect(createMutateAsync.mock.calls[0][0]).not.toHaveProperty("mbhCheckStatus")
  })

  it("never sends mbhCheckStatus in an update payload, even when the row carries one", async () => {
    renderDialog(EXISTING_ROW)
    await submit()

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1))
    expect(updateMutateAsync.mock.calls[0][0].data).not.toHaveProperty("mbhCheckStatus")
  })

  it("renders the frozen section headings and dialog copy", () => {
    renderDialog()
    expect(screen.getByText("Add MB Head")).toBeInTheDocument()
    expect(screen.getByText(/create a new mb head record\./i)).toBeInTheDocument()
    expect(screen.getByText("Oracle Data")).toBeInTheDocument()
    expect(screen.getByText("Recipe Identity")).toBeInTheDocument()
  })

  it("switches to edit copy when a row is supplied", () => {
    renderDialog(EXISTING_ROW)
    expect(screen.getByText("Edit MB Head")).toBeInTheDocument()
    expect(screen.getByText(/update mb head details\./i)).toBeInTheDocument()
  })
})

// ============================================================================
// D30 — mbhDozing is hidden but still round-trips
// ============================================================================

describe("MBHeadFormDialogLegacy — D30 dozing invariant", () => {
  it("never renders a Dozing input", () => {
    renderDialog(EXISTING_ROW)
    expect(document.querySelector('[name="mbhDozing"]')).toBeNull()
    expect(screen.queryByLabelText(/dozing/i)).not.toBeInTheDocument()
  })

  it("round-trips the existing dozing value into the update payload untouched", async () => {
    renderDialog(EXISTING_ROW)
    await submit()

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1))
    expect(updateMutateAsync.mock.calls[0][0].data.mbhDozing).toBe(3.55)
  })

  it("sends dozing as 0 on create — the frozen quirk of its zod chain", async () => {
    renderDialog()
    fireEvent.change(input(/mb costing code/i), { target: { value: "MBH-NEW-1" } })
    await submit()

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1))
    // Not a typo and not desirable — just what this frozen path does today.
    // `mbhDozing` is `z.coerce.number().min(0)…`, so the empty default "" coerces
    // to 0 and satisfies min(0) before the `.or(z.literal(""))` branch is reached.
    // `mbhDenier`/`mbhFilament` use `.positive()`, so their 0 fails and they stay
    // "" → undefined. Any change to this value is a behaviour change to R22.
    expect(createMutateAsync.mock.calls[0][0].mbhDozing).toBe(0)
  })
})

// ============================================================================
// Payload shape
// ============================================================================

describe("MBHeadFormDialogLegacy — payload shape", () => {
  it("submits a minimal create with only the required code populated", async () => {
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
      mbhDozing: 0, // see the D30 test above — frozen quirk, not a target value
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

  it("prefills the edit form and echoes the row back in the update payload", async () => {
    renderDialog(EXISTING_ROW)

    expect(input(/mb costing code/i).value).toBe("MBH-2024-001")
    expect(input(/mgt name/i).value).toBe("Mgt One")
    expect(input(/denier/i).value).toBe("150.5")
    expect(input(/ldr rencana/i).value).toBe("1.25")
    expect(input(/ldr aktual/i).value).toBe("3.55")

    await submit()
    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1))

    const payload = updateMutateAsync.mock.calls[0][0]
    expect(payload.id).toBe("mbh-1")
    expect(payload.data).toMatchObject({
      mbhId: "mbh-1",
      mbhMbCosting: "MBH-2024-001",
      mbhLdrPrsn: 1.25,
      mbhRunLdrPct: 3.55,
      mbhMachineId: "mc-1",
      mbhIsActive: true,
    })
    // Update never carries the Oracle sys id or the bought-out flag.
    expect(payload.data).not.toHaveProperty("mbhOracleSysId")
    expect(payload.data).not.toHaveProperty("mbhIsBoughtout")
  })
})

// ============================================================================
// Immutability rules frozen into this path
// ============================================================================

describe("MBHeadFormDialogLegacy — immutability on edit", () => {
  it("locks MB Costing code and Oracle SYS ID once the row exists", () => {
    renderDialog(EXISTING_ROW)
    expect(input(/mb costing code/i)).toBeDisabled()
    expect(input(/oracle sys id/i)).toBeDisabled()
  })

  it("leaves them editable when creating", () => {
    renderDialog()
    expect(input(/mb costing code/i)).not.toBeDisabled()
    expect(input(/oracle sys id/i)).not.toBeDisabled()
  })

  it("shows only the Bought-out switch when creating", () => {
    renderDialog()
    const switches = screen.getAllByRole("switch")
    expect(switches).toHaveLength(1)
    expect(switches[0]).not.toBeDisabled()
  })

  it("adds the Active switch and freezes Bought-out when editing", () => {
    renderDialog(EXISTING_ROW)
    const switches = screen.getAllByRole("switch")
    expect(switches).toHaveLength(2)
    expect(switches[0]).toBeDisabled() // Bought-out — immutable after creation
    expect(switches[1]).not.toBeDisabled() // Active
  })
})
