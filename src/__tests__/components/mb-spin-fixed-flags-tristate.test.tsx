/**
 * P12B fix/actual markers — checkbox UI removed.
 *
 * mbsLdrIsFixed / mbsDozingIsFixed used to be rendered as tri-state checkboxes
 * in this form. Per user decision the checkboxes were removed from the UI
 * entirely; the form now simply never sends these fields in the create/update
 * payload. The backend (mbspin/entity.go IsFixedLDR/IsFixedDozing) treats an
 * absent/nil value as FIXED=true by default, so omitting the fields keeps the
 * exact same safe behavior the tri-state checkbox used to guarantee, without
 * any backend change.
 *
 * These tests verify: (a) the checkboxes/labels are gone from the rendered
 * form, and (b) mbsLdrIsFixed/mbsDozingIsFixed are never present in the
 * create/update payload, regardless of whatever value the underlying record
 * happens to carry.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// jsdom doesn't implement these — Radix's Select relies on them for pointer
// interactions during open/close.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

const createMutateAsync = vi.fn().mockResolvedValue({})
const updateMutateAsync = vi.fn().mockResolvedValue({})

vi.mock("@/hooks/finance/use-mb-dozing", () => ({
  usePreviewDozingImpact: () => ({
    mutate: vi.fn(),
    data: undefined,
    isPending: false,
    isError: false,
    error: null,
  }),
  // R81/R1: the form now also renders MBDozingCalculatorDialog (the LDR
  // calculator button next to "LDR Aktual (%)"), which calls this hook
  // unconditionally on every render regardless of its own `open` prop.
  useCalculateDozing: () => ({
    mutateAsync: vi.fn(),
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
  }),
}))

vi.mock("@/hooks/finance/use-mb-spin", () => ({
  useCreateMBSpin: () => ({ mutateAsync: createMutateAsync, isPending: false }),
  useUpdateMBSpin: () => ({ mutateAsync: updateMutateAsync, isPending: false }),
}))

// R81/Task-1: mbsMgtName (and its head-derived siblings) is now read-only in the
// create flow, filled only via selecting a Master Product Type MB option. The
// "on create" test below needs a real head to pick from the dropdown instead of
// typing into the (now disabled) Mgt Name input.
const NEW_SPIN_HEAD = {
  mbhId: "22222222-2222-2222-2222-222222222222",
  mbhOracleSysId: "ORA-NEW",
  mbhMbCosting: "MBH-NEW",
  mbhMgtName: "New spin",
  mbhDenier: 150,
  mbhFilament: 48,
  mbhIsActive: true,
  mbhLdrPrsn: 1,
  mbhRunLdrPct: 1,
  mbhFinalProduct: "FP-NEW",
  mbhStatus: "R and D",
  costProductId: 0,
}

vi.mock("@/hooks/finance/use-mb-head", () => ({
  useMBHeads: () => ({ data: { data: [NEW_SPIN_HEAD], totalItems: "1" }, isLoading: false }),
}))

// R2: the form now also looks up cost-product-masters to label the head picker
// as "Master Product Type MB". Stub it so the component doesn't need a real
// QueryClientProvider in these tests.
vi.mock("@/hooks/finance/use-cost-product-master", () => ({
  useCostProductMasters: () => ({ data: undefined, isLoading: false }),
}))

import { MBSpinFormDialog } from "@/components/finance/mb-spin/mb-spin-form-dialog"

/** A legacy spin row: the DB columns are NULL, so the normalizer leaves them undefined. */
const unmarkedSpin = {
  mbsId: "11111111-1111-1111-1111-111111111111",
  mbsMbhId: "22222222-2222-2222-2222-222222222222",
  mbsMgtName: "Legacy spin",
  mbsDenier: 150,
  mbsFilament: 48,
  mbsRunLdrPct: 3.55,
  mbsIsActive: true,
} as never

const markedSpin = {
  ...(unmarkedSpin as object),
  mbsLdrIsFixed: true,
  mbsDozingIsFixed: false,
} as never

async function submitUpdate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /^Update$/i }))
  await waitFor(() => expect(updateMutateAsync).toHaveBeenCalled())
  return updateMutateAsync.mock.calls[0][0].data as Record<string, unknown>
}

beforeEach(() => {
  createMutateAsync.mockClear()
  updateMutateAsync.mockClear()
})

describe("MBSpinFormDialog — LDR/Dozing fix markers checkbox removed", () => {
  it("no longer renders the LDR/Dozing 'nilai FIX' checkboxes", () => {
    render(<MBSpinFormDialog open onOpenChange={() => {}} mbSpin={markedSpin} />)
    expect(screen.queryByLabelText(/LDR nilai FIX/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Dozing nilai FIX/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/LDR nilai FIX/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Dozing nilai FIX/i)).not.toBeInTheDocument()
  })

  it("omits mbsLdrIsFixed/mbsDozingIsFixed on update even for a record that had them set", async () => {
    const user = userEvent.setup()
    render(<MBSpinFormDialog open onOpenChange={() => {}} mbSpin={markedSpin} />)

    const payload = await submitUpdate(user)

    expect(payload.mbsLdrIsFixed).toBeUndefined()
    expect(payload.mbsDozingIsFixed).toBeUndefined()
    // The BFF serializes with JSON.stringify, which drops undefined keys entirely.
    // This is the wire-level proof the backend never receives these fields, and
    // therefore falls back to its own FIXED=true default (entity.go:148-156).
    const wire = JSON.parse(JSON.stringify(payload))
    expect(Object.keys(wire)).not.toContain("mbsLdrIsFixed")
    expect(Object.keys(wire)).not.toContain("mbsDozingIsFixed")
  })

  it("omits mbsLdrIsFixed/mbsDozingIsFixed on update for an unmarked (legacy NULL) record", async () => {
    const user = userEvent.setup()
    render(<MBSpinFormDialog open onOpenChange={() => {}} mbSpin={unmarkedSpin} />)

    const payload = await submitUpdate(user)

    expect(payload.mbsLdrIsFixed).toBeUndefined()
    expect(payload.mbsDozingIsFixed).toBeUndefined()
  })

  it("omits mbsLdrIsFixed/mbsDozingIsFixed on create", async () => {
    const user = userEvent.setup()
    // R81/Task-1: mbsMgtName is now read-only, populated only via selecting a
    // Master Product Type MB — no headId prop here so the picker renders (it is
    // hidden whenever `headId` is passed, per `!headId && !isEditing` in the
    // component), then pick the one mocked head instead of typing into Mgt Name.
    render(<MBSpinFormDialog open onOpenChange={() => {}} />)
    await user.click(screen.getByRole("combobox", { name: /master product type mb/i }))
    await user.click(await screen.findByRole("option", { name: /MBH-NEW.*New spin/ }))
    await user.click(screen.getByRole("button", { name: /^Create$/i }))

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalled())
    const payload = createMutateAsync.mock.calls[0][0] as Record<string, unknown>
    expect(payload.mbsLdrIsFixed).toBeUndefined()
    expect(payload.mbsDozingIsFixed).toBeUndefined()
    expect(Object.keys(JSON.parse(JSON.stringify(payload)))).not.toContain("mbsLdrIsFixed")
    expect(Object.keys(JSON.parse(JSON.stringify(payload)))).not.toContain("mbsDozingIsFixed")
  })
})
