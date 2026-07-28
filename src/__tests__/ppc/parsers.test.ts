// PPC response parsers — verify ts-proto fromJSON handles camelCase + snake_case
// and coerces int64 pagination.totalItems from string.
import { describe, it, expect } from "vitest"
import { ListMachineGroupsResponseParser } from "@/types/ppc/master"
import { ListDemandsResponseParser } from "@/types/ppc/demand"
import { ListWorkOrdersResponseParser } from "@/types/ppc/work-order"

describe("PPC parsers", () => {
  it("parses machine-group list with snake_case + string totalItems", () => {
    const raw = {
      base: { isSuccess: true, statusCode: "200", message: "ok", validationErrors: [] },
      data: [{ group_id: 1, group_name: "TXT DTY", group_area: "AREA_CODE_TXT" }],
      pagination: { current_page: 1, page_size: 10, total_items: "42", total_pages: 5 },
    }
    const res = ListMachineGroupsResponseParser.fromJSON(raw)
    expect(res.base?.isSuccess).toBe(true)
    expect(res.data[0].groupId).toBe(1)
    expect(res.data[0].groupName).toBe("TXT DTY")
    // int64 arrives as string; Number(...) done in hooks — parser keeps it addressable.
    expect(Number(res.pagination?.totalItems)).toBe(42)
  })

  it("parses demand list with camelCase", () => {
    const raw = {
      base: { isSuccess: true },
      data: [{ demandId: 7, productCode: "P-1", qtyOriginal: "1000.5", status: "DEMAND_STATUS_CONFIRMED" }],
      pagination: { currentPage: 1, pageSize: 10, totalItems: "1", totalPages: 1 },
    }
    const res = ListDemandsResponseParser.fromJSON(raw)
    expect(res.data[0].demandId).toBe(7)
    expect(res.data[0].qtyOriginal).toBe("1000.5")
  })

  it("parses work-order list preserving nested children arrays", () => {
    const raw = {
      base: { isSuccess: true },
      data: [{ woId: 3, woNo: "WO-003", lotNo: "L1", parameters: [], rmAllocations: [], productionActuals: [] }],
      pagination: { totalItems: "3" },
    }
    const res = ListWorkOrdersResponseParser.fromJSON(raw)
    expect(res.data[0].woNo).toBe("WO-003")
    expect(Array.isArray(res.data[0].parameters)).toBe(true)
  })
})
