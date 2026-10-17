// RM denier override API - calls the
// /api/v1/finance/cost-product-masters/{productSysId}/rm-denier-overrides BFF route.

import {
  type DeleteRMDenierOverrideInput,
  type DeleteRMDenierOverrideResult,
  type RMDenierOverrideList,
  type UpsertRMDenierOverrideInput,
  type UpsertRMDenierOverrideResult,
  normalizeProductSysIds,
  normalizeRMDenierOverride,
  normalizeRMDenierOverrideList,
} from "@/types/finance/rm-denier-override"

interface Base {
  isSuccess?: boolean
  message?: string
  statusCode?: string
}

type Json = { base?: Base } & Record<string, unknown>

const basePath = (productSysId: number) =>
  `/api/v1/finance/cost-product-masters/${productSysId}/rm-denier-overrides`

async function call(url: string, init: RequestInit, fallback: string): Promise<Json> {
  const res = await fetch(url, { credentials: "include", ...init })
  const json = (await res.json()) as Json
  if (!json.base?.isSuccess) throw new Error(json.base?.message || fallback)
  return json
}

export async function fetchRMDenierOverrides(productSysId: number): Promise<RMDenierOverrideList> {
  const json = await call(basePath(productSysId), { method: "GET" }, "Gagal memuat override denier")
  return normalizeRMDenierOverrideList(json)
}

export async function upsertRMDenierOverride(input: UpsertRMDenierOverrideInput): Promise<UpsertRMDenierOverrideResult> {
  const json = await call(
    basePath(input.productSysId),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rmType: input.rmType,
        rmProductSysId: input.rmType === "PRODUCT" ? input.rmProductSysId ?? 0 : 0,
        rmGroupCode: input.rmType === "GROUP" ? input.rmGroupCode ?? "" : "",
        denier: input.denier,
        reason: input.reason,
        applyToDuplicates: input.applyToDuplicates,
      }),
    },
    "Gagal menyimpan override denier",
  )
  return {
    data: json.data ? normalizeRMDenierOverride(json.data as Record<string, unknown>) : null,
    appliedProductSysIds: normalizeProductSysIds(json.appliedProductSysIds ?? json.applied_product_sys_ids),
  }
}

export async function deleteRMDenierOverride(input: DeleteRMDenierOverrideInput): Promise<DeleteRMDenierOverrideResult> {
  const qs = new URLSearchParams({
    rmType: input.rmType,
    rmProductSysId: String(input.rmType === "PRODUCT" ? input.rmProductSysId ?? 0 : 0),
    rmGroupCode: input.rmType === "GROUP" ? input.rmGroupCode ?? "" : "",
    applyToDuplicates: String(input.applyToDuplicates),
  })
  const json = await call(`${basePath(input.productSysId)}?${qs}`, { method: "DELETE" }, "Gagal menghapus override denier")
  return {
    deletedCount: Number(json.deletedCount ?? json.deleted_count ?? 0),
    appliedProductSysIds: normalizeProductSysIds(json.appliedProductSysIds ?? json.applied_product_sys_ids),
  }
}
