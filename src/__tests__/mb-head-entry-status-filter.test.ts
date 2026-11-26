import { describe, it, expect } from "vitest"
import { parseEntryStatuses } from "@/app/api/v1/finance/mb-heads/entry-statuses"
import { buildQueryString } from "@/lib/api/utils"

describe("parseEntryStatuses", () => {
  it("returns [] when absent", () => {
    expect(parseEntryStatuses(new URLSearchParams("page=1"))).toEqual([])
  })
  it("parses comma-separated, repeated, snake/camel, drops unknown and dupes", () => {
    const p = new URLSearchParams("entry_statuses=submitted,APPROVED&entryStatuses=SUBMITTED&entry_statuses=BOGUS")
    expect(parseEntryStatuses(p)).toEqual(["SUBMITTED", "APPROVED"])
  })
})

describe("select-all query propagation", () => {
  it("fetch-all params (filters minus paging) serialize entry statuses so the BFF filters", () => {
    const qs = buildQueryString({ search: "", entryStatuses: ["SUBMITTED"], page: 1, pageSize: 100 })
    expect(parseEntryStatuses(new URLSearchParams(qs))).toEqual(["SUBMITTED"])
  })
  it("omits the param when no status selected", () => {
    expect(parseEntryStatuses(new URLSearchParams(buildQueryString({ entryStatuses: [] })))).toEqual([])
  })
})
