/**
 * MBRecipeFormDialog — P6 rebuild.
 *
 * These tests pin the rules that are easy to "helpfully" break later:
 *
 *  1. K-4 (carried over from the pre-P6 suite): `mbhDozing` must never be sent as
 *     a fabricated 0. The column is retired (D30) and is not rendered, so any 0 in
 *     a payload was never typed by a user.
 *  2. VS Number is required FREE TEXT — literal "NA" and literal "0" must pass.
 *     177 production heads hold '0'. Any regex smuggled back in fails here.
 *  3. Number of Process has NO default (gate U-B open) — an untouched form omits
 *     the field rather than sending 'D'.
 *  4. Check Status is READ-ONLY and never appears in a payload (B11 / K-1).
 *  5. A NULL/absent check status renders as "not calculated", never as 0 or "-".
 *  6. ~~Additional shades are capped at 2.~~
 *     R14 (2026-08-26): the additional-shade editor was REMOVED from the modal at
 *     the user's request. What is pinned now is the data-safety rule that replaced
 *     it: the update payload still sends `replaceAdditionalShades: true`, so the
 *     shades of an existing recipe MUST still round-trip out of the form verbatim.
 *     If they ever came back as [], saving any legacy recipe would delete them.
 *
 * The Radix-based selects/combobox are stubbed with plain inputs: their popovers
 * need real pointer events that jsdom does not provide. Their own invariants (no
 * default option, master-sourced list) are covered in mb-recipe-fields.test.tsx.
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

// Stub only the Radix-driven pickers; MBCheckStatusDisplay and
// MBAdditionalShadesField stay REAL so their behaviour is actually asserted.
vi.mock("@/components/finance/mb-recipe/fields", async () => {
  const actual = await vi.importActual<typeof import("@/components/finance/mb-recipe/fields")>(
    "@/components/finance/mb-recipe/fields",
  )
  const stub = (testid: string, label: string) =>
    function Stub({
      value,
      onChange,
    }: {
      value: string | undefined
      onChange: (v: string) => void
      disabled?: boolean
    }) {
      return (
        <input
          data-testid={testid}
          aria-label={label}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    }
  return {
    ...actual,
    MBStatusSelect: stub("status-select", "Status"),
    MBNoOfProcessSelect: stub("no-of-process-select", "Number of Process"),
    MBCrossSectionSelect: stub("cross-section-select", "Cross Section"),
  }
})

vi.mock("@/components/finance/comboboxes/mb-final-product-combobox", () => ({
  MBFinalProductCombobox: ({
    value,
    onChange,
  }: {
    value: string | undefined
    onChange: (v: string) => void
  }) => (
    <input
      data-testid="final-product-combobox"
      aria-label="Final Product"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}))

// R10 (2026-08-26): ShadeCombobox replaced the free-text Shade Code / Shade
// Name inputs with a master-backed picker (its own popover/search behaviour
// is covered in shade-combobox.test.tsx). Stubbed here the same way as the
// other Radix-driven pickers above — two plain inputs so fillRequiredForCreate
// can still set code and name independently by label.
vi.mock("@/components/finance/shade/shade-combobox", () => ({
  ShadeCombobox: ({
    code,
    name,
    onSelect,
  }: {
    code: string | undefined
    name: string | undefined
    onSelect: (shadeCode: string, shadeName: string) => void
    disabled?: boolean
  }) => (
    <>
      <input
        data-testid="shade-code-input"
        aria-label="Shade Code"
        value={code ?? ""}
        onChange={(e) => onSelect(e.target.value, name ?? "")}
      />
      <input
        data-testid="shade-name-input"
        aria-label="Shade Name"
        value={name ?? ""}
        onChange={(e) => onSelect(code ?? "", e.target.value)}
      />
    </>
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
  mbhCheckStatus: "Current",
  mbhCheckStatusCalc: "Approved",
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
  shadeCode: "",
  shadeName: "Shade One",
  crossSection: "RND",
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
  mbhVsNumber: "71125",
  mbhNoOfProcess: undefined,
  additionalShades: [],
  mbhIsLocked: undefined,
  mbhUnlockRequestedAt: undefined,
  mbhUnlockRequestedBy: undefined,
} satisfies MBHead

/** A row whose `mbh_dozing` is NULL in the DB — the case the old chain corrupted. */
const ROW_WITH_NULL_DOZING: MBHead = { ...BASE_ROW }

/**
 * R14 — a stored recipe that already has additional shades. The editor for these
 * is gone from the UI, so this row is the only way the values can reach the form:
 * they must survive an untouched save.
 */
const ROW_WITH_SHADES: MBHead = {
  ...BASE_ROW,
  additionalShades: [
    { mbhsSeqNo: 1, mbhsShadeCode: "AS-1", mbhsShadeName: "Additional One" },
    { mbhsSeqNo: 2, mbhsShadeCode: "AS-2", mbhsShadeName: "" },
  ],
} as MBHead

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

/**
 * R7 (2026-08-26) — the submit button now exists ONLY on the last tab, so every
 * submit has to walk there first. Clicking the tab trigger directly is enough;
 * the Next button is exercised separately in the R7 describe block below.
 */
async function submit() {
  await userEvent.click(screen.getByTestId("status-tab"))
  await userEvent.click(screen.getByRole("button", { name: /^(create|update)$/i }))
}

function setField(label: RegExp, value: string) {
  fireEvent.change(input(label), { target: { value } })
}

/**
 * Fills every required field so a create submit succeeds. `vsNumber` is a
 * parameter because the free-text rule is exactly what several tests vary.
 */
function fillRequiredForCreate(vsNumber = "71125") {
  setField(/mb costing code/i, "MBH-NEW-1")
  setField(/mb name/i, "New MB")
  setField(/dev no/i, "DEV-9")
  setField(/vs number/i, vsNumber)
  setField(/^shade code/i, "SC-9")
  setField(/shade name/i, "Shade Nine")
  setField(/^denier/i, "150")
  setField(/filaments/i, "48")
  setField(/cross section/i, "RND")
  setField(/^ldr %/i, "3.55")
  setField(/final product/i, "FP-9")
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
    fillRequiredForCreate()
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
    expect(data.mbhDozing).not.toBe(0)
    expect(data.mbhDozing).toBeUndefined()
  })

  it("(c) round-trips an existing dozing value unchanged (fix does not clobber real data)", async () => {
    renderDialog(ROW_WITH_DOZING)
    await submit()

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1))
    expect(updateMutateAsync.mock.calls[0][0].data.mbhDozing).toBe(3.55)
  })

  it("still never renders a Dozing input (D30 stays in force; G5 label undecided)", () => {
    renderDialog(ROW_WITH_DOZING)
    expect(document.querySelector('[name="mbhDozing"]')).toBeNull()
    expect(screen.queryByLabelText(/dozing/i)).not.toBeInTheDocument()
  })
})

// ============================================================================
// VS Number — required, but FREE TEXT (OQ-17 closed: no format rule)
// ============================================================================

describe("MBRecipeFormDialog — VS Number is required free text", () => {
  it("accepts the literal \"NA\" — no format rule may reject it", async () => {
    renderDialog()
    fillRequiredForCreate("NA")
    await submit()

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1))
    expect(createMutateAsync.mock.calls[0][0].mbhVsNumber).toBe("NA")
  })

  it("accepts the literal \"0\" — 177 production heads hold exactly this", async () => {
    renderDialog()
    fillRequiredForCreate("0")
    await submit()

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1))
    expect(createMutateAsync.mock.calls[0][0].mbhVsNumber).toBe("0")
  })

  it("does not normalise or uppercase the entered value", async () => {
    renderDialog()
    fillRequiredForCreate("  vs-78545  ")
    await submit()

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1))
    expect(createMutateAsync.mock.calls[0][0].mbhVsNumber).toBe("  vs-78545  ")
  })

  it("still rejects a genuinely empty VS Number (required)", async () => {
    renderDialog()
    fillRequiredForCreate("")
    await submit()

    expect(await screen.findByText(/vs number is required/i)).toBeInTheDocument()
    expect(createMutateAsync).not.toHaveBeenCalled()
  })
})

// ============================================================================
// Number of Process — gate U-B: no default may be invented
// ============================================================================

describe("MBRecipeFormDialog — Number of Process has no default (U-B open)", () => {
  it("renders empty on a new recipe", () => {
    renderDialog()
    expect(input(/number of process/i).value).toBe("")
  })

  it("omits mbhNoOfProcess from the create payload when untouched — never 'D'", async () => {
    renderDialog()
    fillRequiredForCreate()
    await submit()

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1))
    const payload = createMutateAsync.mock.calls[0][0]
    expect(payload.mbhNoOfProcess).not.toBe("D")
    expect(payload.mbhNoOfProcess).toBeUndefined()
  })

  it("omits it on update too when the stored value is NULL", async () => {
    renderDialog(ROW_WITH_NULL_DOZING)
    await submit()

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1))
    const data = updateMutateAsync.mock.calls[0][0].data
    expect(data.mbhNoOfProcess).not.toBe("D")
    expect(data.mbhNoOfProcess).toBeUndefined()
  })

  it("sends the value verbatim once the user picks one", async () => {
    renderDialog()
    fillRequiredForCreate()
    setField(/number of process/i, "T")
    await submit()

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1))
    expect(createMutateAsync.mock.calls[0][0].mbhNoOfProcess).toBe("T")
  })
})

// ============================================================================
// Check Status — read-only derived value (B11 / K-1)
// ============================================================================

describe("MBRecipeFormDialog — Check Status is read-only", () => {
  it("renders no editable control for check status", () => {
    renderDialog(ROW_WITH_NULL_DOZING)
    // No registered form input, no textbox, no combobox — nothing to type into.
    expect(document.querySelector('[name="mbhCheckStatus"]')).toBeNull()
    expect(screen.queryByRole("textbox", { name: /check status/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("combobox", { name: /check status/i })).not.toBeInTheDocument()
    // The read-only display is what is shown instead.
    expect(screen.getByTestId("mb-check-status-display")).toHaveAttribute("aria-readonly", "true")
  })

  it("never sends mbhCheckStatus in an update payload", async () => {
    renderDialog(ROW_WITH_NULL_DOZING)
    await submit()

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1))
    // Backend automation owns this column; an FE copy could overwrite it.
    expect(updateMutateAsync.mock.calls[0][0].data).not.toHaveProperty("mbhCheckStatus")
  })

  it("never sends mbhCheckStatus in a create payload", async () => {
    renderDialog()
    fillRequiredForCreate()
    await submit()

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1))
    expect(createMutateAsync.mock.calls[0][0]).not.toHaveProperty("mbhCheckStatus")
  })

  it("shows the stored DERIVED value when the backend has one", () => {
    renderDialog(ROW_WITH_NULL_DOZING)
    const el = screen.getByTestId("mb-check-status-display")
    expect(el).toHaveAttribute("data-has-value", "true")
    // mbhCheckStatusCalc, ⛔ not the Oracle mbhCheckStatus ("Current") on the fixture.
    expect(el).toHaveTextContent("Approved")
  })

  it("renders NULL derived check status as 'not calculated' — never 0 and never '-'", () => {
    renderDialog({ ...BASE_ROW, mbhCheckStatusCalc: undefined } as unknown as MBHead)
    const el = screen.getByTestId("mb-check-status-display")
    expect(el).toHaveAttribute("data-has-value", "false")
    // 207 legacy rows have mbh_check_status_calc NULL and are never backfilled.
    expect(el.textContent).not.toMatch(/^0$/)
    expect(el.textContent).not.toMatch(/^-$/)
    expect(el).toHaveTextContent(/belum dihitung/i)
  })

  it("treats a blank string the same as NULL", () => {
    renderDialog({ ...BASE_ROW, mbhCheckStatusCalc: "   " } as unknown as MBHead)
    expect(screen.getByTestId("mb-check-status-display")).toHaveAttribute("data-has-value", "false")
  })
})

// ============================================================================
// Check Status — ~~legacy Oracle column, side by side (plan §11 item 42, option 2)~~
// ⭐ 2026-08-26 — user decision SUPERSEDES the side-by-side one: only ONE column is
// rendered, the application-calculated `mbh_check_status_calc`. The frozen Oracle
// column `mbh_check_status` is NOT rendered anywhere in the UI. It is still present
// in the database, the TypeScript type and the fetched payload — display-only change.
// ============================================================================

describe("MBRecipeFormDialog — the frozen Oracle check status is NOT rendered", () => {
  it("renders only the calculated column, never the Oracle one", () => {
    renderDialog(ROW_WITH_NULL_DOZING)

    const derived = screen.getByTestId("mb-check-status-display")
    expect(derived).toHaveTextContent("Approved")

    // The fixture carries mbhCheckStatus: "Current" — it must not reach the screen.
    expect(screen.queryByTestId("mb-check-status-oracle-display")).toBeNull()
    // ⚠ Scoped to the check-status label on purpose: an UNRELATED "Oracle SYS ID"
    // field lives on this same dialog, so a bare /oracle/i match would always hit.
    expect(screen.queryByText(/check status \(oracle\)/i)).toBeNull()
    expect(screen.queryByText("Current")).toBeNull()
  })

  it("keeps the remaining column read-only with no editable control", () => {
    renderDialog(ROW_WITH_NULL_DOZING)
    const derived = screen.getByTestId("mb-check-status-display")
    expect(derived).toHaveAttribute("aria-readonly", "true")
    expect(derived.querySelector("input")).toBeNull()
    expect(derived.querySelector("select")).toBeNull()
    expect(derived.querySelector("button")).toBeNull()
    expect(document.querySelector('[name="mbhCheckStatus"]')).toBeNull()
  })

  it("shows 'not calculated' — ⛔ never 0, never '-' — when the derived value is NULL, whatever Oracle said", () => {
    renderDialog({
      ...BASE_ROW,
      mbhCheckStatus: "Current",
      mbhCheckStatusCalc: undefined,
    } as unknown as MBHead)

    const derived = screen.getByTestId("mb-check-status-display")
    expect(derived).toHaveAttribute("data-has-value", "false")
    expect(derived.textContent).not.toMatch(/^0$/)
    expect(derived.textContent).not.toMatch(/^-$/)
    expect(derived).toHaveTextContent(/belum dihitung/i)
    // The frozen Oracle value must NOT be used as a fallback for the missing one.
    expect(screen.queryByText("Current")).toBeNull()
  })

  it("still never sends mbhCheckStatus, even though the payload carries it", () => {
    renderDialog({ ...BASE_ROW, mbhCheckStatus: "Current" } as unknown as MBHead)
    expect(document.querySelector('[name="mbhCheckStatus"]')).toBeNull()
  })
})

// ============================================================================
// Additional shades — max 2, code required, name optional
// ============================================================================

describe("MBRecipeFormDialog — additional shades (R14: UI removed, data preserved)", () => {
  it("renders no additional-shade editor anywhere in the Spesifikasi tab", async () => {
    renderDialog(ROW_WITH_SHADES)
    await userEvent.click(screen.getByTestId("spesifikasi-tab"))

    // The Add button and every numbered row input are gone.
    expect(screen.queryByTestId("add-additional-shade")).toBeNull()
    expect(screen.queryByLabelText(/additional shade 1 code/i)).toBeNull()
    expect(screen.queryByLabelText(/additional shade 1 name/i)).toBeNull()
    expect(screen.queryByLabelText(/additional shade 2 code/i)).toBeNull()
    // ...and so is the section heading. Narrow on purpose: /shade/i alone would
    // also match the still-present "Shade Code" / "Shade Name" fields.
    expect(screen.queryByText(/additional shades/i)).toBeNull()
  })

  it("🔴 still submits the stored shades VERBATIM on an untouched update", async () => {
    // This is the data-loss guard. replaceAdditionalShades is true, so whatever
    // this array holds becomes the stored state. An empty array here would wipe
    // AS-1/AS-2 from the database the moment a user pressed Update.
    renderDialog(ROW_WITH_SHADES)
    await submit()

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1))
    const data = updateMutateAsync.mock.calls[0][0].data
    expect(data.replaceAdditionalShades).toBe(true)
    expect(data.additionalShades).toEqual([
      { mbhsSeqNo: 1, mbhsShadeCode: "AS-1", mbhsShadeName: "Additional One" },
      // A blank stored name stays absent rather than becoming "" (D13).
      { mbhsSeqNo: 2, mbhsShadeCode: "AS-2", mbhsShadeName: undefined },
    ])
  })

  it("does not invent shades for a recipe that has none", async () => {
    renderDialog(ROW_WITH_NULL_DOZING)
    await submit()

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1))
    expect(updateMutateAsync.mock.calls[0][0].data.additionalShades).toEqual([])
  })

  it("sets replaceAdditionalShades so the submitted array is authoritative", async () => {
    renderDialog(ROW_WITH_NULL_DOZING)
    await submit()

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1))
    // Without this flag the backend leaves stored shades alone. It is kept AFTER
    // R14 precisely because the form no longer edits shades — see the round-trip
    // test above for why that is only safe while the values are echoed back.
    expect(updateMutateAsync.mock.calls[0][0].data.replaceAdditionalShades).toBe(true)
  })

  it("carries no additional shades on a fresh create", async () => {
    renderDialog()
    fillRequiredForCreate()
    await submit()

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1))
    expect(createMutateAsync.mock.calls[0][0].additionalShades).toEqual([])
  })
})

// ============================================================================
// Required fields + cross-tab error visibility
// ============================================================================

describe("MBRecipeFormDialog — required fields and tab error dots", () => {
  it("refuses to submit an empty create and flags every tab that holds an error", async () => {
    renderDialog()
    await submit()

    expect(await screen.findByText(/mb costing code is required/i)).toBeInTheDocument()
    expect(createMutateAsync).not.toHaveBeenCalled()
    // Errors live on tabs the user has not opened — the dots are what reveals them.
    expect(screen.getByTestId("tab-error-dot-identitas")).toBeInTheDocument()
    expect(screen.getByTestId("tab-error-dot-spesifikasi")).toBeInTheDocument()
    expect(screen.getByTestId("tab-error-dot-status")).toBeInTheDocument()
  })

  it("shows no dot on a tab whose fields are all valid", async () => {
    renderDialog()
    fillRequiredForCreate()
    // Blank out one Identitas field only.
    setField(/dev no/i, "")
    await submit()

    expect(await screen.findByText(/dev no is required/i)).toBeInTheDocument()
    expect(screen.getByTestId("tab-error-dot-identitas")).toBeInTheDocument()
    expect(screen.queryByTestId("tab-error-dot-spesifikasi")).not.toBeInTheDocument()
    expect(screen.queryByTestId("tab-error-dot-status")).not.toBeInTheDocument()
  })

  it("keeps the LDR fields intact on update", async () => {
    renderDialog(ROW_WITH_NULL_DOZING)
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

// ============================================================================
// R7 — tab wizard: Back/Next, and Create only on the last tab
// ============================================================================

describe("MBRecipeFormDialog — R7 tab wizard", () => {
  it("shows no submit button on the first tab, only Next", () => {
    renderDialog()
    expect(screen.queryByRole("button", { name: /^create$/i })).toBeNull()
    expect(screen.getByTestId("tab-next")).toBeTruthy()
    expect(screen.queryByTestId("tab-back")).toBeNull()
  })

  it("walks forward with Next and reveals Create only on the third tab", async () => {
    renderDialog()
    await userEvent.click(screen.getByTestId("tab-next"))
    expect(screen.queryByRole("button", { name: /^create$/i })).toBeNull()
    expect(screen.getByTestId("tab-back")).toBeTruthy()

    await userEvent.click(screen.getByTestId("tab-next"))
    expect(screen.getByRole("button", { name: /^create$/i })).toBeTruthy()
    expect(screen.queryByTestId("tab-next")).toBeNull()
  })

  it("walks back with Back", async () => {
    renderDialog()
    await userEvent.click(screen.getByTestId("tab-next"))
    await userEvent.click(screen.getByTestId("tab-next"))
    await userEvent.click(screen.getByTestId("tab-back"))
    expect(screen.queryByRole("button", { name: /^create$/i })).toBeNull()
    expect(screen.getByTestId("tab-next")).toBeTruthy()
  })

  it("Next does not validate — an empty required field must not block the wizard", async () => {
    renderDialog()
    await userEvent.click(screen.getByTestId("tab-next"))
    await userEvent.click(screen.getByTestId("tab-next"))
    expect(screen.getByRole("button", { name: /^create$/i })).toBeTruthy()
    expect(createMutateAsync).not.toHaveBeenCalled()
  })

  it("labels the last-tab button Update when editing", async () => {
    renderDialog(BASE_ROW)
    await userEvent.click(screen.getByTestId("status-tab"))
    expect(screen.getByRole("button", { name: /^update$/i })).toBeTruthy()
  })
})
