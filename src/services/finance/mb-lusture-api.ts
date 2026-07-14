// MB Lusture API service — master data CRUD

import type { MbLusture, ListMbLustureParams, MbLustureFormData } from "@/types/finance/mb-lusture"

interface BFFEnvelope<T> {
  base?: { isSuccess?: boolean; message?: string }
  data?: T
  pagination?: { totalItems?: string; totalPages?: number; currentPage?: number; pageSize?: number }
}

const BASE = "/api/v1/finance/master/mb-lusture"

export interface ListMbLustureResult {
  items: MbLusture[]
  totalItems: number
  totalPages: number
  currentPage: number
  pageSize: number
}

export async function listMbLustures(params: ListMbLustureParams = {}): Promise<ListMbLustureResult> {
  const qs = new URLSearchParams()
  if (params.page) qs.set("page", String(params.page))
  if (params.pageSize) qs.set("pageSize", String(params.pageSize))
  if (params.search) qs.set("search", params.search)
  if (params.sortBy) qs.set("sortBy", params.sortBy)
  if (params.sortDir) qs.set("sortDir", params.sortDir)
  if (params.activeFilter) qs.set("activeFilter", String(params.activeFilter))
  const res = await fetch(`${BASE}?${qs.toString()}`, { credentials: "include" })
  const json = (await res.json()) as BFFEnvelope<MbLusture[]>
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Failed to load MB lusture list")
  }
  return {
    items: json.data ?? [],
    totalItems: Number(json.pagination?.totalItems ?? 0),
    totalPages: Number(json.pagination?.totalPages ?? 0),
    currentPage: Number(json.pagination?.currentPage ?? 1),
    pageSize: Number(json.pagination?.pageSize ?? 10),
  }
}

export async function createMbLusture(data: MbLustureFormData): Promise<MbLusture> {
  const res = await fetch(BASE, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  const json = (await res.json()) as BFFEnvelope<MbLusture>
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Failed to create MB lusture")
  }
  return json.data as MbLusture
}

export async function updateMbLusture(mblId: string, data: MbLustureFormData): Promise<MbLusture> {
  const res = await fetch(`${BASE}/${mblId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  const json = (await res.json()) as BFFEnvelope<MbLusture>
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Failed to update MB lusture")
  }
  return json.data as MbLusture
}

export async function deleteMbLusture(mblId: string): Promise<void> {
  const res = await fetch(`${BASE}/${mblId}`, {
    method: "DELETE",
    credentials: "include",
  })
  const json = (await res.json()) as BFFEnvelope<unknown>
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Failed to delete MB lusture")
  }
}
