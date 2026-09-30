// Yarn TX Weight API service — master data CRUD (BFF: /api/v1/finance/yarn-tx-weights)

import {
  normalizeYarnTxWeight,
  type ListYarnTxWeightParams,
  type RawYarnTxWeight,
  type YarnTxWeightFormData,
  type YarnTxWeightRow,
} from "@/types/finance/yarn-tx-weight"

interface BFFEnvelope<T> {
  base?: { isSuccess?: boolean; message?: string }
  data?: T
  pagination?: { totalItems?: string | number; totalPages?: number; currentPage?: number; pageSize?: number }
}

const BASE = "/api/v1/finance/yarn-tx-weights"

export interface ListYarnTxWeightResult {
  items: YarnTxWeightRow[]
  totalItems: number
  totalPages: number
  currentPage: number
  pageSize: number
}

export async function listYarnTxWeights(params: ListYarnTxWeightParams = {}): Promise<ListYarnTxWeightResult> {
  const qs = new URLSearchParams()
  if (params.page) qs.set("page", String(params.page))
  if (params.pageSize) qs.set("pageSize", String(params.pageSize))
  if (params.search) qs.set("search", params.search)
  if (params.productTypeId) qs.set("productTypeId", String(params.productTypeId))
  if (params.grade) qs.set("grade", params.grade)
  if (params.sortBy) qs.set("sortBy", params.sortBy)
  if (params.sortOrder) qs.set("sortOrder", params.sortOrder)
  const res = await fetch(`${BASE}?${qs.toString()}`, { credentials: "include" })
  const json = (await res.json()) as BFFEnvelope<RawYarnTxWeight[]>
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Failed to load TX weight list")
  }
  return {
    items: (json.data ?? []).map(normalizeYarnTxWeight),
    totalItems: Number(json.pagination?.totalItems ?? 0),
    totalPages: Number(json.pagination?.totalPages ?? 0),
    currentPage: Number(json.pagination?.currentPage ?? 1),
    pageSize: Number(json.pagination?.pageSize ?? 100),
  }
}

export async function getYarnTxWeight(id: string): Promise<YarnTxWeightRow> {
  const res = await fetch(`${BASE}/${id}`, { credentials: "include" })
  const json = (await res.json()) as BFFEnvelope<RawYarnTxWeight>
  if (json.base?.isSuccess === false || !json.data) {
    throw new Error(json.base?.message || "Failed to load TX weight")
  }
  return normalizeYarnTxWeight(json.data)
}

export async function createYarnTxWeight(data: YarnTxWeightFormData): Promise<YarnTxWeightRow> {
  const res = await fetch(BASE, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  const json = (await res.json()) as BFFEnvelope<RawYarnTxWeight>
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Failed to create TX weight")
  }
  return normalizeYarnTxWeight(json.data ?? {})
}

/** Only mode/value/description are mutable (product type + grade form the natural key). */
export async function updateYarnTxWeight(
  id: string,
  data: Pick<YarnTxWeightFormData, "mode" | "value" | "description">
): Promise<YarnTxWeightRow> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  const json = (await res.json()) as BFFEnvelope<RawYarnTxWeight>
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Failed to update TX weight")
  }
  return normalizeYarnTxWeight(json.data ?? {})
}

export async function deleteYarnTxWeight(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE", credentials: "include" })
  const json = (await res.json()) as BFFEnvelope<unknown>
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Failed to delete TX weight")
  }
}
