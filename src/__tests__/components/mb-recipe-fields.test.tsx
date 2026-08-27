/**
 * P6 field components — the invariants that must not drift.
 *
 * MBNoOfProcessSelect: options come from the NO_OF_PROCESS param master, and
 * NOTHING is preselected (gate U-B is open; 'D' must not be invented).
 * MBCrossSectionSelect: options come from the cross-section MASTER, never from a
 * constant in the FE — including RSD, which is a legitimate sixth code.
 * MBAdditionalShadesField: hard ceiling of two rows.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const useMbParamsMock = vi.fn()
const useMbCrossSectionsMock = vi.fn()

vi.mock("@/hooks/finance/use-mb-param", () => ({ useMbParams: () => useMbParamsMock() }))
vi.mock("@/hooks/finance/use-mb-cross-section", () => ({
  useMbCrossSections: () => useMbCrossSectionsMock(),
}))

import { MBNoOfProcessSelect } from "@/components/finance/mb-recipe/fields/mb-no-of-process-select"
import { MBCrossSectionSelect } from "@/components/finance/mb-recipe/fields/mb-cross-section-select"
import {
  MBAdditionalShadesField,
  MAX_ADDITIONAL_SHADES,
  type AdditionalShadeRow,
} from "@/components/finance/mb-recipe/fields/mb-additional-shades-field"
import { MB_STATUS_OPTIONS, MB_STATUS_DEFAULT } from "@/components/finance/mb-recipe/fields/mb-status-select"

const PARAM_RESULT = {
  data: {
    items: [
      {
        code: "NO_OF_PROCESS",
        options: [
          { mbpoId: "1", code: "S", isActive: true, displayOrder: 1 },
          { mbpoId: "2", code: "D", isActive: true, displayOrder: 2 },
          { mbpoId: "3", code: "T", isActive: true, displayOrder: 3 },
        ],
      },
    ],
  },
  isLoading: false,
}

/** The six production codes — RSD included, and never remapped. */
const CROSS_SECTION_RESULT = {
  data: {
    items: ["RND", "TBL", "PLUS", "OTL", "RSD", "SPC"].map((code, i) => ({
      mbcsId: String(i + 1),
      code,
      displayName: "",
    })),
  },
  isLoading: false,
}

beforeEach(() => {
  vi.clearAllMocks()
  useMbParamsMock.mockReturnValue(PARAM_RESULT)
  useMbCrossSectionsMock.mockReturnValue(CROSS_SECTION_RESULT)
})

describe("MBNoOfProcessSelect — U-B: no invented default", () => {
  it("preselects nothing when value is empty", () => {
    render(<MBNoOfProcessSelect value="" onChange={() => {}} />)
    const trigger = screen.getByRole("combobox", { name: /number of process/i })
    // A placeholder, not a code. If 'D' ever appears here, U-B was guessed at.
    expect(trigger).toHaveTextContent(/select/i)
    expect(trigger).not.toHaveTextContent(/^D$/)
    expect(trigger.textContent).not.toMatch(/Double/)
  })

  it("preselects nothing when value is undefined either", () => {
    render(<MBNoOfProcessSelect value={undefined} onChange={() => {}} />)
    expect(screen.getByRole("combobox", { name: /number of process/i })).toHaveTextContent(/select/i)
  })

  it("shows the stored code when one exists", () => {
    render(<MBNoOfProcessSelect value="T" onChange={() => {}} />)
    expect(screen.getByRole("combobox", { name: /number of process/i })).toHaveTextContent(/T/)
  })

  it("reads its options from the NO_OF_PROCESS param master, not a constant", () => {
    render(<MBNoOfProcessSelect value="" onChange={() => {}} />)
    expect(useMbParamsMock).toHaveBeenCalled()
  })
})

describe("MBCrossSectionSelect — master-sourced (B13)", () => {
  it("queries the cross-section master rather than hardcoding codes", () => {
    render(<MBCrossSectionSelect value="" onChange={() => {}} />)
    expect(useMbCrossSectionsMock).toHaveBeenCalled()
  })

  it("shows the stored code, RSD included, unchanged", () => {
    render(<MBCrossSectionSelect value="RSD" onChange={() => {}} />)
    expect(screen.getByRole("combobox", { name: /cross section/i })).toHaveTextContent("RSD")
  })

  it("renders a placeholder, never a defaulted first code", () => {
    render(<MBCrossSectionSelect value="" onChange={() => {}} />)
    const trigger = screen.getByRole("combobox", { name: /cross section/i })
    expect(trigger).toHaveTextContent(/select cross section/i)
    expect(trigger).not.toHaveTextContent("RND")
  })
})

describe("MBAdditionalShadesField — ceiling of two", () => {
  it("disables Add at the ceiling", async () => {
    const rows: AdditionalShadeRow[] = [
      { mbhsSeqNo: 1, mbhsShadeCode: "A", mbhsShadeName: "" },
      { mbhsSeqNo: 2, mbhsShadeCode: "B", mbhsShadeName: "" },
    ]
    render(<MBAdditionalShadesField value={rows} onChange={() => {}} />)
    expect(screen.getByTestId("add-additional-shade")).toBeDisabled()
    expect(MAX_ADDITIONAL_SHADES).toBe(2)
  })

  it("never emits a row beyond the ceiling", () => {
    const onChange = vi.fn()
    const rows: AdditionalShadeRow[] = [
      { mbhsSeqNo: 1, mbhsShadeCode: "A", mbhsShadeName: "" },
      { mbhsSeqNo: 2, mbhsShadeCode: "B", mbhsShadeName: "" },
    ]
    render(<MBAdditionalShadesField value={rows} onChange={onChange} />)
    // fireEvent, not userEvent: userEvent refuses to click a disabled control,
    // which would pass the assertion without proving the guard exists.
    fireEvent.click(screen.getByTestId("add-additional-shade"))
    expect(onChange).not.toHaveBeenCalled()
  })

  it("renumbers the survivor to seq 1 after removing the first row", async () => {
    const onChange = vi.fn()
    const rows: AdditionalShadeRow[] = [
      { mbhsSeqNo: 1, mbhsShadeCode: "A", mbhsShadeName: "" },
      { mbhsSeqNo: 2, mbhsShadeCode: "B", mbhsShadeName: "" },
    ]
    render(<MBAdditionalShadesField value={rows} onChange={onChange} />)
    await userEvent.click(screen.getByRole("button", { name: /remove additional shade 1/i }))
    expect(onChange).toHaveBeenCalledWith([{ mbhsSeqNo: 1, mbhsShadeCode: "B", mbhsShadeName: "" }])
  })
})

describe("MBStatusSelect — exact production spelling (B10)", () => {
  it("keeps the case-sensitive value set and the R and D default", () => {
    expect(MB_STATUS_OPTIONS).toEqual(["R and D", "Spinning", "Boughtout"])
    expect(MB_STATUS_DEFAULT).toBe("R and D")
  })
})
