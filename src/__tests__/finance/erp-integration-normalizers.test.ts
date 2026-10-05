import { describe, it, expect } from "vitest"

import {
  normalizeErpBatch,
  normalizeErpList,
  normalizeErpAdjPreview,
  normalizeErpBacktestReport,
  normalizeErpJobRef,
} from "@/types/finance/erp-integration"

describe("erp-integration normalizers", () => {
  it("handles camelCase and snake_case identically", () => {
    const camel = normalizeErpBatch({ batchId: "7", createdBy: "a", allowedActions: ["x"] })
    const snake = normalizeErpBatch({ batch_id: "7", created_by: "a", allowed_actions: ["x"] })
    expect(camel).toEqual(snake)
    expect(camel.batchId).toBe(7)
  })

  it("normalizes enums from string name and number", () => {
    const s = normalizeErpBatch({ status: "ERP_BATCH_STATUS_VALIDATED" })
    expect(s.status).toBe("VALIDATED")
    const n = normalizeErpBatch({ status: 1 })
    expect(n.status).toMatch(/^[A-Z_]+$/)
    expect(n.status.startsWith("ERP_BATCH_STATUS_")).toBe(false)
  })

  it("missing optional fields get safe defaults", () => {
    const b = normalizeErpBatch({})
    expect(b.status).toBe("UNSPECIFIED")
    expect(b.allowedActions).toEqual([])
    expect(b.progress).toBe(0)
    expect(normalizeErpAdjPreview({}).v07).toBeUndefined()
  })

  it("normalizeErpList applies Number(totalItems)", () => {
    const out = normalizeErpList(
      { base: { isSuccess: true }, data: [{ batch_id: 1 }], pagination: { currentPage: 1, pageSize: 10, totalItems: "123", totalPages: 13 } },
      normalizeErpBatch
    )
    expect(out.pagination.totalItems).toBe(123)
    expect(out.items[0].batchId).toBe(1)
  })

  it("backtest counts become numbers; job ref keeps ids", () => {
    expect(normalizeErpBacktestReport({ counts: { MATCH: "3" } }).counts.MATCH).toBe(3)
    expect(normalizeErpJobRef({ job_id: "j", batch_id: "9" })).toEqual({ jobId: "j", batchId: 9 })
  })
})
