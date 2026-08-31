/**
 * ⭐ DIPERBARUI 2026-08-31 (P4-T2) — R81/R1's Calculator button (previously shown next
 * to "LDR Aktual (%)"/mbsRunLdrPct on the MB Spin form) was removed together with the
 * two legacy LDR field blocks it lived beside. Audit conclusion (see task report):
 * the button's output was always an ABSOLUTE target LDR%, which mapped 1:1 onto the
 * now-removed "LDR Actual (%)" input; the newer LDR mechanism further down the form
 * (mbsLdrCalculatedPct / mbsLdrAdjustmentPct) is a DELTA on top of a system-calculated
 * value, not an absolute LDR%, so there is no like-for-like landing spot for the
 * calculator today. Inventing one is out of scope for P4-T2 (that's P7's job), so the
 * button and its MBDozingCalculatorDialog import were deleted rather than moved.
 *
 * This test file now pins the negative: the Calculator button must NOT be present on
 * the MB Spin form. The calculator dialog itself (mb-dozing-calculator-dialog.tsx) is
 * untouched and still reachable from the MB Recipe detail page — this file only
 * covered its MB Spin form entry point, which no longer exists.
 */
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

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
  useUpdateMBSpinWithCascade: () => ({ mutateAsync: vi.fn(), isPending: false }),
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

describe("MBSpinFormDialog — LDR/dozing calculator (removed, P4-T2)", () => {
  it("no longer shows a Calculator button on the MB Spin form", () => {
    render(<MBSpinFormDialog open onOpenChange={() => {}} mbSpin={spin} />)
    expect(screen.queryByRole("button", { name: /Calculator/i })).not.toBeInTheDocument()
  })

  it("no longer renders the Dozing (LDR) Calculator dialog from this form", () => {
    render(<MBSpinFormDialog open onOpenChange={() => {}} mbSpin={spin} />)
    expect(screen.queryByText("Dozing (LDR) Calculator")).not.toBeInTheDocument()
  })
})
