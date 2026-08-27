/**
 * P12B tri-state contract for the MB Spin fix/actual markers.
 *
 * mbsLdrIsFixed / mbsDozingIsFixed have THREE states, not two:
 *   undefined -> "belum ditandai" (DB NULL). The backend
 *                (mbspin/entity.go IsFixedLDR/IsFixedDozing) treats NULL as FIXED,
 *                so legacy rows are never recalculated.
 *   true      -> nilai FIX, dikunci
 *   false     -> nilai hasil hitung, boleh ditimpa recalc P13
 *
 * Collapsing undefined -> false (a stray `?? false`, or `.default(false)` on the
 * zod field) silently flips a protected row to recalculable and lets P13 overwrite
 * a human-entered actual. These tests exist purely to make that regression red.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

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

vi.mock("@/hooks/finance/use-mb-head", () => ({
  useMBHeads: () => ({ data: undefined, isLoading: false }),
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

const ldrBox = () => screen.getByLabelText(/LDR nilai FIX/i)
const dozingBox = () => screen.getByLabelText(/Dozing nilai FIX/i)

async function submitUpdate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /^Update$/i }))
  await waitFor(() => expect(updateMutateAsync).toHaveBeenCalled())
  return updateMutateAsync.mock.calls[0][0].data as Record<string, unknown>
}

beforeEach(() => {
  createMutateAsync.mockClear()
  updateMutateAsync.mockClear()
})

describe("MBSpinFormDialog — fix/actual markers stay tri-state", () => {
  // (a) absence survives the reset
  it("renders an unmarked spin as indeterminate, not unchecked", () => {
    render(<MBSpinFormDialog open onOpenChange={() => {}} mbSpin={unmarkedSpin} />)
    // Radix maps the tri-state `indeterminate` to aria-checked="mixed".
    // "false" here would mean the form collapsed undefined -> false.
    expect(ldrBox()).toHaveAttribute("aria-checked", "mixed")
    expect(dozingBox()).toHaveAttribute("aria-checked", "mixed")
  })

  it("renders an explicitly marked spin as true/false, never mixed", () => {
    render(<MBSpinFormDialog open onOpenChange={() => {}} mbSpin={markedSpin} />)
    expect(ldrBox()).toHaveAttribute("aria-checked", "true")
    expect(dozingBox()).toHaveAttribute("aria-checked", "false")
  })

  it("renders a brand-new spin as indeterminate", () => {
    render(
      <MBSpinFormDialog open onOpenChange={() => {}} headId="22222222-2222-2222-2222-222222222222" />
    )
    expect(ldrBox()).toHaveAttribute("aria-checked", "mixed")
    expect(dozingBox()).toHaveAttribute("aria-checked", "mixed")
  })

  // (b) an untouched marker must not be sent, so the DB column stays NULL
  it("submits undefined — not false — for markers the user never touched", async () => {
    const user = userEvent.setup()
    render(<MBSpinFormDialog open onOpenChange={() => {}} mbSpin={unmarkedSpin} />)

    const payload = await submitUpdate(user)

    expect(payload.mbsLdrIsFixed).toBeUndefined()
    expect(payload.mbsDozingIsFixed).toBeUndefined()
    // Explicitly reject the `false` collapse — toBeUndefined() alone would also
    // pass for null, but `false` is the dangerous value.
    expect(payload.mbsLdrIsFixed).not.toBe(false)
    expect(payload.mbsDozingIsFixed).not.toBe(false)

    // The BFF serializes with JSON.stringify, which drops undefined keys entirely.
    // This is the wire-level proof that the column is left NULL.
    const wire = JSON.parse(JSON.stringify(payload))
    expect(Object.keys(wire)).not.toContain("mbsLdrIsFixed")
    expect(Object.keys(wire)).not.toContain("mbsDozingIsFixed")
  })

  it("leaves the untouched marker undefined even when another field is edited", async () => {
    const user = userEvent.setup()
    render(<MBSpinFormDialog open onOpenChange={() => {}} mbSpin={unmarkedSpin} />)

    const mgtName = screen.getByLabelText(/Mgt Name/i)
    await user.clear(mgtName)
    await user.type(mgtName, "Renamed spin")

    const payload = await submitUpdate(user)
    expect(payload.mbsMgtName).toBe("Renamed spin")
    expect(payload.mbsLdrIsFixed).toBeUndefined()
    expect(payload.mbsDozingIsFixed).toBeUndefined()
  })

  it("omits untouched markers on create too", async () => {
    const user = userEvent.setup()
    render(
      <MBSpinFormDialog open onOpenChange={() => {}} headId="22222222-2222-2222-2222-222222222222" />
    )
    await user.type(screen.getByLabelText(/Mgt Name/i), "New spin")
    await user.click(screen.getByRole("button", { name: /^Create$/i }))

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalled())
    const payload = createMutateAsync.mock.calls[0][0] as Record<string, unknown>
    expect(payload.mbsLdrIsFixed).toBeUndefined()
    expect(payload.mbsDozingIsFixed).toBeUndefined()
    expect(Object.keys(JSON.parse(JSON.stringify(payload)))).not.toContain("mbsLdrIsFixed")
  })

  // (c) clicking commits to an explicit boolean
  it("sends true after the user checks an unmarked marker", async () => {
    const user = userEvent.setup()
    render(<MBSpinFormDialog open onOpenChange={() => {}} mbSpin={unmarkedSpin} />)

    await user.click(ldrBox())
    await waitFor(() => expect(ldrBox()).toHaveAttribute("aria-checked", "true"))

    const payload = await submitUpdate(user)
    expect(payload.mbsLdrIsFixed).toBe(true)
    // The sibling marker was not touched — it must still be absent.
    expect(payload.mbsDozingIsFixed).toBeUndefined()
  })

  it("sends an explicit false after the user unchecks a marker that was true", async () => {
    const user = userEvent.setup()
    render(<MBSpinFormDialog open onOpenChange={() => {}} mbSpin={markedSpin} />)

    await user.click(ldrBox())
    await waitFor(() => expect(ldrBox()).toHaveAttribute("aria-checked", "false"))

    const payload = await submitUpdate(user)
    expect(payload.mbsLdrIsFixed).toBe(false)
    // false must survive serialization — it is a real value, not an absence.
    expect(JSON.parse(JSON.stringify(payload)).mbsLdrIsFixed).toBe(false)
    expect(payload.mbsDozingIsFixed).toBe(false)
  })

  it("moves from indeterminate to true then to explicit false on repeated clicks", async () => {
    const user = userEvent.setup()
    render(<MBSpinFormDialog open onOpenChange={() => {}} mbSpin={unmarkedSpin} />)

    expect(dozingBox()).toHaveAttribute("aria-checked", "mixed")
    await user.click(dozingBox())
    await waitFor(() => expect(dozingBox()).toHaveAttribute("aria-checked", "true"))
    await user.click(dozingBox())
    await waitFor(() => expect(dozingBox()).toHaveAttribute("aria-checked", "false"))

    const payload = await submitUpdate(user)
    expect(payload.mbsDozingIsFixed).toBe(false)
  })
})
