/**
 * MasterLookupField — PRODUCT_GRADE stored-value resolution (loss-param-dedup-vloss).
 *
 * NS_LOSS_TYPE / BC_LOSS_TYPE store the grade's pg_code (option `value`). Legacy
 * rows backfilled by 000470/000514 held the pg_name (option `label`) instead.
 * Both must render the grade as selected rather than an empty combobox.
 */
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

const GRADE_OPTIONS = [
  { value: "GRD-001", label: "Type 1 NS" },
  { value: "GRD-002", label: "Type 2 NS" },
]

vi.mock("@/hooks/finance/use-master-lookup", () => ({
  useMasterLookupOptions: () => ({ data: GRADE_OPTIONS, isLoading: false }),
  useMasterLookupResolveValue: () => ({ data: [], isLoading: false }),
}))

import { MasterLookupField } from "@/components/finance/cost-product-master/master-lookup-field"
import type { RequiredParamEntry } from "@/types/finance/cost-product-parameter"
import type { DraftValue } from "@/components/finance/cost-product-master/parameters-tab"

const ENTRY = {
  paramId: "p-ns",
  paramCode: "NS_LOSS_TYPE",
  paramName: "NS Loss Type",
  paramShortName: "NS Loss Type",
  dataType: "TEXT",
  paramCategory: "MASTER_LOOKUP",
  lookupMasterCode: "PRODUCT_GRADE",
} as unknown as RequiredParamEntry

function draft(valueText: string): DraftValue {
  return { valueNumeric: "", valueText, valueFlag: false, hasValueFlag: false, dirty: false }
}

function renderWith(valueText: string) {
  return render(
    <MasterLookupField entry={ENTRY} draft={draft(valueText)} allEntries={[ENTRY]} onChangeLookup={vi.fn()} />,
  )
}

describe("MasterLookupField — PRODUCT_GRADE stored value", () => {
  it("resolves a stored pg_code to its grade label", () => {
    renderWith("GRD-002")
    expect(screen.getByRole("combobox")).toHaveTextContent("Type 2 NS")
  })

  it("tolerates a legacy stored pg_name by matching the option label", () => {
    renderWith("Type 1 NS")
    expect(screen.getByRole("combobox")).toHaveTextContent("Type 1 NS")
  })

  it("shows the placeholder for an unknown value (never the raw text)", () => {
    renderWith("Nope")
    expect(screen.getByRole("combobox")).toHaveTextContent("Select PRODUCT_GRADE")
  })
})
