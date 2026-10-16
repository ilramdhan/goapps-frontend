import { describe, expect, it } from "vitest"
import { LookupSyncScope } from "@/types/generated/finance/v1/cost_product_lookup_sync"
import { filterToSyncScope, productIdsScope } from "@/components/finance/lookup-sync/scope"

describe("filterToSyncScope", () => {
  it("omits empty values", () => {
    expect(filterToSyncScope({ search: " ", productTypeIds: [], activeFilter: "" })).toEqual({ filter: {} })
  })
  it("unions productTypeId and productTypeIds without duplicates", () => {
    expect(filterToSyncScope({ productTypeId: 2, productTypeIds: [1, 2] })).toEqual({
      filter: { productTypeIds: [1, 2] },
    })
  })
  it("maps search, shade and active filter", () => {
    expect(filterToSyncScope({ search: " abc ", shadeCode: "S1", activeFilter: "active", page: 3 })).toEqual({
      filter: { search: "abc", shadeCode: "S1", activeFilter: "active" },
    })
  })
})
describe("productIdsScope", () => {
  it("wraps ids", () => {
    expect(productIdsScope([5])).toEqual({ productIds: { productSysIds: [5] } })
  })
})

describe("LookupSyncScope encoding (BFF regression)", () => {
  // Raw JSON scopes omit empty repeated fields; encoding them directly threw
  // "undefined is not iterable" — the BFF must normalize via fromPartial first.
  it("encodes a filter scope with no filters after fromPartial", () => {
    const scope = LookupSyncScope.fromPartial(filterToSyncScope({}))
    expect(() => LookupSyncScope.encode(scope).finish()).not.toThrow()
  })

  it("encodes a product-ids scope after fromPartial", () => {
    const scope = LookupSyncScope.fromPartial(productIdsScope([1, 2]))
    expect(() => LookupSyncScope.encode(scope).finish()).not.toThrow()
  })
})
