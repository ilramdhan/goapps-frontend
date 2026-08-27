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
 * mbsCostRateMkt, mbsLdrIsFixed, mbsDozingIsFixed have none and must stay
 * untouched. The handler runs from the Select's onValueChange, not a
 * useEffect (sync setState-in-effect trips this repo's react-hooks lint rule).
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
const updateMutateAsync = vi.fn().mockResolvedValue({ base: { isSuccess: true } })

vi.mock("@/hooks/finance/use-mb-spin", () => ({
  useCreateMBSpin: () => ({ mutateAsync: createMutateAsync, isPending: false }),
  useUpdateMBSpin: () => ({ mutateAsync: updateMutateAsync, isPending: false }),
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
  it("fills mgt name, oracle sys id, mb costing, denier, filament, LDR fields and final product", async () => {
    renderDialog()
    await pickHead(/CPM-501/)

    expect(screen.getByLabelText(/mgt name/i)).toHaveValue("Head Validated")
    expect(screen.getByLabelText(/oracle sys id/i)).toHaveValue("ORA-1")
    expect(screen.getByLabelText(/mb costing/i)).toHaveValue("MBH-2024-001")
    expect(screen.getByLabelText(/^denier/i)).toHaveValue(150.5)
    expect(screen.getByLabelText(/filaments/i)).toHaveValue(48)
    expect(screen.getByLabelText(/ldr rencana/i)).toHaveValue(1.25)
    expect(screen.getByLabelText(/ldr aktual/i)).toHaveValue(3.55)
    expect(screen.getByLabelText(/final product/i)).toHaveValue("FP-1")
  })

  it("does NOT touch fields with no MBHead counterpart (CC Code, MB Rate MKT)", async () => {
    renderDialog()
    await pickHead(/CPM-501/)

    expect(screen.getByLabelText(/cc code/i)).toHaveValue("")
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
