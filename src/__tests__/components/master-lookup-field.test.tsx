/**
 * MasterLookupField — regression test for duplicate MB Spin codes.
 *
 * Real MB Spin data can have the same `value` (Oracle ORION item code, e.g.
 * "CMB0000733") on more than one row — different denier/filament/LDR under the
 * same code. Before the fix, both the React `key` and the cmdk `CommandItem`
 * `value` were `opt.value` directly, which caused:
 *   1. A React "two children with the same key" console warning.
 *   2. cmdk itself conflating the two rows — hovering/selecting either one
 *      visually highlighted both, because cmdk tracks state by `value`.
 *
 * This test renders two options with the same `value` but different
 * denier/filament, opens the popover, and asserts:
 *   - No duplicate-key warning is logged.
 *   - Both rows render as separate DOM nodes (not deduped/merged).
 *   - Hovering one row does not mark the other as selected/highlighted.
 *   - Selecting a row still saves the real code (`opt.value`), not a
 *     synthesized composite key.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// jsdom doesn't implement scrollIntoView, which cmdk calls when the highlighted
// item changes. Scoped to this file rather than the global setup, since this is
// the only suite driving cmdk's hover/keyboard highlighting.
Element.prototype.scrollIntoView = vi.fn()

// ─── Module mocks ─────────────────────────────────────────────────────────────

const DUPLICATE_OPTIONS = [
  { value: "CMB0000733", label: "MGT SAMPLE A", denier: 150, filament: 48, ldrPrsn: 1.4, runLdrPct: 1.42 },
  { value: "CMB0000733", label: "MGT SAMPLE B", denier: 300, filament: 96, ldrPrsn: 2.1, runLdrPct: 2.05 },
]

vi.mock("@/hooks/finance/use-master-lookup", () => ({
  useMasterLookupOptions: () => ({ data: DUPLICATE_OPTIONS, isLoading: false }),
}))

// ─── Import under test (after the mocks are registered) ───────────────────────

import { MasterLookupField } from "@/components/finance/cost-product-master/master-lookup-field"
import type { RequiredParamEntry } from "@/types/finance/cost-product-parameter"
import type { DraftValue } from "@/components/finance/cost-product-master/parameters-tab"

const ENTRY: RequiredParamEntry = {
  paramId: "p-1",
  paramCode: "MB_SPIN_CODE",
  paramName: "MB Spin",
  paramShortName: "MB Spin",
  dataType: "TEXT",
  paramCategory: "REQUIRED",
  uomCode: "",
  ownerDepartment: "",
  isRequiredForCosting: true,
  lookupMasterCode: "MB_SPIN",
  lookupFillGroupCode: "",
  lookupSourceColumn: "",
  displayOrder: 1,
  displayGroup: "General",
  valueMbSpinId: "",
  mbSpinCandidateCount: 0,
  hasMbSpinCandidateCount: false,
  mbSpinCandidates: [],
  hasValue: false,
  valueNumeric: "",
  valueText: "",
  valueFlag: false,
  filledAt: "",
  filledBy: "",
}

const DRAFT: DraftValue = {
  valueNumeric: "",
  valueText: "",
  valueFlag: false,
  hasValueFlag: false,
  dirty: false,
}

describe("MasterLookupField — duplicate master codes", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  function renderField(onChangeLookup = vi.fn()) {
    return render(
      <MasterLookupField
        entry={ENTRY}
        draft={DRAFT}
        allEntries={[ENTRY]}
        onChangeLookup={onChangeLookup}
      />,
    )
  }

  it("renders two options with the same code as separate rows without a duplicate-key warning", async () => {
    const user = userEvent.setup()
    renderField()

    await user.click(screen.getByRole("combobox"))

    // Both rows must be present as distinct listbox options — not merged/deduped.
    const items = await screen.findAllByRole("option")
    expect(items).toHaveLength(2)
    expect(within(items[0]).getByText("MGT SAMPLE A")).toBeInTheDocument()
    expect(within(items[1]).getByText("MGT SAMPLE B")).toBeInTheDocument()

    // React's "two children with the same key" warning must never fire.
    const duplicateKeyWarning = consoleErrorSpy.mock.calls.some((args) =>
      args.some((a) => typeof a === "string" && a.includes("same key")),
    )
    expect(duplicateKeyWarning).toBe(false)
  })

  it("highlights only the hovered row, not both duplicate-coded rows", async () => {
    const user = userEvent.setup()
    renderField()

    await user.click(screen.getByRole("combobox"))
    const items = await screen.findAllByRole("option")

    await user.hover(items[0])

    expect(items[0]).toHaveAttribute("aria-selected", "true")
    expect(items[1]).toHaveAttribute("aria-selected", "false")
  })

  it("saves the real master code (not a synthesized composite key) on select", async () => {
    const onChangeLookup = vi.fn()
    // Prevent the auto-fill fetch from throwing in jsdom — MasterLookupField
    // fires it on select but this test only cares about onChangeLookup's args.
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ data: null }),
    } as Response)

    const user = userEvent.setup()
    renderField(onChangeLookup)

    await user.click(screen.getByRole("combobox"))
    const items = await screen.findAllByRole("option")
    await user.click(items[1])

    expect(onChangeLookup).toHaveBeenCalledWith("p-1", "CMB0000733", null)
  })
})
