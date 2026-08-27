/**
 * MBDozingCalculatorDialog — the two behaviours that must not regress:
 *
 *  1. D13 / `factorAvailable === false` is the NORMAL "no factor for this pair"
 *     outcome. The server's message is shown and NO number is rendered — no
 *     result, no trace, and above all no 1.0 fallback. A wrong number is worse
 *     than no number.
 *  2. STRENGTH is on hold (decision gate G6-C3), so exactly two tabs exist and
 *     the word never appears in the rendered UI.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const calculateMutateAsync = vi.fn()

vi.mock("@/hooks/finance/use-mb-dozing", () => ({
  useCalculateDozing: () => ({
    mutateAsync: calculateMutateAsync,
    reset: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}))

import { MBDozingCalculatorDialog } from "@/components/finance/mb-recipe/mb-dozing-calculator-dialog"

async function fillScaleAndCalculate() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText("Reference LDR (%)"), "10")
  await user.type(screen.getByLabelText("Reference Denier"), "150")
  await user.type(screen.getByLabelText("Reference Filament"), "48")
  await user.type(screen.getByLabelText("Target Denier"), "300")
  await user.type(screen.getByLabelText("Target Filament"), "72")
  await user.click(screen.getByTestId("dozing-calculate"))
}

describe("MBDozingCalculatorDialog — factorAvailable === false", () => {
  beforeEach(() => {
    calculateMutateAsync.mockReset()
  })

  it("shows the server message and renders NO numeric result", async () => {
    calculateMutateAsync.mockResolvedValue({
      resultLdr: undefined,
      formulaCode: "F_MB_LDR_XSECTION",
      calculationTrace: "",
      factorAvailable: false,
      message: "No conversion factor for RND -> RSD.",
    })

    render(<MBDozingCalculatorDialog open onOpenChange={() => {}} />)
    await fillScaleAndCalculate()

    await waitFor(() => expect(screen.getByTestId("dozing-no-factor")).toBeInTheDocument())
    expect(screen.getByText("No conversion factor for RND -> RSD.")).toBeInTheDocument()

    // No result block at all, and no fabricated 1 / 1.0 / 0 anywhere.
    expect(screen.queryByTestId("dozing-result")).not.toBeInTheDocument()
    expect(screen.queryByTestId("dozing-result-value")).not.toBeInTheDocument()
    const alertText = screen.getByTestId("dozing-no-factor").textContent ?? ""
    expect(alertText).not.toMatch(/\b1(\.0)?\b/)
  })

  it("DOES render a result of exactly 0 when the factor IS available", async () => {
    calculateMutateAsync.mockResolvedValue({
      resultLdr: 0,
      formulaCode: "F_MB_LDR_SCALE",
      calculationTrace: "0 * sqrt(2) = 0",
      factorAvailable: true,
      message: "ok",
    })

    render(<MBDozingCalculatorDialog open onOpenChange={() => {}} />)
    await fillScaleAndCalculate()

    await waitFor(() => expect(screen.getByTestId("dozing-result")).toBeInTheDocument())
    expect(screen.getByTestId("dozing-result-value")).toHaveTextContent("0")
    expect(screen.queryByTestId("dozing-no-factor")).not.toBeInTheDocument()
  })
})

describe("MBDozingCalculatorDialog — STRENGTH is on hold (G6-C3)", () => {
  it("renders exactly two tabs, Scale and Cross Section", () => {
    render(<MBDozingCalculatorDialog open onOpenChange={() => {}} />)
    const tabs = screen.getAllByRole("tab")
    expect(tabs).toHaveLength(2)
    expect(tabs.map((t) => t.textContent)).toEqual(["Scale", "Cross Section"])
  })

  it("renders no STRENGTH tab, option or text anywhere", () => {
    const { container } = render(<MBDozingCalculatorDialog open onOpenChange={() => {}} />)
    expect(screen.queryByRole("tab", { name: /strength/i })).not.toBeInTheDocument()
    expect(container.textContent ?? "").not.toMatch(/strength/i)
    expect(document.body.textContent ?? "").not.toMatch(/strength/i)
  })
})
