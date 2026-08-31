/**
 * P4-T5 (D6): the duplicate dialog must let the user override Name/Denier/
 * Filament before saving, instead of blindly cloning.
 *
 * Two things pinned here:
 *  - the Name field prefills as a SUFFIX ("<source> (copy)"), not a prefix
 *  - whatever the user edits the fields to is exactly what gets sent in the
 *    duplicate mutation payload (mbsMgtName/mbsDenier/mbsFilament)
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const duplicateMutateAsync = vi.fn().mockResolvedValue({ base: { isSuccess: true } })

vi.mock("@/hooks/finance/use-mb-spin", () => ({
  useDuplicateMBSpin: () => ({ mutateAsync: duplicateMutateAsync, isPending: false }),
}))

// P7-T3: live LDR preview reuses the existing CalculateDozing RPC via
// useCalculateDozing (mode=SCALE). The component calls `.mutate(payload, { onSuccess })`
// rather than `.mutateAsync`, so the mock must invoke `onSuccess` itself.
const calculatePreviewMutate = vi.fn(
  (
    _payload: unknown,
    opts?: { onSuccess?: (result: unknown) => void }
  ) => {
    opts?.onSuccess?.(calculatePreviewResult)
  }
)
let calculatePreviewResult: unknown = {
  resultLdr: 20,
  formulaCode: "F_MB_LDR_SCALE",
  calculationTrace: "10 * sqrt(150/48) / sqrt(300/72) = 20",
  factorAvailable: true,
  message: "ok",
}

vi.mock("@/hooks/finance/use-mb-dozing", () => ({
  useCalculateDozing: () => ({
    mutate: calculatePreviewMutate,
    isPending: false,
  }),
}))

import { MBSpinDuplicateDialog } from "@/components/finance/mb-spin/mb-spin-duplicate-dialog"
import type { MBSpin } from "@/types/finance/mb-spin"

const spin = {
  mbsId: "11111111-1111-1111-1111-111111111111",
  mbsMbhId: "22222222-2222-2222-2222-222222222222",
  mbsMgtName: "Sample Spin",
  mbsDenier: 150,
  mbsFilament: 48,
  mbsIsActive: true,
} as MBSpin

beforeEach(() => {
  duplicateMutateAsync.mockClear()
  calculatePreviewMutate.mockClear()
  calculatePreviewResult = {
    resultLdr: 20,
    formulaCode: "F_MB_LDR_SCALE",
    calculationTrace: "10 * sqrt(150/48) / sqrt(300/72) = 20",
    factorAvailable: true,
    message: "ok",
  }
})

describe("MBSpinDuplicateDialog — P4-T5 editable name/denier/filament override", () => {
  it("prefills Name as a SUFFIX '<source> (copy)', not a prefix", () => {
    render(<MBSpinDuplicateDialog open onOpenChange={() => {}} mbSpin={spin} />)

    expect(screen.getByLabelText(/^name/i)).toHaveValue("Sample Spin (copy)")
    expect(screen.queryByDisplayValue("(copy) Sample Spin")).not.toBeInTheDocument()
  })

  it("prefills Denier and Filament from the source spin's current values", () => {
    render(<MBSpinDuplicateDialog open onOpenChange={() => {}} mbSpin={spin} />)

    expect(screen.getByLabelText(/denier/i)).toHaveValue(150)
    expect(screen.getByLabelText(/filament/i)).toHaveValue(48)
  })

  it("sends the edited values, not the source's, in the duplicate payload", async () => {
    const user = userEvent.setup()
    render(<MBSpinDuplicateDialog open onOpenChange={() => {}} mbSpin={spin} />)

    const name = screen.getByLabelText(/^name/i)
    await user.clear(name)
    await user.type(name, "Edited Spin Name")

    const denier = screen.getByLabelText(/denier/i)
    await user.clear(denier)
    await user.type(denier, "300")

    const filament = screen.getByLabelText(/filament/i)
    await user.clear(filament)
    await user.type(filament, "72")

    await user.click(screen.getByRole("button", { name: /^duplicate$/i }))

    await waitFor(() => expect(duplicateMutateAsync).toHaveBeenCalledTimes(1))
    const payload = duplicateMutateAsync.mock.calls[0][0]
    expect(payload).toEqual({
      mbhId: spin.mbsMbhId,
      mbsId: spin.mbsId,
      mbsMgtName: "Edited Spin Name",
      mbsDenier: 300,
      mbsFilament: 72,
    })
  })
})

// P7-T6: the duplicate RPC also returns a recalc-impact PREVIEW (skipped
// children, affected products). The dialog must surface it when present and
// stay quiet (no extra UI) when it's absent/empty — this pins both halves.
describe("MBSpinDuplicateDialog — P7-T6 skip/impact summary", () => {
  it("shows a skip/impact summary when the response carries skipped + impact data", async () => {
    duplicateMutateAsync.mockResolvedValueOnce({
      spin: { ...spin, mbsMgtName: "Sample Spin (copy)" },
      impact: {
        skipped: [
          {
            mbsId: "33333333-3333-3333-3333-333333333333",
            mbsMgtName: "Locked Child",
            mbsStatus: "ACTUAL",
            reason: "STATUS_NOT_RND",
          },
        ],
        skippedCount: 1,
        impactPreview: [],
        impactTotalAffected: 2,
        impactTotalLocked: 1,
        impactTruncated: false,
      },
    })

    const user = userEvent.setup()
    render(<MBSpinDuplicateDialog open onOpenChange={() => {}} mbSpin={spin} />)

    await user.click(screen.getByRole("button", { name: /^duplicate$/i }))

    expect(await screen.findByTestId("duplicate-impact-summary")).toBeInTheDocument()
    expect(screen.getByText("2 product(s) affected")).toBeInTheDocument()
    expect(screen.getByText("1 locked")).toBeInTheDocument()
    expect(screen.getByText("1 child spin(s) skipped")).toBeInTheDocument()
    expect(screen.getByText(/Locked Child/)).toBeInTheDocument()
    expect(screen.getByText(/STATUS_NOT_RND/)).toBeInTheDocument()

    // Form fields are replaced by the summary — the "Duplicate" submit button
    // is gone, only "Done" remains.
    expect(screen.queryByRole("button", { name: /^duplicate$/i })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^done$/i })).toBeInTheDocument()
  })

  it("renders no extra summary when the response has no skipped/impact data", async () => {
    duplicateMutateAsync.mockResolvedValueOnce({
      spin: { ...spin, mbsMgtName: "Sample Spin (copy)" },
      impact: {
        skipped: [],
        skippedCount: 0,
        impactPreview: [],
        impactTotalAffected: 0,
        impactTotalLocked: 0,
        impactTruncated: false,
      },
    })

    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(<MBSpinDuplicateDialog open onOpenChange={onOpenChange} mbSpin={spin} />)

    await user.click(screen.getByRole("button", { name: /^duplicate$/i }))

    await waitFor(() => expect(duplicateMutateAsync).toHaveBeenCalledTimes(1))
    expect(screen.queryByTestId("duplicate-impact-summary")).not.toBeInTheDocument()
    // The common case closes the dialog immediately instead of showing anything extra.
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("renders no extra summary when the response omits impact entirely", async () => {
    duplicateMutateAsync.mockResolvedValueOnce({ base: { isSuccess: true } })

    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(<MBSpinDuplicateDialog open onOpenChange={onOpenChange} mbSpin={spin} />)

    await user.click(screen.getByRole("button", { name: /^duplicate$/i }))

    await waitFor(() => expect(duplicateMutateAsync).toHaveBeenCalledTimes(1))
    expect(screen.queryByTestId("duplicate-impact-summary")).not.toBeInTheDocument()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

// P7-T3: the duplicate form only lets the user edit Name/Denier/Filament (no
// cross-section field exists on this dialog — see mbs-cross-section handling
// in the parent MB Recipe, not on MBSpin), so the live preview only ever runs
// CalculateDozing in SCALE mode. It must (a) stay a thin, read-only wrapper —
// never compute LDR itself, (b) only fire once denier/filament diverge from
// the source spin, and (c) do nothing at all when the source spin carries no
// known LDR to scale from (nothing to preview against).
describe("MBSpinDuplicateDialog — P7-T3 live LDR preview", () => {
  const spinWithLdr = {
    ...spin,
    mbsLdrCalculatedPct: 10,
  } as MBSpin

  it("shows no preview when Denier/Filament are unchanged from the source", () => {
    render(<MBSpinDuplicateDialog open onOpenChange={() => {}} mbSpin={spinWithLdr} />)

    expect(screen.queryByTestId("duplicate-ldr-preview")).not.toBeInTheDocument()
    expect(calculatePreviewMutate).not.toHaveBeenCalled()
  })

  it("calls CalculateDozing in SCALE mode and shows the resulting LDR once Denier changes", async () => {
    const user = userEvent.setup()
    render(<MBSpinDuplicateDialog open onOpenChange={() => {}} mbSpin={spinWithLdr} />)

    const denier = screen.getByLabelText(/denier/i)
    await user.clear(denier)
    await user.type(denier, "300")

    await waitFor(() => expect(calculatePreviewMutate).toHaveBeenCalled(), { timeout: 2000 })
    const [payload] = calculatePreviewMutate.mock.calls[0]
    expect(payload).toEqual({
      mode: "SCALE",
      ldrRef: 10,
      denierRef: 150,
      filamentRef: 48,
      denierTarget: 300,
      filamentTarget: 48,
    })

    expect(await screen.findByTestId("duplicate-ldr-preview")).toBeInTheDocument()
    expect(screen.getByTestId("duplicate-ldr-preview-value")).toHaveTextContent("20%")
    // Labeled as a preview, not the value that will actually be saved.
    expect(screen.getByText(/preview only/i)).toBeInTheDocument()
  })

  it("shows the server's no-factor message and withholds any number when factorAvailable is false", async () => {
    calculatePreviewResult = {
      resultLdr: undefined,
      formulaCode: "F_MB_LDR_SCALE",
      calculationTrace: "",
      factorAvailable: false,
      message: "No conversion factor for this denier/filament pair.",
    }

    const user = userEvent.setup()
    render(<MBSpinDuplicateDialog open onOpenChange={() => {}} mbSpin={spinWithLdr} />)

    const filament = screen.getByLabelText(/filament/i)
    await user.clear(filament)
    await user.type(filament, "72")

    await waitFor(() => expect(calculatePreviewMutate).toHaveBeenCalled(), { timeout: 2000 })

    expect(await screen.findByText("No conversion factor for this denier/filament pair.")).toBeInTheDocument()
    expect(screen.queryByTestId("duplicate-ldr-preview-value")).not.toBeInTheDocument()
  })

  it("never shows a preview when the source spin has no known LDR to scale from", async () => {
    const user = userEvent.setup()
    // `spin` (no mbsLdrCalculatedPct/mbsRunLdrPct/mbsLdrPrsn) — nothing to preview against.
    render(<MBSpinDuplicateDialog open onOpenChange={() => {}} mbSpin={spin} />)

    const denier = screen.getByLabelText(/denier/i)
    await user.clear(denier)
    await user.type(denier, "300")

    // Give the debounce window a chance to fire, then confirm it never did.
    await new Promise((resolve) => setTimeout(resolve, 600))
    expect(calculatePreviewMutate).not.toHaveBeenCalled()
    expect(screen.queryByTestId("duplicate-ldr-preview")).not.toBeInTheDocument()
  })
})
