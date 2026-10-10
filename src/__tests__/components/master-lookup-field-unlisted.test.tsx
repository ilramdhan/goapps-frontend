import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

Element.prototype.scrollIntoView = vi.fn()

// Stable references: fresh arrays per render would loop the knownLabel effect.
const OPTIONS_RESULT = { data: [{ value: "CMB1", label: "SPIN ONE" }], isLoading: false }
const RESOLVE_RESULT = { data: [], isLoading: false }
vi.mock("@/hooks/finance/use-master-lookup", () => ({
  useMasterLookupOptions: () => OPTIONS_RESULT,
  useMasterLookupResolveValue: () => RESOLVE_RESULT,
}))

import { MasterLookupField } from "@/components/finance/cost-product-master/master-lookup-field"
import {
  isAutoMbSourceFill,
  unlistedLookupLabel,
} from "@/components/finance/cost-product-master/parameters-tab"
import type { RequiredParamEntry } from "@/types/finance/cost-product-parameter"

const mk = (over: Partial<RequiredParamEntry>) =>
  ({ paramId: "1", paramCode: "MB_SP_CODE", lookupMasterCode: "MB_SPIN", displayValue: "", valueText: "", filledBy: "", ...over }) as RequiredParamEntry
const draft = (valueText: string) => ({ valueNumeric: "", valueText, valueFlag: false, hasValueFlag: false, dirty: false })

describe("non-option MB_SP_CODE value (Superba shade)", () => {
  it("renders the unlisted label instead of the placeholder", () => {
    const entry = mk({})
    render(
      <MasterLookupField entry={entry} draft={draft("SP30963")} allEntries={[entry]} onChangeLookup={vi.fn()} unlistedLabel="SP30963 — RED" />,
    )
    expect(screen.getByRole("combobox").textContent).toContain("SP30963 — RED")
  })
  it("still shows the option label for a real spin value", () => {
    const entry = mk({})
    render(
      <MasterLookupField entry={entry} draft={draft("CMB1")} allEntries={[entry]} onChangeLookup={vi.fn()} unlistedLabel="x" />,
    )
    expect(screen.getByRole("combobox").textContent).toContain("SPIN ONE")
  })
  it("unlistedLookupLabel prefers MB_SP_DYE, falls back to code when auto-filled", () => {
    const code = mk({ filledBy: "auto_mb_source" })
    const dye = mk({ paramId: "2", paramCode: "MB_SP_DYE", valueText: "RED" })
    expect(unlistedLookupLabel(code, draft("SP1"), [code, dye], undefined)).toBe("SP1 — RED")
    expect(unlistedLookupLabel(code, draft("SP1"), [code], undefined)).toBe("SP1")
    expect(unlistedLookupLabel(mk({}), draft("SP1"), [mk({})], undefined)).toBeUndefined()
  })
  it("recognises auto fill markers", () => {
    expect(isAutoMbSourceFill("auto_mb_source")).toBe(true)
    expect(isAutoMbSourceFill("backfill_mb_source_000569")).toBe(true)
    expect(isAutoMbSourceFill("user")).toBe(false)
  })
})
