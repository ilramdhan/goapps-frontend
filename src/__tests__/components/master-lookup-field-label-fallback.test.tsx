/**
 * MasterLookupField — BUG-2 regression: selected label must not disappear
 * when the stored value falls outside the currently-loaded `options` page.
 *
 * `options` comes from a server-side searched/limited list (see
 * master-lookup-field.tsx DISPLAY_LIMIT notes). The previous implementation
 * matched `currentValue` against `options` on every render
 * (`options.find((o) => o.value === currentValue)`) with no fallback, so a
 * value that used to resolve to a label could silently lose it the moment the
 * loaded options page changed (narrower search, refetch, pagination) even
 * though the underlying form value never changed — the user would see an
 * empty/placeholder trigger for data that still exists.
 *
 * This suite proves, without ever fabricating a label the component never
 * actually saw:
 *  1. A value present in the loaded options renders its label (no regression).
 *  2. A value that WAS matched against options earlier (via selection or an
 *     earlier render) keeps showing that label even after the options list
 *     changes and no longer contains it.
 *  3. A value never matched against any option — never selected in this
 *     component instance, never seen in a loaded options page — falls back
 *     to the honest placeholder. It must never render the raw stored
 *     value/code as if it were a name, and must never borrow another
 *     option's label.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

Element.prototype.scrollIntoView = vi.fn()

// ─── Module mocks ─────────────────────────────────────────────────────────────

const useMasterLookupOptionsMock = vi.fn()

vi.mock("@/hooks/finance/use-master-lookup", () => ({
  useMasterLookupOptions: (...args: unknown[]) => useMasterLookupOptionsMock(...args),
}))

// ─── Import under test (after the mocks are registered) ───────────────────────

import { MasterLookupField } from "@/components/finance/cost-product-master/master-lookup-field"
import type { RequiredParamEntry } from "@/types/finance/cost-product-parameter"
import type { DraftValue } from "@/components/finance/cost-product-master/parameters-tab"

const ENTRY: RequiredParamEntry = {
  paramId: "p-1",
  paramCode: "MB_SP_CODE",
  paramName: "SP Code",
  paramShortName: "SP Code",
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
  hasValue: true,
  valueNumeric: "",
  valueText: "CMB0000733",
  valueFlag: false,
  filledAt: "",
  filledBy: "",
}

function draftWithValue(valueText: string): DraftValue {
  return {
    valueNumeric: "",
    valueText,
    valueFlag: false,
    hasValueFlag: false,
    dirty: false,
  }
}

function renderField(draft: DraftValue, onChangeLookup = vi.fn()) {
  return render(
    <MasterLookupField
      entry={ENTRY}
      draft={draft}
      allEntries={[ENTRY]}
      onChangeLookup={onChangeLookup}
    />,
  )
}

describe("MasterLookupField — BUG-2: selected label survives options changing", () => {
  beforeEach(() => {
    useMasterLookupOptionsMock.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("shows the label when the stored value IS in the currently loaded options (no regression)", async () => {
    useMasterLookupOptionsMock.mockReturnValue({
      data: [{ value: "CMB0000733", label: "MGT SAMPLE A" }],
      isLoading: false,
    })
    const user = userEvent.setup()
    renderField(draftWithValue("CMB0000733"))

    // Grab the trigger reference once — once the popover opens, cmdk's own
    // search input also exposes role="combobox", so re-querying by role
    // afterwards would be ambiguous. The trigger node itself doesn't get
    // removed on open, so the same reference stays valid throughout.
    const trigger = screen.getByRole("combobox")
    await user.click(trigger)

    expect(trigger).toHaveTextContent("MGT SAMPLE A")
  })

  it("keeps showing the previously-matched label after the value drops out of the loaded options", async () => {
    useMasterLookupOptionsMock.mockReturnValue({
      data: [{ value: "CMB0000733", label: "MGT SAMPLE A" }],
      isLoading: false,
    })
    const user = userEvent.setup()
    const { rerender } = renderField(draftWithValue("CMB0000733"))

    const trigger = screen.getByRole("combobox")
    await user.click(trigger)
    expect(trigger).toHaveTextContent("MGT SAMPLE A")

    // Close, then simulate a narrower server-side search (or a refetch) that
    // no longer contains this value — the stored form value is unchanged.
    await user.click(trigger)
    useMasterLookupOptionsMock.mockReturnValue({
      data: [{ value: "OTHER_CODE", label: "SOMETHING ELSE" }],
      isLoading: false,
    })
    rerender(
      <MasterLookupField
        entry={ENTRY}
        draft={draftWithValue("CMB0000733")}
        allEntries={[ENTRY]}
        onChangeLookup={vi.fn()}
      />,
    )
    await user.click(trigger)

    // Label must persist from memory — not disappear, and not be swapped for
    // the other option's label.
    expect(trigger).toHaveTextContent("MGT SAMPLE A")
    expect(trigger).not.toHaveTextContent("SOMETHING ELSE")
  })

  it("falls back to the honest placeholder when the value was never matched to any label — never the raw code, never another option's label", async () => {
    useMasterLookupOptionsMock.mockReturnValue({
      data: [{ value: "OTHER_CODE", label: "SOMETHING ELSE" }],
      isLoading: false,
    })
    const user = userEvent.setup()
    // "CMB0000733" was never seen in any loaded options page in this
    // component instance, so no label was ever captured for it.
    renderField(draftWithValue("CMB0000733"))

    const trigger = screen.getByRole("combobox")
    await user.click(trigger)

    expect(trigger).not.toHaveTextContent("CMB0000733")
    expect(trigger).not.toHaveTextContent("SOMETHING ELSE")
    expect(trigger).toHaveTextContent(/Select mb_spin/i)
  })
})
