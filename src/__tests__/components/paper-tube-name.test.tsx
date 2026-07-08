/**
 * Tests for PaperTubeName — P2-T13: fixed Paper/Plastic tube classification.
 * Verifies both display branches:
 *  - tubeType set (PAPER/PLASTIC) -> static label, no master-lookup hook data needed.
 *  - tubeType unset, legacy paperTubeTypeId set -> falls back to master-lookup display.
 */
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

const mockUseCostPaperTubeTypes = vi.fn()

vi.mock("@/hooks/finance/use-cost-paper-tube-type", () => ({
  useCostPaperTubeTypes: () => mockUseCostPaperTubeTypes(),
}))

import { PaperTubeName } from "@/components/common/paper-tube-name"
import { TubeType } from "@/types/generated/finance/v1/cost_product_request"

describe("PaperTubeName", () => {
  it("renders a static 'Paper' label when tubeType is TUBE_TYPE_PAPER, without needing lookup data", () => {
    mockUseCostPaperTubeTypes.mockReturnValue({ data: undefined, isLoading: true })

    render(<PaperTubeName id={null} tubeType={TubeType.TUBE_TYPE_PAPER} />)

    expect(screen.getByText("Paper")).toBeInTheDocument()
  })

  it("renders a static 'Plastic' label when tubeType is TUBE_TYPE_PLASTIC", () => {
    mockUseCostPaperTubeTypes.mockReturnValue({ data: undefined, isLoading: true })

    render(<PaperTubeName id={null} tubeType={TubeType.TUBE_TYPE_PLASTIC} />)

    expect(screen.getByText("Plastic")).toBeInTheDocument()
  })

  it("falls back to legacy master-lookup display when tubeType is unset but paperTubeTypeId is set", () => {
    mockUseCostPaperTubeTypes.mockReturnValue({
      data: [{ paperTubeTypeId: 3, code: "PT-3", displayName: "3 inch jumbo" }],
      isLoading: false,
    })

    render(<PaperTubeName id={3} tubeType={TubeType.TUBE_TYPE_UNSPECIFIED} />)

    expect(screen.getByText(/PT-3 — 3 inch jumbo/)).toBeInTheDocument()
  })

  it("renders an em dash when neither tubeType nor paperTubeTypeId is set", () => {
    mockUseCostPaperTubeTypes.mockReturnValue({ data: [], isLoading: false })

    render(<PaperTubeName id={null} tubeType={TubeType.TUBE_TYPE_UNSPECIFIED} />)

    expect(screen.getByText("—")).toBeInTheDocument()
  })

  it("renders 'Unknown paper tube' for a legacy id with no lookup match", () => {
    mockUseCostPaperTubeTypes.mockReturnValue({ data: [], isLoading: false })

    render(<PaperTubeName id={99} tubeType={TubeType.TUBE_TYPE_UNSPECIFIED} />)

    expect(screen.getByText("Unknown paper tube")).toBeInTheDocument()
  })
})
