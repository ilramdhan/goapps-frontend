"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  type CreateCostProductMasterPayload,
  type ListCostProductMastersParams,
  type UpdateCostProductMasterPayload,
  normalizeCostProductMaster,
} from "@/types/finance/cost-product-master"

const KEYS = {
  all: ["finance", "cost-product-master"] as const,
  list: (params: ListCostProductMastersParams) => ["finance", "cost-product-master", "list", params] as const,
  detail: (id: number) => ["finance", "cost-product-master", "detail", id] as const,
}

async function fetchList(params: ListCostProductMastersParams) {
  const qs = new URLSearchParams()
  if (params.search) qs.set("search", params.search)
  if (params.productTypeId) qs.set("productTypeId", String(params.productTypeId))
  if (params.productTypeIds && params.productTypeIds.length > 0) {
    qs.set("productTypeIds", params.productTypeIds.join(","))
  }
  if (params.shadeCode) qs.set("shadeCode", params.shadeCode)
  if (params.activeFilter) qs.set("activeFilter", params.activeFilter)
  if (params.sortBy) qs.set("sortBy", params.sortBy)
  if (params.sortOrder) qs.set("sortOrder", params.sortOrder)
  if (params.page) qs.set("page", String(params.page))
  if (params.pageSize) qs.set("pageSize", String(params.pageSize))
  const res = await fetch(`/api/v1/finance/cost-product-masters?${qs.toString()}`)
  const json = await res.json()
  return {
    items: ((json.data as unknown[]) || []).map((r) =>
      normalizeCostProductMaster(r as Parameters<typeof normalizeCostProductMaster>[0]),
    ),
    pagination: json.pagination,
    base: json.base,
  }
}

export function useCostProductMasters(params: ListCostProductMastersParams) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: () => fetchList(params),
    staleTime: 30_000,
  })
}

async function fetchPMCount(activeFilter: "" | "active" | "inactive"): Promise<number> {
  const res = await fetchList({ page: 1, pageSize: 1, activeFilter } as ListCostProductMastersParams)
  return Number(res.pagination?.totalItems ?? 0)
}

export interface ProductMasterCounts {
  total: number
  active: number
  inactive: number
}

// useCostProductMasterCounts powers the list-page KPI widgets.
export function useCostProductMasterCounts() {
  return useQuery({
    queryKey: [...KEYS.all, "counts"] as const,
    queryFn: async (): Promise<ProductMasterCounts> => {
      const [total, active, inactive] = await Promise.all([
        fetchPMCount(""),
        fetchPMCount("active"),
        fetchPMCount("inactive"),
      ])
      return { total, active, inactive }
    },
    staleTime: 30_000,
  })
}

export function useCostProductMaster(productSysId: number | undefined) {
  return useQuery({
    queryKey: KEYS.detail(productSysId ?? 0),
    queryFn: async () => {
      if (!productSysId) return null
      const res = await fetch(`/api/v1/finance/cost-product-masters/${productSysId}`)
      const json = await res.json()
      return json.data ? normalizeCostProductMaster(json.data) : null
    },
    enabled: !!productSysId,
  })
}

export function useCreateCostProductMaster() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateCostProductMasterPayload) => {
      const res = await fetch("/api/v1/finance/cost-product-masters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!json.base?.isSuccess) throw new Error(json.base?.message || "Failed")
      return normalizeCostProductMaster(json.data)
    },
    onSuccess: (p) => {
      toast.success(`Product ${p.productCode} created`)
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateCostProductMaster() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { productSysId: number } & UpdateCostProductMasterPayload) => {
      const { productSysId, ...payload } = input
      const res = await fetch(`/api/v1/finance/cost-product-masters/${productSysId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!json.base?.isSuccess) throw new Error(json.base?.message || "Failed")
      return normalizeCostProductMaster(json.data)
    },
    onSuccess: () => {
      toast.success("Product updated")
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeactivateCostProductMaster() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (productSysId: number) => {
      const res = await fetch(`/api/v1/finance/cost-product-masters/${productSysId}/deactivate`, { method: "POST" })
      const json = await res.json()
      if (!json.base?.isSuccess) throw new Error(json.base?.message || "Failed")
      return true
    },
    onSuccess: () => {
      toast.success("Product deactivated")
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUnlockCostProductMaster() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { productSysId: number; reason: string }) => {
      const res = await fetch(`/api/v1/finance/cost-product-masters/${input.productSysId}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: input.reason }),
      })
      const json = await res.json()
      if (!json.base?.isSuccess) throw new Error(json.base?.message || "Failed")
      return normalizeCostProductMaster(json.data)
    },
    onSuccess: () => {
      toast.success("Product unlocked for 24 hours")
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export const costProductMasterKeys = KEYS
