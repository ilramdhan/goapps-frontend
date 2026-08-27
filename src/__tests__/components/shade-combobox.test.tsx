// R10 (2026-08-26): ShadeCombobox replaces the old free-text "Shade Code" /
// "Shade Name" pair in MB Recipe with one master-backed picker. These tests
// cover the two things R10 explicitly requires:
//   1. Selecting a master row fires onSelect with BOTH code and name.
//   2. A code/name pair that has no match in the (mocked) search results
//      still renders on the trigger — legacy MB Recipe data must never look
//      blank just because it predates or diverges from the shade master.
import { describe, it, expect, vi, beforeAll } from "vitest"
import { render, screen, fireEvent, within } from "../utils"

import { ShadeCombobox } from "@/components/finance/shade/shade-combobox"

beforeAll(() => {
  // jsdom has no layout engine; cmdk calls scrollIntoView on the active item.
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function scrollIntoView() {}
  }
})

vi.mock("@/hooks/finance/use-shade", () => ({
  useShades: () => ({
    data: {
      data: [
        { shadeId: 1, shadeCode: "RED01", shadeName: "Bright Red", isActive: true },
        { shadeId: 2, shadeCode: "BLU02", shadeName: "Ocean Blue", isActive: true },
      ],
    },
    isLoading: false,
  }),
}))

function openPicker() {
  fireEvent.click(screen.getByRole("combobox"))
}

describe("ShadeCombobox", () => {
  it("shows a placeholder when no code/name is set", () => {
    render(<ShadeCombobox code={undefined} name={undefined} onSelect={vi.fn()} />)
    expect(screen.getByText("Select shade…")).toBeInTheDocument()
  })

  it("lists master shades and fires onSelect with code AND name together", () => {
    const onSelect = vi.fn()
    render(<ShadeCombobox code={undefined} name={undefined} onSelect={onSelect} />)
    openPicker()

    const list = screen.getByRole("listbox")
    fireEvent.click(within(list).getByText("Ocean Blue"))

    expect(onSelect).toHaveBeenCalledWith("BLU02", "Ocean Blue")
  })

  it("keeps showing a legacy code/name pair that has no match in the master list", () => {
    render(<ShadeCombobox code="OLD-CODE-99" name="Legacy Shade Not In Master" onSelect={vi.fn()} />)

    // The trigger renders straight from props — it never requires the value
    // to be found among the fetched shades.
    expect(screen.getByText("OLD-CODE-99")).toBeInTheDocument()
    expect(screen.getByText(/Legacy Shade Not In Master/)).toBeInTheDocument()
  })

  it("does not call onSelect just from opening the picker", () => {
    const onSelect = vi.fn()
    render(<ShadeCombobox code="RED01" name="Bright Red" onSelect={onSelect} />)
    openPicker()
    expect(onSelect).not.toHaveBeenCalled()
  })
})
