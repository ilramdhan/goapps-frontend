// RM denier override — per-product override of the denier used for one RM
// (PRODUCT or GROUP) when computing DENIER-mode RM ratios. See
// finance/v1/cost_product_master.proto RMDenierOverride.

import type { CostRouteRm, CostRouteSeq } from "@/types/finance/cost-route"

export type RMDenierOverrideType = "PRODUCT" | "GROUP"

export interface RMDenierOverride {
  id: number
  productSysId: number
  rmType: RMDenierOverrideType
  rmProductSysId: number
  rmProductCode: string
  rmProductName: string
  rmGroupCode: string
  rmGroupName: string
  denier: number
  reason: string
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
}

export interface DuplicateProductRef {
  productSysId: number
  productCode: string
  productName: string
}

export interface RMDenierOverrideList {
  items: RMDenierOverride[]
  duplicateProducts: DuplicateProductRef[]
}

/** Identity of an RM: either a product (by sys id) or an RM group (by code). */
export interface RMDenierOverrideKey {
  rmType: RMDenierOverrideType
  rmProductSysId?: number
  rmGroupCode?: string
}

export interface UpsertRMDenierOverrideInput extends RMDenierOverrideKey {
  productSysId: number
  denier: number
  reason: string
  applyToDuplicates: boolean
}

export interface DeleteRMDenierOverrideInput extends RMDenierOverrideKey {
  productSysId: number
  applyToDuplicates: boolean
}

export interface UpsertRMDenierOverrideResult {
  data: RMDenierOverride | null
  appliedProductSysIds: number[]
}

export interface DeleteRMDenierOverrideResult {
  deletedCount: number
  appliedProductSysIds: number[]
}

// ---------- normalizers (camelCase + snake_case) ----------

type Raw = Record<string, unknown>

const str = (v: unknown): string => (typeof v === "string" ? v : v === undefined || v === null ? "" : String(v))
const num = (v: unknown): number => {
  const x = Number(v ?? 0)
  return Number.isFinite(x) ? x : 0
}
const pick = (raw: Raw, camel: string, snake: string): unknown => raw[camel] ?? raw[snake]

export function normalizeRMDenierOverrideType(v: unknown): RMDenierOverrideType {
  return str(v).toUpperCase() === "GROUP" ? "GROUP" : "PRODUCT"
}

export function normalizeRMDenierOverride(raw: Raw | null | undefined): RMDenierOverride {
  const r = raw ?? {}
  return {
    id: num(r.id),
    productSysId: num(pick(r, "productSysId", "product_sys_id")),
    rmType: normalizeRMDenierOverrideType(pick(r, "rmType", "rm_type")),
    rmProductSysId: num(pick(r, "rmProductSysId", "rm_product_sys_id")),
    rmProductCode: str(pick(r, "rmProductCode", "rm_product_code")),
    rmProductName: str(pick(r, "rmProductName", "rm_product_name")),
    rmGroupCode: str(pick(r, "rmGroupCode", "rm_group_code")),
    rmGroupName: str(pick(r, "rmGroupName", "rm_group_name")),
    denier: num(r.denier),
    reason: str(r.reason),
    createdAt: str(pick(r, "createdAt", "created_at")),
    createdBy: str(pick(r, "createdBy", "created_by")),
    updatedAt: str(pick(r, "updatedAt", "updated_at")),
    updatedBy: str(pick(r, "updatedBy", "updated_by")),
  }
}

export function normalizeDuplicateProductRef(raw: Raw | null | undefined): DuplicateProductRef {
  const r = raw ?? {}
  return {
    productSysId: num(pick(r, "productSysId", "product_sys_id")),
    productCode: str(pick(r, "productCode", "product_code")),
    productName: str(pick(r, "productName", "product_name")),
  }
}

export function normalizeRMDenierOverrideList(raw: Raw | null | undefined): RMDenierOverrideList {
  const r = raw ?? {}
  const data = Array.isArray(r.data) ? (r.data as Raw[]) : []
  const dups = pick(r, "duplicateProducts", "duplicate_products")
  return {
    items: data.map(normalizeRMDenierOverride),
    duplicateProducts: Array.isArray(dups) ? (dups as Raw[]).map(normalizeDuplicateProductRef) : [],
  }
}

export function normalizeProductSysIds(v: unknown): number[] {
  return Array.isArray(v) ? v.map((x) => num(x)).filter((x) => x > 0) : []
}

// ---------- identity helpers ----------

/** Stable identity string: "PRODUCT:<sysId>" or "GROUP:<code>" (also the `?rm=` deep-link format). */
export function rmOverrideKeyOf(k: RMDenierOverrideKey): string {
  return k.rmType === "GROUP" ? `GROUP:${k.rmGroupCode ?? ""}` : `PRODUCT:${k.rmProductSysId ?? 0}`
}

/** Identity of a route RM line, or null for lines that cannot be overridden (ITEM). */
export function routeRmKeyOf(rm: Pick<CostRouteRm, "rmType" | "rmProductSysId" | "rmGroupCode">): string | null {
  if (rm.rmType === "PRODUCT" && rm.rmProductSysId) return `PRODUCT:${rm.rmProductSysId}`
  if (rm.rmType === "GROUP" && rm.rmGroupCode) return `GROUP:${rm.rmGroupCode}`
  return null
}

/** Parses "PRODUCT:<id>" / "GROUP:<code>" into a key; null when malformed. */
export function parseRmOverrideKey(s: string | null | undefined): RMDenierOverrideKey | null {
  if (!s) return null
  const idx = s.indexOf(":")
  if (idx < 0) return null
  const type = s.slice(0, idx).toUpperCase()
  const val = s.slice(idx + 1)
  if (type === "PRODUCT") {
    const id = Number(val)
    return Number.isFinite(id) && id > 0 ? { rmType: "PRODUCT", rmProductSysId: id } : null
  }
  if (type === "GROUP" && val) return { rmType: "GROUP", rmGroupCode: val }
  return null
}

// ---------- live preview ----------

/**
 * Client-side preview of a seq's DENIER-mode RM ratios with candidate
 * overrides substituted. Mirrors costroute.ComputeSeqRMRatios:
 * - denier lines are those the backend marked ratioSource "DENIER", plus any
 *   GROUP line (head without denier) that has an override (spec D4);
 * - a line's denier is the override when given (final value — spandex is NOT
 *   divided by SPANDEX_DRAFT), else the backend-resolved `denier`;
 * - ratio = d / Σd over the denier lines; Σd = 0 → 0.
 * Non-denier lines keep their computedRatio. Returned map is keyed by rm.uid.
 */
export function computePreviewRatios(
  seq: Pick<CostRouteSeq, "rms">,
  overrides: Map<string, number>,
): Map<string, number> {
  const out = new Map<string, number>()
  const lines: { uid: string; d: number }[] = []
  for (const rm of seq.rms) {
    const key = routeRmKeyOf(rm)
    const ov = key ? overrides.get(key) : undefined
    const hasOv = ov !== undefined && Number.isFinite(ov) && ov > 0
    const isDenierLine = rm.ratioSource === "DENIER" || (hasOv && rm.rmType !== "ITEM")
    if (!isDenierLine) {
      out.set(rm.uid, rm.computedRatio ?? rm.routeRmRatio)
      continue
    }
    const d = hasOv ? (ov as number) : Math.max(0, rm.denier ?? 0)
    lines.push({ uid: rm.uid, d })
  }
  const total = lines.reduce((s, l) => s + l.d, 0)
  for (const l of lines) out.set(l.uid, total > 0 ? l.d / total : 0)
  return out
}
