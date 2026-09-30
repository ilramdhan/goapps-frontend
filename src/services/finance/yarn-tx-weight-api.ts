// Yarn TX Weight group API service (BFF: /api/v1/finance/yarn-tx-weight-groups)

import {
  normalizeYarnTxWeightGroup,
  type ListYarnTxWeightGroupsParams,
  type RawYarnTxWeightGroup,
  type YarnTxWeightGroup,
  type YarnTxWeightGroupFormData,
} from "@/types/finance/yarn-tx-weight"

interface BFFEnvelope<T> {
  base?: { isSuccess?: boolean; message?: string }
  data?: T
  pagination?: { totalItems?: string | number; totalPages?: number; currentPage?: number; pageSize?: number }
}

const BASE = "/api/v1/finance/yarn-tx-weight-groups"

export interface ListYarnTxWeightGroupsResult {
  items: YarnTxWeightGroup[]
  totalItems: number
  totalPages: number
  currentPage: number
  pageSize: number
}

async function readEnvelope<T>(res: Response, fallback: string): Promise<BFFEnvelope<T>> {
  let json: BFFEnvelope<T>
  try {
    json = (await res.json()) as BFFEnvelope<T>
  } catch {
    throw new Error(fallback)
  }
  if (json.base?.isSuccess === false || !res.ok) {
    throw new Error(json.base?.message || fallback)
  }
  return json
}

export async function listYarnTxWeightGroups(
  params: ListYarnTxWeightGroupsParams = {}
): Promise<ListYarnTxWeightGroupsResult> {
  const qs = new URLSearchParams()
  if (params.page) qs.set("page", String(params.page))
  if (params.pageSize) qs.set("pageSize", String(params.pageSize))
  if (params.search) qs.set("search", params.search)
  if (params.productTypeId) qs.set("productTypeId", String(params.productTypeId))
  if (params.sortBy) qs.set("sortBy", params.sortBy)
  if (params.sortOrder) qs.set("sortOrder", params.sortOrder)
  const res = await fetch(`${BASE}?${qs.toString()}`, { credentials: "include" })
  const json = await readEnvelope<RawYarnTxWeightGroup[]>(res, "Failed to load TX weight configs")
  return {
    items: (json.data ?? []).map(normalizeYarnTxWeightGroup),
    totalItems: Number(json.pagination?.totalItems ?? 0),
    totalPages: Number(json.pagination?.totalPages ?? 0),
    currentPage: Number(json.pagination?.currentPage ?? 1),
    pageSize: Number(json.pagination?.pageSize ?? params.pageSize ?? 10),
  }
}

export async function getYarnTxWeightGroup(groupId: string): Promise<YarnTxWeightGroup> {
  const res = await fetch(`${BASE}/${groupId}`, { credentials: "include" })
  const json = await readEnvelope<RawYarnTxWeightGroup>(res, "Failed to load TX weight config")
  if (!json.data) throw new Error("Failed to load TX weight config")
  return normalizeYarnTxWeightGroup(json.data)
}

export async function createYarnTxWeightGroup(data: YarnTxWeightGroupFormData): Promise<YarnTxWeightGroup> {
  const res = await fetch(BASE, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  const json = await readEnvelope<RawYarnTxWeightGroup>(res, "Failed to create TX weight config")
  return normalizeYarnTxWeightGroup(json.data ?? {})
}

/** Full replacement: code/name/description, the product type set and the rules. */
export async function updateYarnTxWeightGroup(
  groupId: string,
  data: YarnTxWeightGroupFormData
): Promise<YarnTxWeightGroup> {
  const res = await fetch(`${BASE}/${groupId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  const json = await readEnvelope<RawYarnTxWeightGroup>(res, "Failed to update TX weight config")
  return normalizeYarnTxWeightGroup(json.data ?? {})
}

export async function deleteYarnTxWeightGroup(groupId: string): Promise<void> {
  const res = await fetch(`${BASE}/${groupId}`, { method: "DELETE", credentials: "include" })
  await readEnvelope<unknown>(res, "Failed to delete TX weight config")
}
