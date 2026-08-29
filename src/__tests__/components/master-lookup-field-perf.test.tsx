/**
 * MasterLookupField — performance regression tests (2026-08-26).
 *
 * User complaint: "ketika buka dropdown sp code dihalaman detail master
 * product kenapa lag atau berat sekali?" (SP Code = MB_SP_CODE param,
 * lookup master MB_SPIN, which has ~2700 rows in production — see
 * `docs/superpowers/state/U-mbspin-lookup-detail-STATE.md` and
 * `goapps-backend/services/finance/migrations/postgres/000415_seed_mb_spin_from_oracle_csv.up.sql`).
 *
 * Root cause (proven, not guessed):
 *  1. Backend `ListMasterOptions` (lookup_master_repository.go) had no LIMIT —
 *     the entire mst_mb_spin table (~2700 rows) was always returned.
 *  2. `master-lookup-field.tsx` rendered every option as a `CommandItem`,
 *     each with a second detail row (denier/filament/LDR) adding ~9 DOM
 *     nodes/item — ~24k DOM nodes for one dropdown open.
 *  3. The lookup hook fired eagerly on every parameter row's mount, not on
 *     popover open.
 *
 * ⭐ DIPERBARUI 2026-08-26 (perf: SP Code dropdown lag, server-side search) —
 * search + row limiting moved server-side (`ListMasterOptions` now takes
 * `search`/`limit` and does `ILIKE` + `LIMIT` in SQL — see
 * `lookup_master_repository.go`). The frontend no longer filters the option
 * array in JS. This suite was updated accordingly:
 *  - The "narrows via client-side search" test is REPLACED by a test proving
 *    typed search text is forwarded to `useMasterLookupOptions` as an
 *    argument (the mechanism that now does the actual filtering, server-side
 *    — a mocked hook can't exercise SQL filtering, so this is the correct
 *    boundary for a component-level test).
 *  - The render cap stays: the client still requests DISPLAY_LIMIT + 1 rows
 *    and renders only DISPLAY_LIMIT, using the "+1 came back" signal to show
 *    an honest (but no-longer-exact-total) "may be more" notice instead of
 *    the old "N of M" wording, since the client no longer knows the true
 *    total match count.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

Element.prototype.scrollIntoView = vi.fn()

// ─── Module mocks ─────────────────────────────────────────────────────────────

const LARGE_OPTION_COUNT = 201 // DISPLAY_LIMIT (200) + 1 over-fetch row

function buildOptions(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    value: `CMB${String(i).padStart(7, "0")}`,
    label: `SPIN ITEM ${i}`,
    denier: 150 + i,
    filament: 48,
    ldrPrsn: 1.4,
    runLdrPct: 1.42,
  }))
}

const LARGE_OPTIONS = buildOptions(LARGE_OPTION_COUNT)

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

describe("MasterLookupField — performance (SP Code dropdown lag fix)", () => {
  beforeEach(() => {
    useMasterLookupOptionsMock.mockReset()
    useMasterLookupOptionsMock.mockReturnValue({ data: LARGE_OPTIONS, isLoading: false })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("does not fetch options until the popover is opened (lazy fetch)", () => {
    renderField()

    // Mounted, but not opened yet — every call so far must have been made
    // with enabled=false. Hook signature is now (lookupMasterCode, enabled,
    // search, limit).
    expect(useMasterLookupOptionsMock).toHaveBeenCalled()
    for (const call of useMasterLookupOptionsMock.mock.calls) {
      expect(call[0]).toBe("MB_SPIN")
      expect(call[1]).toBe(false)
    }
  })

  it("passes enabled=true and the display-limit+1 to the lookup hook once the popover opens", async () => {
    const user = userEvent.setup()
    renderField()

    await user.click(screen.getByRole("combobox"))

    const lastCall =
      useMasterLookupOptionsMock.mock.calls[useMasterLookupOptionsMock.mock.calls.length - 1]
    expect(lastCall[0]).toBe("MB_SPIN")
    expect(lastCall[1]).toBe(true)
    // limit is the 4th arg: DISPLAY_LIMIT (200) + 1 over-fetch row, used to
    // detect "more results exist" without a separate COUNT(*).
    expect(lastCall[3]).toBe(201)
  })

  it("forwards typed search text to the lookup hook (server now does the filtering)", async () => {
    const user = userEvent.setup()
    renderField()

    await user.click(screen.getByRole("combobox"))
    const searchBox = screen.getByPlaceholderText(/search mb_spin/i)
    await user.type(searchBox, "ITEM 4")

    const lastCall =
      useMasterLookupOptionsMock.mock.calls[useMasterLookupOptionsMock.mock.calls.length - 1]
    expect(lastCall[0]).toBe("MB_SPIN")
    // search is the 3rd arg — debouncing itself happens inside the hook
    // (mocked away here), so the component just needs to pass the raw text
    // through on every keystroke.
    expect(lastCall[2]).toBe("ITEM 4")
  })

  it("caps rendered options at 200 even when 201 are returned, and shows an honest (non-exact-total) notice", async () => {
    const user = userEvent.setup()
    renderField()

    await user.click(screen.getByRole("combobox"))

    const items = await screen.findAllByRole("option")
    expect(items).toHaveLength(200)

    // The client no longer knows the true server-side total match count (the
    // server does the limiting now), so the notice must not claim an exact
    // "N of M" — just that more may exist.
    expect(screen.getByText(/Menampilkan 200 hasil teratas/)).toBeInTheDocument()
    expect(screen.getByText(/mungkin ada hasil lain/)).toBeInTheDocument()
  })

  it("does not render a truncation notice when the option list is small (no regression on normal lookups)", async () => {
    useMasterLookupOptionsMock.mockReturnValue({
      data: LARGE_OPTIONS.slice(0, 5),
      isLoading: false,
    })
    const user = userEvent.setup()
    renderField()

    await user.click(screen.getByRole("combobox"))

    const items = await screen.findAllByRole("option")
    expect(items).toHaveLength(5)
    expect(screen.queryByText(/mungkin ada hasil lain/)).not.toBeInTheDocument()
  })
})
