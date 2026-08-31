/**
 * MBSpinFormDialog — R2/R3.
 *
 * R2: the create-flow picker must read as "Master Product Type MB" (label sourced
 * from cost_product_master via each head's costProductId), never "MB Head" — but
 * the value actually stored on submit stays the real mbs_mbh_id
 * (yarn_master.proto:1832). A head with no linked cost product yet (DRAFT, never
 * validated — mbh_cost_product_id is NULL until the DRAFT->VALIDATED transition)
 * must still be selectable, just labelled with its own head name as a fallback.
 *
 * R3: picking an option auto-fills the fields below from that head's own data.
 * Only fields with an unambiguous 1:1 MBHead counterpart are copied — mbsCc,
 * mbsCostRateMkt have none and must stay untouched. The handler runs from the
 * Select's onValueChange, not a useEffect (sync setState-in-effect trips this
 * repo's react-hooks lint rule).
 *
 * ⭐ DIPERBARUI 2026-08-26 — mbsStatus is no longer in the "no counterpart" list:
 * per user decision, MB Spin status now follows the selected MB Recipe's (MB
 * Head's) mbhStatus and the Status field is read-only in the UI (cannot be
 * typed manually). See handleHeadSelect() in mb-spin-form-dialog.tsx.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// jsdom doesn't implement these — Radix's Select relies on them for pointer
// interactions during open/close.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

// ─── Module mocks ─────────────────────────────────────────────────────────────

const createMutateAsync = vi.fn().mockResolvedValue({ base: { isSuccess: true } })
// ⭐ DIPERBARUI 2026-08-31 (P7-T5) — the form dialog now calls
// useUpdateMBSpinWithCascade() (returns `{ spin, impact }`) instead of the
// generic useUpdateMBSpin() factory hook, so it can surface the cascade
// result. Default resolved value carries an empty impact (the common case —
// no skipped children, nothing affected) so existing tests that don't care
// about the cascade summary keep behaving as before (dialog closes).
const EMPTY_IMPACT = {
  skipped: [],
  skippedCount: 0,
  impactPreview: [],
  impactTotalAffected: 0,
  impactTotalLocked: 0,
  impactTruncated: false,
}
const updateMutateAsync = vi.fn().mockResolvedValue({ spin: { mbsId: "updated" }, impact: EMPTY_IMPACT })

vi.mock("@/hooks/finance/use-mb-spin", () => ({
  useCreateMBSpin: () => ({ mutateAsync: createMutateAsync, isPending: false }),
  useUpdateMBSpinWithCascade: () => ({ mutateAsync: updateMutateAsync, isPending: false }),
}))

const VALIDATED_HEAD = {
  mbhId: "head-validated",
  mbhOracleSysId: "ORA-1",
  mbhMbCosting: "MBH-2024-001",
  mbhMgtName: "Head Validated",
  mbhDenier: 150.5,
  mbhFilament: 48,
  mbhIsActive: true,
  mbhLdrPrsn: 1.25,
  mbhRunLdrPct: 3.55,
  mbhFinalProduct: "FP-1",
  mbhStatus: "Spinning",
  costProductId: 501,
}

const DRAFT_HEAD = {
  mbhId: "head-draft",
  mbhOracleSysId: "ORA-2",
  mbhMbCosting: "MBH-2024-002",
  mbhMgtName: "Head Draft",
  mbhDenier: 100,
  mbhFilament: 24,
  mbhIsActive: true,
  mbhLdrPrsn: 2,
  mbhRunLdrPct: 4,
  mbhFinalProduct: "FP-2",
  mbhStatus: "R and D",
  costProductId: 0, // NULL in DB — never validated, no cost product generated yet
}

vi.mock("@/hooks/finance/use-mb-head", () => ({
  useMBHeads: () => ({
    data: { data: [VALIDATED_HEAD, DRAFT_HEAD], totalItems: "2" },
    isLoading: false,
  }),
}))

vi.mock("@/hooks/finance/use-cost-product-master", () => ({
  useCostProductMasters: () => ({
    data: {
      items: [
        { productSysId: 501, productCode: "CPM-501", productName: "MB Black Master" },
      ],
    },
    isLoading: false,
  }),
}))

// ─── Import under test (after the mocks are registered) ───────────────────────

import { MBSpinFormDialog } from "@/components/finance/mb-spin/mb-spin-form-dialog"

function renderDialog() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MBSpinFormDialog open onOpenChange={() => {}} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

async function pickHead(optionName: RegExp) {
  await userEvent.click(screen.getByRole("combobox", { name: /master product type mb/i }))
  await userEvent.click(await screen.findByRole("option", { name: optionName }))
}

describe("MBSpinFormDialog — R2: picker shows Master Product Type MB", () => {
  it("labels the field 'Master Product Type MB', not 'MB Head'", () => {
    renderDialog()
    expect(screen.getByRole("combobox", { name: /master product type mb/i })).toBeInTheDocument()
    expect(screen.queryByText(/^mb head$/i)).not.toBeInTheDocument()
  })

  it("shows the linked cost-product-master name/code for a validated head", async () => {
    renderDialog()
    await userEvent.click(screen.getByRole("combobox", { name: /master product type mb/i }))
    expect(await screen.findByRole("option", { name: /CPM-501.*MB Black Master/ })).toBeInTheDocument()
  })

  it("falls back to the head's own label when it has no linked product yet (DRAFT)", async () => {
    renderDialog()
    await userEvent.click(screen.getByRole("combobox", { name: /master product type mb/i }))
    expect(await screen.findByRole("option", { name: /MBH-2024-002.*Head Draft/ })).toBeInTheDocument()
  })

  it("stores the real mbs_mbh_id on submit even though the option displayed a product name", async () => {
    renderDialog()
    await pickHead(/CPM-501/)
    await userEvent.click(screen.getByRole("button", { name: /^create$/i }))

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1))
    expect(createMutateAsync.mock.calls[0][0].mbhId).toBe("head-validated")
  })
})

describe("MBSpinFormDialog — R3: selecting a head auto-fills the fields below", () => {
  // ⭐ DIPERBARUI 2026-08-31 (P4-T2) — the "LDR Plan (%)"/"LDR Actual (%)" assertions
  // that used to live in this test were removed: those two field blocks no longer
  // render in the form (see mb-spin-form-dialog.tsx, P4-T2 comment). handleHeadSelect()
  // still copies mbhLdrPrsn/mbhRunLdrPct into the (now-hidden) mbsLdrPrsn/mbsRunLdrPct
  // form state so the unchanged values still round-trip on submit — see the
  // "resubmits the head-copied LDR values even though the fields are hidden" test below.
  it("fills mgt name, oracle sys id, mb costing, denier, filament and final product", async () => {
    renderDialog()
    await pickHead(/CPM-501/)

    expect(screen.getByLabelText(/mgt name/i)).toHaveValue("Head Validated")
    expect(screen.getByLabelText(/oracle sys id/i)).toHaveValue("ORA-1")
    expect(screen.getByLabelText(/mb costing/i)).toHaveValue("MBH-2024-001")
    expect(screen.getByLabelText(/^denier/i)).toHaveValue(150.5)
    expect(screen.getByLabelText(/filaments/i)).toHaveValue(48)
    expect(screen.getByLabelText(/final product/i)).toHaveValue("FP-1")
  })

  it("does NOT touch fields with no MBHead counterpart (Shade Code, MB Rate MKT)", async () => {
    renderDialog()
    await pickHead(/CPM-501/)

    expect(screen.getByLabelText(/shade code/i)).toHaveValue("")
    expect(screen.getByLabelText(/mb rate mkt/i)).toHaveValue(null)
  })

  it("re-fills when the user switches to a different head", async () => {
    renderDialog()
    await pickHead(/CPM-501/)
    expect(screen.getByLabelText(/mgt name/i)).toHaveValue("Head Validated")

    await pickHead(/Head Draft/)
    expect(screen.getByLabelText(/mgt name/i)).toHaveValue("Head Draft")
    expect(screen.getByLabelText(/^denier/i)).toHaveValue(100)
  })

  it("submits the auto-filled values verbatim on create", async () => {
    renderDialog()
    await pickHead(/CPM-501/)
    await userEvent.click(screen.getByRole("button", { name: /^create$/i }))

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1))
    const payload = createMutateAsync.mock.calls[0][0]
    expect(payload.mbsMgtName).toBe("Head Validated")
    expect(payload.mbsOracleSysId).toBe("ORA-1")
    expect(payload.mbsDenier).toBe(150.5)
    expect(payload.mbsFilament).toBe(48)
    expect(payload.mbsFinalProduct).toBe("FP-1")
  })
})

// ⭐ DIPERBARUI 2026-08-26 — new coverage for the "status follows MB Recipe" decision:
// selecting a head auto-fills mbsStatus from head.mbhStatus, and the Status field is
// read-only so the user cannot type a value manually.
describe("MBSpinFormDialog — status field follows the selected MB Recipe (2026-08-26)", () => {
  it("auto-fills Status from the selected head's mbhStatus", async () => {
    renderDialog()
    await pickHead(/CPM-501/)

    expect(screen.getByLabelText(/^status/i)).toHaveValue("Spinning")
  })

  it("re-fills Status when switching to a different head", async () => {
    renderDialog()
    await pickHead(/CPM-501/)
    expect(screen.getByLabelText(/^status/i)).toHaveValue("Spinning")

    await pickHead(/Head Draft/)
    expect(screen.getByLabelText(/^status/i)).toHaveValue("R and D")
  })

  it("renders the Status field as read-only/disabled so it cannot be typed manually", async () => {
    renderDialog()
    await pickHead(/CPM-501/)

    const statusInput = screen.getByLabelText(/^status/i)
    expect(statusInput).toBeDisabled()
    await userEvent.type(statusInput, "hand-typed value")
    expect(statusInput).toHaveValue("Spinning")
  })

  it("submits the auto-filled status verbatim on create", async () => {
    renderDialog()
    await pickHead(/CPM-501/)
    await userEvent.click(screen.getByRole("button", { name: /^create$/i }))

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1))
    expect(createMutateAsync.mock.calls[0][0].mbsStatus).toBe("Spinning")
  })
})

// ⭐ DITAMBAHKAN 2026-08-31 (P4-T1) — Shade Code relabel + new Shade Name readonly field.
describe("MBSpinFormDialog — P4-T1: Shade Code label + Shade Name field", () => {
  it("labels the mbsCc field 'Shade Code', not 'CC Code'", () => {
    renderDialog()
    expect(screen.getByLabelText(/shade code/i)).toBeInTheDocument()
    expect(screen.queryByText(/^cc code$/i)).not.toBeInTheDocument()
  })

  it("shows a readonly, disabled Shade Name field populated from mbsShadeName for an existing spin", () => {
    const spin = {
      mbsId: "11111111-1111-1111-1111-111111111111",
      mbsMbhId: "head-validated",
      mbsMgtName: "Sample spin",
      mbsCc: "CC-001",
      mbsShadeName: "Jet Black",
      mbsIsActive: true,
    } as never
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <MBSpinFormDialog open onOpenChange={() => {}} mbSpin={spin} />
      </QueryClientProvider>,
    )

    const shadeNameInput = screen.getByLabelText(/shade name/i)
    expect(shadeNameInput).toHaveValue("Jet Black")
    expect(shadeNameInput).toBeDisabled()
    expect(shadeNameInput).toHaveAttribute("readonly")
  })
})

// ⭐ DITAMBAHKAN 2026-08-31 (P4-T2) — the two legacy LDR field blocks ("LDR Plan (%)",
// "LDR Actual (%)") no longer render, but mbs_ldr_prsn/mbs_run_ldr_pct still round-trip
// silently through the form so save-time payloads never null them out.
describe("MBSpinFormDialog — P4-T2: legacy LDR fields no longer render", () => {
  it("does not render 'LDR Plan (%)' or 'LDR Actual (%)' inputs", async () => {
    renderDialog()
    await pickHead(/CPM-501/)

    expect(screen.queryByLabelText(/ldr plan/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/ldr actual/i)).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /calculator/i })).not.toBeInTheDocument()
  })

  it("still resubmits the head-copied LDR values on create even though the fields are hidden", async () => {
    renderDialog()
    await pickHead(/CPM-501/)
    await userEvent.click(screen.getByRole("button", { name: /^create$/i }))

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1))
    const payload = createMutateAsync.mock.calls[0][0]
    expect(payload.mbsLdrPrsn).toBe(1.25)
    expect(payload.mbsRunLdrPct).toBe(3.55)
  })

  it("still resubmits an existing spin's unchanged LDR values on update", async () => {
    const spin = {
      mbsId: "11111111-1111-1111-1111-111111111111",
      mbsMbhId: "head-validated",
      mbsMgtName: "Sample spin",
      mbsLdrPrsn: 1.25,
      mbsRunLdrPct: 3.55,
      mbsIsActive: true,
    } as never
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <MBSpinFormDialog open onOpenChange={() => {}} mbSpin={spin} />
      </QueryClientProvider>,
    )

    await userEvent.click(screen.getByRole("button", { name: /^update$/i }))

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1))
    const payload = updateMutateAsync.mock.calls[0][0]
    expect(payload.mbsLdrPrsn).toBe(1.25)
    expect(payload.mbsRunLdrPct).toBe(3.55)
  })
})

// ⭐ DITAMBAHKAN 2026-08-31 (P7-T2) — "single LDR block" acceptance criteria: a Status LDR
// badge (NOT_CALCULATED/CALCULATED/ACTUAL), a readonly Calculated (%), an Adjustment (%)
// input (may be negative, locked while mbsLdrIsActual is true), a readonly LDR (%) =
// calculated + adjustment, and a "Kunci sebagai Actual" toggle that is a SEPARATE control
// from the older mbsDozingIsFixed/mbsLdrIsFixed flag (P12B — removed from this form
// entirely, see the comment near line 634 of mb-spin-form-dialog.tsx).
function baseSpin(overrides: Record<string, unknown> = {}) {
  return {
    mbsId: "11111111-1111-1111-1111-111111111111",
    mbsMbhId: "head-validated",
    mbsMgtName: "Sample spin",
    mbsIsActive: true,
    ...overrides,
  } as never
}

function renderWithSpin(spin: unknown) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <MBSpinFormDialog open onOpenChange={() => {}} mbSpin={spin as never} />
    </QueryClientProvider>,
  )
}

describe("MBSpinFormDialog — P7-T2: LDR block badge + adjustment + effective LDR", () => {
  it("renders the NOT_CALCULATED badge when mbsLdrType is NOT_CALCULATED", () => {
    renderWithSpin(baseSpin({ mbsLdrType: "NOT_CALCULATED", mbsLdrIsActual: false }))
    expect(screen.getByText("Belum Dihitung")).toBeInTheDocument()
  })

  it("renders the CALCULATED badge when mbsLdrType is CALCULATED", () => {
    renderWithSpin(
      baseSpin({ mbsLdrType: "CALCULATED", mbsLdrIsActual: false, mbsLdrCalculatedPct: 3.5 }),
    )
    expect(screen.getByText("Terhitung Otomatis")).toBeInTheDocument()
  })

  it("renders the ACTUAL badge when mbsLdrType is ACTUAL", () => {
    renderWithSpin(
      baseSpin({ mbsLdrType: "ACTUAL", mbsLdrIsActual: true, mbsLdrCalculatedPct: 3.5 }),
    )
    expect(screen.getByText("Terkunci (Aktual)")).toBeInTheDocument()
  })

  it("shows the readonly system-calculated LDR, distinct from LDR Efektif once an adjustment is set", () => {
    renderWithSpin(
      baseSpin({ mbsLdrType: "CALCULATED", mbsLdrCalculatedPct: 3.5, mbsLdrAdjustmentPct: 0.1 }),
    )
    expect(screen.getByText("3.5%")).toBeInTheDocument()
    expect(screen.getByText("3.6%")).toBeInTheDocument()
  })

  it("computes LDR Efektif as calculated + adjustment", () => {
    renderWithSpin(
      baseSpin({ mbsLdrType: "CALCULATED", mbsLdrCalculatedPct: 3.5, mbsLdrAdjustmentPct: 0.25 }),
    )
    // "LDR Terhitung (Sistem)" shows 3.5%, "LDR Efektif" shows 3.5 + 0.25 = 3.75%
    expect(screen.getByText("3.75%")).toBeInTheDocument()
  })

  it("updates LDR Efektif live as the user edits the Adjustment input", async () => {
    renderWithSpin(baseSpin({ mbsLdrType: "CALCULATED", mbsLdrCalculatedPct: 3.5, mbsLdrAdjustmentPct: 0 }))
    const adjustmentInput = screen.getByLabelText(/penyesuaian ldr/i)
    await userEvent.clear(adjustmentInput)
    await userEvent.type(adjustmentInput, "-0.5")
    expect(await screen.findByText("3%")).toBeInTheDocument()
  })

  it("disables the Adjustment input while mbsLdrIsActual is true (backend returns ErrLDRLockedActual otherwise)", () => {
    renderWithSpin(
      baseSpin({ mbsLdrType: "ACTUAL", mbsLdrIsActual: true, mbsLdrCalculatedPct: 3.5, mbsLdrAdjustmentPct: 0 }),
    )
    expect(screen.getByLabelText(/penyesuaian ldr/i)).toBeDisabled()
  })

  it("re-enables the Adjustment input once the lock toggle is switched off", async () => {
    renderWithSpin(
      baseSpin({ mbsLdrType: "ACTUAL", mbsLdrIsActual: true, mbsLdrCalculatedPct: 3.5, mbsLdrAdjustmentPct: 0 }),
    )
    const lockToggle = screen.getByRole("switch", { name: /kunci ldr ke nilai aktual/i })
    expect(lockToggle).toHaveAttribute("aria-checked", "true")
    expect(screen.getByLabelText(/penyesuaian ldr/i)).toBeDisabled()

    await userEvent.click(lockToggle)

    expect(lockToggle).toHaveAttribute("aria-checked", "false")
    expect(screen.getByLabelText(/penyesuaian ldr/i)).toBeEnabled()
  })

  it("leaves the Adjustment input enabled when the spin is not currently locked, even before any toggle interaction", () => {
    renderWithSpin(
      baseSpin({ mbsLdrType: "CALCULATED", mbsLdrIsActual: false, mbsLdrCalculatedPct: 3.5, mbsLdrAdjustmentPct: 0 }),
    )
    const lockToggle = screen.getByRole("switch", { name: /kunci ldr ke nilai aktual/i })
    expect(lockToggle).toHaveAttribute("aria-checked", "false")
    expect(screen.getByLabelText(/penyesuaian ldr/i)).toBeEnabled()
  })

  it("submits mbsLdrLockActual and mbsLdrAdjustmentPct on update, independent of mbsIsActive", async () => {
    renderWithSpin(
      baseSpin({ mbsLdrType: "CALCULATED", mbsLdrIsActual: false, mbsLdrCalculatedPct: 3.5, mbsLdrAdjustmentPct: 0 }),
    )
    const lockToggle = screen.getByRole("switch", { name: /kunci ldr ke nilai aktual/i })
    await userEvent.click(lockToggle)

    const adjustmentInput = screen.getByLabelText(/penyesuaian ldr/i)
    await userEvent.clear(adjustmentInput)
    await userEvent.type(adjustmentInput, "1.5")

    await userEvent.click(screen.getByRole("button", { name: /^update$/i }))

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1))
    const payload = updateMutateAsync.mock.calls[0][0]
    expect(payload.mbsLdrLockActual).toBe(true)
    expect(payload.mbsLdrAdjustmentPct).toBe(1.5)
  })

  it("the 'Kunci sebagai Actual' toggle is a distinct control from mbsDozingIsFixed/mbsLdrIsFixed — the payload never sends those legacy flags", async () => {
    renderWithSpin(
      baseSpin({
        mbsLdrType: "CALCULATED",
        mbsLdrIsActual: false,
        mbsLdrCalculatedPct: 3.5,
        mbsLdrAdjustmentPct: 0,
        // Legacy P12B flags present on the record — must have zero bearing on the
        // lock toggle and must never be echoed back in the update payload.
        mbsLdrIsFixed: true,
        mbsDozingIsFixed: false,
      }),
    )
    await userEvent.click(screen.getByRole("button", { name: /^update$/i }))

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1))
    const payload = updateMutateAsync.mock.calls[0][0]
    expect(payload).not.toHaveProperty("mbsLdrIsFixed")
    expect(payload).not.toHaveProperty("mbsDozingIsFixed")
    expect(payload.mbsLdrLockActual).toBe(false)
  })

  it("does not render the LDR block for a brand-new (not-yet-created) spin", () => {
    renderDialog()
    expect(screen.queryByText(/status ldr/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/penyesuaian ldr/i)).not.toBeInTheDocument()
  })
})

// ⭐ DITAMBAHKAN 2026-08-31 (P7-T5) — UpdateMBSpin now surfaces the same
// child-recalc cascade result (skip/impact) as DuplicateMBSpin (P7-T6). The
// dialog shows a brief Alert/Badge summary when the cascade actually skipped
// a child or would affect a product; the common case (nothing to report)
// keeps closing the dialog immediately, unchanged from before.
describe("MBSpinFormDialog — P7-T5: update cascade/impact summary", () => {
  it("renders the cascade summary and keeps the dialog open when the update response carries skipped/impact data", async () => {
    updateMutateAsync.mockResolvedValueOnce({
      spin: { mbsId: "11111111-1111-1111-1111-111111111111" },
      impact: {
        skipped: [{ mbsId: "child-1", mbsMgtName: "Child Spin 1", mbsStatus: "Spinning", reason: "locked as Actual" }],
        skippedCount: 1,
        impactPreview: [{ cpmProductCode: "P-1", cpmProductName: "Product 1" }],
        impactTotalAffected: 3,
        impactTotalLocked: 1,
        impactTruncated: false,
      },
    })
    const onOpenChange = vi.fn()
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <MBSpinFormDialog open onOpenChange={onOpenChange} mbSpin={baseSpin()} />
      </QueryClientProvider>,
    )

    await userEvent.click(screen.getByRole("button", { name: /^update$/i }))

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1))
    expect(await screen.findByTestId("update-cascade-summary")).toBeInTheDocument()
    expect(screen.getByText(/3 product\(s\) affected/i)).toBeInTheDocument()
    expect(screen.getByText(/1 locked/i)).toBeInTheDocument()
    expect(screen.getByText(/1 child spin\(s\) skipped/i)).toBeInTheDocument()
    expect(screen.getByText(/Child Spin 1/)).toBeInTheDocument()

    // Dialog stays open to show the summary — onOpenChange(false) is not
    // called until the user clicks "Done".
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    await userEvent.click(screen.getByRole("button", { name: /^done$/i }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("renders nothing extra and closes the dialog when the update response carries no cascade data (common case)", async () => {
    // Default mock resolves with EMPTY_IMPACT (see module mock above).
    const onOpenChange = vi.fn()
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <MBSpinFormDialog open onOpenChange={onOpenChange} mbSpin={baseSpin()} />
      </QueryClientProvider>,
    )

    await userEvent.click(screen.getByRole("button", { name: /^update$/i }))

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(screen.queryByTestId("update-cascade-summary")).not.toBeInTheDocument()
  })
})
