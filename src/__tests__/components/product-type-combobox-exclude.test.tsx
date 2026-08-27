// Guard E2 (frontend): MB products are never created by hand — they are born
// from an MB Recipe only. The product-master form therefore passes
// excludeTypeCodes={["MB"]} to ProductTypeCombobox and "MB" must not be
// offered in the picker.
import { describe, it, expect, vi, beforeAll } from "vitest"
import { render, screen, fireEvent, within } from "../utils"

import { ProductTypeCombobox } from "@/components/finance/comboboxes/product-type-combobox"

// jsdom has no layout engine; cmdk calls scrollIntoView on the active item.
beforeAll(() => {
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function scrollIntoView() {}
  }
})

vi.mock("@/hooks/finance/use-cost-product-type", () => ({
  useCostProductTypes: () => ({
    data: {
      items: [
        { typeId: 1, typeCode: "FY", typeName: "Filament Yarn", isActive: true },
        { typeId: 2, typeCode: "MB", typeName: "Master Batch", isActive: true },
        { typeId: 3, typeCode: "CH", typeName: "Chips", isActive: true },
      ],
    },
    isLoading: false,
  }),
}))

function openPicker() {
  fireEvent.click(screen.getByRole("combobox"))
}

describe("ProductTypeCombobox — excludeTypeCodes", () => {
  it("lists every type when excludeTypeCodes is omitted (unchanged for other callers)", () => {
    render(<ProductTypeCombobox value={undefined} onChange={vi.fn()} />)
    openPicker()

    const list = screen.getByRole("listbox")
    expect(within(list).getByText("Filament Yarn")).toBeInTheDocument()
    expect(within(list).getByText("Master Batch")).toBeInTheDocument()
    expect(within(list).getByText("Chips")).toBeInTheDocument()
  })

  it("hides MB when excludeTypeCodes={['MB']}", () => {
    render(<ProductTypeCombobox value={undefined} onChange={vi.fn()} excludeTypeCodes={["MB"]} />)
    openPicker()

    const list = screen.getByRole("listbox")
    expect(within(list).queryByText("Master Batch")).not.toBeInTheDocument()
    expect(within(list).queryByText("MB")).not.toBeInTheDocument()
    // The other types are still selectable.
    expect(within(list).getByText("Filament Yarn")).toBeInTheDocument()
    expect(within(list).getByText("Chips")).toBeInTheDocument()
  })

  it("matches the excluded code case-insensitively", () => {
    render(<ProductTypeCombobox value={undefined} onChange={vi.fn()} excludeTypeCodes={["mb"]} />)
    openPicker()

    expect(within(screen.getByRole("listbox")).queryByText("Master Batch")).not.toBeInTheDocument()
  })

  it("cannot select an excluded MB type", () => {
    const onChange = vi.fn()
    render(<ProductTypeCombobox value={undefined} onChange={onChange} excludeTypeCodes={["MB"]} />)
    openPicker()

    const list = screen.getByRole("listbox")
    for (const item of within(list).getAllByRole("option")) {
      expect(item.textContent).not.toContain("Master Batch")
    }
    expect(onChange).not.toHaveBeenCalled()
  })
})
