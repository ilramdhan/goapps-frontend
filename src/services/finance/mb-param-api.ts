// MB Param API service — master parameter CRUD + picklist option CRUD

import type {
  MbParam,
  MbParamOption,
  ListMbParamsParams,
  MbParamFormData,
  MbParamOptionFormData,
} from "@/types/finance/mb-param"

interface BFFEnvelope<T> {
  base?: { isSuccess?: boolean; message?: string }
  data?: T
  pagination?: { totalItems?: string; totalPages?: number; currentPage?: number; pageSize?: number }
}

const BASE = "/api/v1/finance/master/mb-param"

export interface ListMbParamsResult {
  items: MbParam[]
  totalItems: number
  totalPages: number
  currentPage: number
  pageSize: number
}

export async function listMbParams(params: ListMbParamsParams = {}): Promise<ListMbParamsResult> {
  const qs = new URLSearchParams()
  if (params.page) qs.set("page", String(params.page))
  if (params.pageSize) qs.set("pageSize", String(params.pageSize))
  if (params.search) qs.set("search", params.search)
  if (params.sortBy) qs.set("sortBy", params.sortBy)
  if (params.sortDir) qs.set("sortDir", params.sortDir)
  if (params.activeFilter) qs.set("activeFilter", String(params.activeFilter))
  const res = await fetch(`${BASE}?${qs.toString()}`, { credentials: "include" })
  const json = (await res.json()) as BFFEnvelope<MbParam[]>
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Failed to load MB param list")
  }
  return {
    items: json.data ?? [],
    totalItems: Number(json.pagination?.totalItems ?? 0),
    totalPages: Number(json.pagination?.totalPages ?? 0),
    currentPage: Number(json.pagination?.currentPage ?? 1),
    pageSize: Number(json.pagination?.pageSize ?? 10),
  }
}

export async function createMbParam(data: MbParamFormData): Promise<MbParam> {
  const res = await fetch(BASE, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  const json = (await res.json()) as BFFEnvelope<MbParam>
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Failed to create MB param")
  }
  return json.data as MbParam
}

export async function updateMbParam(mbpId: string, data: MbParamFormData): Promise<MbParam> {
  const res = await fetch(`${BASE}/${mbpId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  const json = (await res.json()) as BFFEnvelope<MbParam>
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Failed to update MB param")
  }
  return json.data as MbParam
}

export async function deleteMbParam(mbpId: string): Promise<void> {
  const res = await fetch(`${BASE}/${mbpId}`, {
    method: "DELETE",
    credentials: "include",
  })
  const json = (await res.json()) as BFFEnvelope<unknown>
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Failed to delete MB param")
  }
}

// ── Picklist options ────────────────────────────────────────────────────────

export async function createMbParamOption(
  mbpId: string,
  data: MbParamOptionFormData,
): Promise<MbParamOption> {
  const res = await fetch(`${BASE}/${mbpId}/options`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  const json = (await res.json()) as BFFEnvelope<MbParamOption>
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Failed to create MB param option")
  }
  return json.data as MbParamOption
}

export async function updateMbParamOption(
  mbpId: string,
  mbpoId: string,
  data: Omit<MbParamOptionFormData, "mbpCode" | "code">,
): Promise<MbParamOption> {
  const res = await fetch(`${BASE}/${mbpId}/options/${mbpoId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  const json = (await res.json()) as BFFEnvelope<MbParamOption>
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Failed to update MB param option")
  }
  return json.data as MbParamOption
}

export async function deleteMbParamOption(mbpId: string, mbpoId: string): Promise<void> {
  const res = await fetch(`${BASE}/${mbpId}/options/${mbpoId}`, {
    method: "DELETE",
    credentials: "include",
  })
  const json = (await res.json()) as BFFEnvelope<unknown>
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Failed to delete MB param option")
  }
}
