/**
 * R81/R1: "letakkan calculator dozing di halaman mb spin, karena di halaman mb
 * spin lah ldr atau dozing actual biasanya di inputkan."
 *
 * The LDR/dozing calculator (previously only reachable from the MB Recipe
 * detail page) must also be reachable from the MB Spin form, right next to
 * "LDR Aktual (%)" (mbsRunLdrPct) — the field that field actually receives.
 * This pins: (1) the button exists and opens the calculator dialog, (2) the
 * calculator never writes back into the form (it stays a read-only tool).
 */
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

vi.mock("@/hooks/finance/use-mb-dozing", () => ({
  usePreviewDozingImpact: () => ({
    mutate: vi.fn(),
    data: undefined,
    isPending: false,
    isError: false,
    error: null,
  }),
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
  useCreateMBSpin: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateMBSpin: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock("@/hooks/finance/use-mb-head", () => ({
  useMBHeads: () => ({ data: undefined, isLoading: false }),
}))

vi.mock("@/hooks/finance/use-cost-product-master", () => ({
  useCostProductMasters: () => ({ data: undefined, isLoading: false }),
}))

import { MBSpinFormDialog } from "@/components/finance/mb-spin/mb-spin-form-dialog"

const spin = {
  mbsId: "11111111-1111-1111-1111-111111111111",
  mbsMbhId: "22222222-2222-2222-2222-222222222222",
  mbsMgtName: "Sample spin",
  mbsDenier: 150,
  mbsFilament: 48,
  mbsRunLdrPct: 3.55,
  mbsIsActive: true,
} as never

describe("MBSpinFormDialog — LDR/dozing calculator", () => {
  it("shows a Calculator button next to LDR Aktual (%)", () => {
    render(<MBSpinFormDialog open onOpenChange={() => {}} mbSpin={spin} />)
    expect(screen.getByRole("button", { name: /Calculator/i })).toBeInTheDocument()
  })

  it("opens the read-only Dozing (LDR) Calculator dialog on click", async () => {
    const user = userEvent.setup()
    render(<MBSpinFormDialog open onOpenChange={() => {}} mbSpin={spin} />)

    await user.click(screen.getByRole("button", { name: /Calculator/i }))

    expect(screen.getByText("Dozing (LDR) Calculator")).toBeInTheDocument()
    expect(screen.getByText(/Calculates a target LDR for reference only\. Nothing is saved\./i)).toBeInTheDocument()
  })

  it("does not seed the calculator from the MB Spin's own LDR Aktual value (D30/D13)", async () => {
    const user = userEvent.setup()
    render(<MBSpinFormDialog open onOpenChange={() => {}} mbSpin={spin} />)

    await user.click(screen.getByRole("button", { name: /Calculator/i }))

    const refLdrInput = screen.getByLabelText(/Reference LDR/i) as HTMLInputElement
    expect(refLdrInput.value).toBe("")
  })
})
