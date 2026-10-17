import { describe, it, expect } from "vitest"

import {
  computePreviewRatios,
  normalizeRMDenierOverride,
  normalizeRMDenierOverrideList,
  parseRmOverrideKey,
  rmOverrideKeyOf,
  routeRmKeyOf,
} from "@/types/finance/rm-denier-override"
import { normalizeCostRouteRm } from "@/types/finance/cost-route"
import { normalizeCostRmDetail } from "@/types/finance/cost-calc"
import { countCopies } from "@/hooks/finance/use-rm-denier-override"
import type { CostRouteRm } from "@/types/finance/cost-route"

describe("normalizeRMDenierOverride", () => {
  it("reads camelCase", () => {
    const o = normalizeRMDenierOverride({
      id: "7", productSysId: "10", rmType: "group", rmGroupCode: "SPX", rmGroupName: "Spandex",
      denier: 20, reason: "special", updatedBy: "u1",
    })
    expect(o).toMatchObject({ id: 7, productSysId: 10, rmType: "GROUP", rmGroupCode: "SPX", denier: 20, reason: "special" })
  })

  it("reads snake_case", () => {
    const o = normalizeRMDenierOverride({
      id: 1, product_sys_id: 10, rm_type: "PRODUCT", rm_product_sys_id: "55", rm_product_code: "AA",
      rm_product_name: "Yarn AA", denier: "75.5", created_at: "2026-10-17",
    })
    expect(o).toMatchObject({ rmType: "PRODUCT", rmProductSysId: 55, rmProductCode: "AA", denier: 75.5, createdAt: "2026-10-17" })
  })

  it("normalizes list with duplicates in both casings and tolerates missing fields", () => {
    expect(normalizeRMDenierOverrideList({ data: [{ id: 1 }], duplicate_products: [{ product_sys_id: 2, product_code: "A-C1" }] }))
      .toMatchObject({ items: [{ id: 1 }], duplicateProducts: [{ productSysId: 2, productCode: "A-C1" }] })
    expect(normalizeRMDenierOverrideList({ duplicateProducts: [{ productSysId: 3 }] }).duplicateProducts[0].productSysId).toBe(3)
    expect(normalizeRMDenierOverrideList(undefined)).toEqual({ items: [], duplicateProducts: [] })
  })
})

describe("route / cost-calc additive fields", () => {
  it("normalizes denierOverridden (camel + snake), default false", () => {
    expect(normalizeCostRouteRm({ denierOverridden: true }).denierOverridden).toBe(true)
    expect(normalizeCostRouteRm({ denier_overridden: true }).denierOverridden).toBe(true)
    expect(normalizeCostRouteRm({}).denierOverridden).toBe(false)
  })
  it("normalizes denierSource", () => {
    expect(normalizeCostRmDetail({ denierSource: "OVERRIDE" }).denierSource).toBe("OVERRIDE")
    expect(normalizeCostRmDetail({ denier_source: "MASTER" }).denierSource).toBe("MASTER")
    expect(normalizeCostRmDetail({}).denierSource).toBe("")
  })
})

describe("RM identity keys", () => {
  it("round-trips keys", () => {
    expect(rmOverrideKeyOf({ rmType: "PRODUCT", rmProductSysId: 5 })).toBe("PRODUCT:5")
    expect(rmOverrideKeyOf({ rmType: "GROUP", rmGroupCode: "G:1" })).toBe("GROUP:G:1")
    expect(parseRmOverrideKey("GROUP:G:1")).toEqual({ rmType: "GROUP", rmGroupCode: "G:1" })
    expect(parseRmOverrideKey("product:5")).toEqual({ rmType: "PRODUCT", rmProductSysId: 5 })
    expect(parseRmOverrideKey("PRODUCT:x")).toBeNull()
    expect(parseRmOverrideKey("ITEM:1")).toBeNull()
    expect(parseRmOverrideKey(null)).toBeNull()
  })
  it("ITEM lines have no key", () => {
    expect(routeRmKeyOf({ rmType: "ITEM" })).toBeNull()
  })
})

const rm = (p: Partial<CostRouteRm>): CostRouteRm =>
  ({ uid: p.uid ?? "x", rmId: 0, seqId: 1, parentProductSysId: 1, rmType: "ITEM", routeRmRatio: 1, ...p }) as CostRouteRm

describe("computePreviewRatios", () => {
  const seq = {
    rms: [
      rm({ uid: "a", rmType: "PRODUCT", rmProductSysId: 11, ratioSource: "DENIER", denier: 75, computedRatio: 0.75 }),
      // spandex: backend already divided 40 / draft 1.6 = 25
      rm({ uid: "b", rmType: "GROUP", rmGroupCode: "SPX", ratioSource: "DENIER", denier: 25, computedRatio: 0.25 }),
      rm({ uid: "c", rmType: "ITEM", rmItemCode: "OIL", ratioSource: "INPUT", routeRmRatio: 0.02, computedRatio: 0.02 }),
      rm({ uid: "d", rmType: "GROUP", rmGroupCode: "NODEN", ratioSource: "INPUT", routeRmRatio: 0.1, computedRatio: 0.1 }),
    ],
  }

  it("matches backend ratios without overrides", () => {
    const r = computePreviewRatios(seq, new Map())
    expect(r.get("a")).toBeCloseTo(0.75)
    expect(r.get("b")).toBeCloseTo(0.25)
    expect(r.get("c")).toBe(0.02)
    expect(r.get("d")).toBe(0.1)
  })

  it("substitutes a product override", () => {
    const r = computePreviewRatios(seq, new Map([["PRODUCT:11", 25]]))
    expect(r.get("a")).toBeCloseTo(0.5)
    expect(r.get("b")).toBeCloseTo(0.5)
  })

  it("spandex override is final (not divided by draft)", () => {
    const r = computePreviewRatios(seq, new Map([["GROUP:SPX", 75]]))
    expect(r.get("a")).toBeCloseTo(0.5)
    expect(r.get("b")).toBeCloseTo(0.5)
  })

  it("a GROUP without head denier becomes a denier line when overridden", () => {
    const r = computePreviewRatios(seq, new Map([["GROUP:NODEN", 100]]))
    expect(r.get("a")).toBeCloseTo(0.375)
    expect(r.get("b")).toBeCloseTo(0.125)
    expect(r.get("d")).toBeCloseTo(0.5)
    expect(r.get("c")).toBe(0.02)
  })

  it("ignores non-positive overrides and returns 0 when Σd = 0", () => {
    expect(computePreviewRatios(seq, new Map([["PRODUCT:11", 0]])).get("a")).toBeCloseTo(0.75)
    const zero = { rms: [rm({ uid: "z", rmType: "PRODUCT", rmProductSysId: 1, ratioSource: "DENIER", denier: 0 })] }
    expect(computePreviewRatios(zero, new Map()).get("z")).toBe(0)
  })
})

describe("countCopies", () => {
  it("excludes the parent regardless of whether it is listed", () => {
    expect(countCopies([10, 11, 12], 10)).toBe(2)
    expect(countCopies([11, 12], 10)).toBe(2)
    expect(countCopies([], 10)).toBe(0)
  })
})
