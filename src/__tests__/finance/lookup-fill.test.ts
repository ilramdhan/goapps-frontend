import { describe, it, expect } from "vitest"
import { computeLookupFillPatches } from "@/components/finance/cost-product-master/lookup-fill"
import type { RequiredParamEntry } from "@/types/finance/cost-product-parameter"
import type { LookupFillValuesResponse } from "@/types/finance/yarn-master"

function entry(paramCode: string, extra: Partial<RequiredParamEntry> = {}): RequiredParamEntry {
  return {
    paramId: `id-${paramCode}`,
    paramCode,
    dataType: "NUMBER",
    ...extra,
  } as RequiredParamEntry
}

const entries = [
  entry("DELIVERY_PACK_CODE", { dataType: "TEXT" }),
  entry("DELIVERY_BOB_RATE", { lookupFillGroupCode: "DELIVERY_PACK_CODE" }),
  entry("DELIVERY_BOX_RATE", { lookupFillGroupCode: "DELIVERY_PACK_CODE" }),
  entry("CAPTIVE_BOB_RATE", { lookupFillGroupCode: "CAPTIVE_PACK_CODE" }),
  entry("OIL_RATE", { lookupFillGroupCode: "DELIVERY_PACK_CODE" }),
]

const fills = (n: Record<string, number>, t: Record<string, string> = {}) =>
  ({ numericFills: n, textFills: t, displayLabel: "x" }) as LookupFillValuesResponse

describe("computeLookupFillPatches", () => {
  it("overwrites children with the newly selected row's values", () => {
    const p = computeLookupFillPatches(entries, "DELIVERY_PACK_CODE", fills({ DELIVERY_BOB_RATE: 0.5, DELIVERY_BOX_RATE: 1.25 }))
    expect(p.get("id-DELIVERY_BOB_RATE")).toEqual({ valueNumeric: "0.5" })
    expect(p.get("id-DELIVERY_BOX_RATE")).toEqual({ valueNumeric: "1.25" })
  })

  it("clears children the new row has no value for", () => {
    const p = computeLookupFillPatches(entries, "DELIVERY_PACK_CODE", fills({ DELIVERY_BOB_RATE: 0.5 }))
    expect(p.get("id-DELIVERY_BOX_RATE")).toEqual({ valueNumeric: "" })
  })

  it("does not touch other groups or engine-resolved OIL_RATE", () => {
    const p = computeLookupFillPatches(entries, "DELIVERY_PACK_CODE", fills({}))
    expect(p.has("id-CAPTIVE_BOB_RATE")).toBe(false)
    expect(p.has("id-OIL_RATE")).toBe(false)
  })

  it("keeps state when the fill fetch failed", () => {
    expect(computeLookupFillPatches(entries, "DELIVERY_PACK_CODE", null).size).toBe(0)
  })
})
