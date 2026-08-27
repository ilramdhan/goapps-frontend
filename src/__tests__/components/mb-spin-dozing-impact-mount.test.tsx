/**
 * P7 mount contract for the dozing impact panel inside the MB Spin form.
 *
 * The plan requires the impact preview to be triggered ONLY by a change to the
 * dozing-driving fields on the SPIN form — not to render unconditionally. These
 * tests pin that gate, because a panel that always renders would fire an impact
 * query on every plain "edit name" open.
 *
 * mbsDozing is deliberately not a trigger: D30 retired that column and the form
 * does not render it, leaving denier and filament as the only live triggers.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const impactMutate = vi.fn()

vi.mock("@/hooks/finance/use-mb-dozing", () => ({
  usePreviewDozingImpact: () => ({
    mutate: impactMutate,
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
  useCreateMBSpin: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateMBSpin: () => ({ mutateAsync: vi.fn(), isPending: false }),
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

const spin = {
  mbsId: "11111111-1111-1111-1111-111111111111",
  mbsMbhId: "22222222-2222-2222-2222-222222222222",
  mbsMgtName: "Sample spin",
  mbsDenier: 150,
  mbsFilament: 48,
  mbsIsActive: true,
} as never

beforeEach(() => {
  impactMutate.mockClear()
})

describe("MBSpinFormDialog — dozing impact panel mount gate", () => {
  it("stays hidden while denier and filament are untouched", () => {
    render(<MBSpinFormDialog open onOpenChange={() => {}} mbSpin={spin} />)
    expect(screen.queryByTestId("dozing-impact-panel")).not.toBeInTheDocument()
    expect(impactMutate).not.toHaveBeenCalled()
  })

  it("appears once denier changes", async () => {
    const user = userEvent.setup()
    render(<MBSpinFormDialog open onOpenChange={() => {}} mbSpin={spin} />)

    const denier = screen.getByLabelText(/Denier/i)
    await user.clear(denier)
    await user.type(denier, "300")

    await waitFor(() => {
      expect(screen.getByTestId("dozing-impact-panel")).toBeInTheDocument()
    })
    expect(impactMutate).toHaveBeenCalled()
  })

  it("does not mount for a brand-new spin, which has no mbsId to preview", () => {
    render(<MBSpinFormDialog open onOpenChange={() => {}} headId="22222222-2222-2222-2222-222222222222" />)
    expect(screen.queryByTestId("dozing-impact-panel")).not.toBeInTheDocument()
  })
})
