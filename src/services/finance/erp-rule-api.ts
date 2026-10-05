// ERP Rule API service — calls the BFF (never the backend directly).
// Path decision: the BFF folder src/app/api/v1/finance/master/ is used for proto-prefixed
// master paths (mb-*), so rules live under /api/v1/finance/master/erp-rules (1:1 with proto).

import {
  normalizeErpList,
  type ErpList,
} from "@/types/finance/erp-integration"
import {
  normalizeValLossRule,
  normalizeSellPrice,
  normalizeGradeGroup,
  normalizeRuleChange,
  type ValLossRule,
  type SellPrice,
  type GradeGroup,
  type RuleChange,
} from "@/types/finance/erp-rule"

const BASE = "/api/v1/finance/master/erp-rules"

type Loose = Record<string, unknown>

async function call(path: string, method = "GET", body?: unknown): Promise<Loose> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  const json = (await res.json()) as Loose
  const base = json.base as { isSuccess?: boolean; message?: string } | undefined
  if (base?.isSuccess === false) throw new Error(base.message || "ERP rule request failed")
  return json
}

function qs(params?: Record<string, string | number | boolean | undefined>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== "") sp.set(k, String(v))
  const s = sp.toString()
  return s ? `?${s}` : ""
}

export async function listValLossRules(params?: Record<string, string | number | boolean | undefined>): Promise<ErpList<ValLossRule>> {
  return normalizeErpList(await call(`/valloss${qs(params)}`), normalizeValLossRule)
}

export async function createValLossRule(body: Partial<ValLossRule>): Promise<ValLossRule> {
  const json = await call("/valloss", "POST", body)
  return normalizeValLossRule((json.data ?? {}) as Loose)
}

export async function updateValLossRule(id: number, body: Partial<ValLossRule>): Promise<ValLossRule> {
  const json = await call(`/valloss/${id}`, "PUT", body)
  return normalizeValLossRule((json.data ?? {}) as Loose)
}

export async function deleteValLossRule(id: number): Promise<void> {
  await call(`/valloss/${id}`, "DELETE")
}

export async function listSellPrices(params?: Record<string, string | number | boolean | undefined>): Promise<ErpList<SellPrice>> {
  return normalizeErpList(await call(`/sell-prices${qs(params)}`), normalizeSellPrice)
}

export async function upsertSellPrice(basis: string, body: Partial<SellPrice>): Promise<SellPrice> {
  const json = await call(`/sell-prices/${encodeURIComponent(basis)}`, "PUT", body)
  return normalizeSellPrice((json.data ?? {}) as Loose)
}

export async function listGradeGroups(params?: Record<string, string | number | boolean | undefined>): Promise<ErpList<GradeGroup>> {
  return normalizeErpList(await call(`/grade-groups${qs(params)}`), normalizeGradeGroup)
}

export async function assignGradeGroup(gradeCode: string, body: { gradeGroup: string }): Promise<GradeGroup> {
  const json = await call(`/grade-groups/${encodeURIComponent(gradeCode)}`, "PUT", body)
  return normalizeGradeGroup((json.data ?? {}) as Loose)
}

export async function getRuleSnapshotDiff(params?: Record<string, string | number | boolean | undefined>): Promise<ErpList<RuleChange>> {
  return normalizeErpList(await call(`/snapshot-diff${qs(params)}`), normalizeRuleChange)
}

/** Export rules as a Blob (xlsx). */
export async function exportErpRules(params?: Record<string, string | number | boolean | undefined>): Promise<Blob> {
  const res = await fetch(`${BASE}/export${qs(params)}`, { credentials: "include" })
  if (!res.ok) throw new Error(`Export failed: ${res.status}`)
  return res.blob()
}
