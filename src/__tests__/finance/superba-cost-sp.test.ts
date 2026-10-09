import { describe, it, expect } from "vitest"

import {
  normalizeSuperbaCostSp,
  normalizeSuperbaCostSpList,
  parseSyncOutcome,
  isSyncNotConfigured,
} from "@/types/finance/superba-cost-sp"
import { superbaCostSpFormSchema } from "@/components/finance/superba-cost-sp/schema"
import { lastSyncLabel } from "@/components/finance/superba-cost-sp/superba-sync-button"

describe("normalizeSuperbaCostSp", () => {
  it("handles camelCase and coerces numbers", () => {
    const r = normalizeSuperbaCostSp({
      id: "a", legacySysId: "20241101895", shadeCode: "MC-0547", colourName: "RED",
      oldValue: "0.08", newValue: 0.09, source: "SEED", isActive: true, effective: true,
    })
    expect(r.legacySysId).toBe(20241101895)
    expect(r.oldValue).toBe(0.08)
    expect(r.newValue).toBe(0.09)
    expect(r.effective).toBe(true)
  })

  it("handles snake_case and leaves newValue undefined when absent", () => {
    const r = normalizeSuperbaCostSp({ legacy_sys_id: 5, shade_code: "X", old_value: 1.5, is_active: true })
    expect(r.legacySysId).toBe(5)
    expect(r.shadeCode).toBe("X")
    expect(r.oldValue).toBe(1.5)
    expect(r.newValue).toBeUndefined()
    expect(r.isActive).toBe(true)
  })

  it("list normalizer exposes lastSyncedAt in both casings", () => {
    expect(normalizeSuperbaCostSpList({ data: [], lastSyncedAt: "2026-10-09T00:00:00Z" }).lastSyncedAt).toBe("2026-10-09T00:00:00Z")
    expect(normalizeSuperbaCostSpList({ data: [], last_synced_at: "x" }).lastSyncedAt).toBe("x")
    expect(normalizeSuperbaCostSpList({}).lastSyncedAt).toBe("")
  })
})

describe("superbaCostSpFormSchema", () => {
  const valid = { legacySysId: "123", shadeCode: "MC-1", colourName: "", oldValue: "0", newValue: "", isActive: true }

  it("accepts a valid row with optional newValue empty", () => {
    expect(superbaCostSpFormSchema.safeParse(valid).success).toBe(true)
  })
  it("requires shade code", () => {
    expect(superbaCostSpFormSchema.safeParse({ ...valid, shadeCode: "  " }).success).toBe(false)
  })
  it("requires old value and rejects negatives", () => {
    expect(superbaCostSpFormSchema.safeParse({ ...valid, oldValue: "" }).success).toBe(false)
    expect(superbaCostSpFormSchema.safeParse({ ...valid, oldValue: "-1" }).success).toBe(false)
    expect(superbaCostSpFormSchema.safeParse({ ...valid, oldValue: "abc" }).success).toBe(false)
  })
  it("rejects negative newValue but allows 0.5", () => {
    expect(superbaCostSpFormSchema.safeParse({ ...valid, newValue: "-0.1" }).success).toBe(false)
    expect(superbaCostSpFormSchema.safeParse({ ...valid, newValue: "0.5" }).success).toBe(true)
  })
  it("requires a positive whole legacy sys id", () => {
    expect(superbaCostSpFormSchema.safeParse({ ...valid, legacySysId: "" }).success).toBe(false)
    expect(superbaCostSpFormSchema.safeParse({ ...valid, legacySysId: "1.5" }).success).toBe(false)
    expect(superbaCostSpFormSchema.safeParse({ ...valid, legacySysId: "0" }).success).toBe(false)
  })
})

describe("sync not-configured handling", () => {
  it("classifies isSuccess=false 'not configured' as non-crashing info", () => {
    const o = parseSyncOutcome({ base: { isSuccess: false, statusCode: "409", message: "Superba Cost SP sync is not configured" } })
    expect(o.kind).toBe("not_configured")
  })
  it("treats a successful response as success with counts", () => {
    const o = parseSyncOutcome({ base: { isSuccess: true, statusCode: "200", message: "ok" }, totalRows: 3, inserted: 1, updated: 1, unchanged: 1 })
    expect(o.kind).toBe("success")
    if (o.kind === "success") expect(o.result.inserted).toBe(1)
  })
  it("throws on other failures", () => {
    expect(() => parseSyncOutcome({ base: { isSuccess: false, statusCode: "500", message: "boom" } })).toThrow("boom")
  })
  it("isSyncNotConfigured matches message or 501", () => {
    expect(isSyncNotConfigured("400", "source NOT CONFIGURED")).toBe(true)
    expect(isSyncNotConfigured("501", "unimplemented rpc")).toBe(true)
    expect(isSyncNotConfigured("500", "db down")).toBe(false)
  })
})

describe("lastSyncLabel", () => {
  it("shows Never synced when empty", () => {
    expect(lastSyncLabel("")).toBe("Never synced")
    expect(lastSyncLabel(undefined)).toBe("Never synced")
  })
  it("shows a timestamp otherwise", () => {
    expect(lastSyncLabel("2026-10-09T01:00:00Z")).toMatch(/^Last synced /)
  })
})
