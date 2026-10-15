import { describe, expect, it } from "vitest"
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
