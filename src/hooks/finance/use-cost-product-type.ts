"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  type CostProductType,
  type ListCostProductTypesParams,
  normalizeCostProductType,
  type RmRatioMode,
} from "@/types/finance/cost-product-type"

const KEYS = {
  all: ["finance", "cost-product-type"] as const,
  list: (params: ListCostProductTypesParams) => ["finance", "cost-product-type", "list", params] as const,
  detail: (id: number) => ["finance", "cost-product-type", "detail", id] as const,
}

type ListResponse = {
  base?: { isSuccess?: boolean; message?: string }
  data?: unknown[]
  pagination?: { currentPage: number; pageSize: number; totalItems: number | string; totalPages: number }
}

async function fetchList(params: ListCostProductTypesParams) {
  const qs = new URLSearchParams()
  if (params.search) qs.set("search", params.search)
  if (params.activeFilter) qs.set("activeFilter", params.activeFilter)
  if (params.sortBy) qs.set("sortBy", params.sortBy)
  if (params.sortOrder) qs.set("sortOrder", params.sortOrder)
  if (params.page) qs.set("page", String(params.page))
  if (params.pageSize) qs.set("pageSize", String(params.pageSize))
  const res = await fetch(`/api/v1/finance/cost-product-types?${qs.toString()}`)
  const json: ListResponse = await res.json()
  return {
    items: (json.data || []).map((r) => normalizeCostProductType(r as Parameters<typeof normalizeCostProductType>[0])),
    pagination: json.pagination,
    base: json.base,
  }
}

export function useCostProductTypes(params: ListCostProductTypesParams) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: () => fetchList(params),
    staleTime: 30_000,
  })
}

export function useCostProductType(typeId: number | undefined) {
  return useQuery({
    queryKey: KEYS.detail(typeId ?? 0),
    queryFn: async (): Promise<CostProductType | null> => {
      if (!typeId) return null
      const res = await fetch(`/api/v1/finance/cost-product-types/${typeId}`)
      const json = await res.json()
      return json.data ? normalizeCostProductType(json.data) : null
    },
    enabled: !!typeId,
  })
}

export function useCreateCostProductType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { typeCode: string; typeName: string; rmRatioMode?: RmRatioMode }) => {
      const res = await fetch("/api/v1/finance/cost-product-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!json.base?.isSuccess) throw new Error(json.base?.message || "Failed")
      return normalizeCostProductType(json.data)
    },
    onSuccess: () => {
      toast.success("Product type created")
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateCostProductType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { typeId: number; typeName: string; isActive: boolean; rmRatioMode?: RmRatioMode }) => {
      const res = await fetch(`/api/v1/finance/cost-product-types/${payload.typeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typeName: payload.typeName, isActive: payload.isActive, rmRatioMode: payload.rmRatioMode }),
      })
      const json = await res.json()
      if (!json.base?.isSuccess) throw new Error(json.base?.message || "Failed")
      return normalizeCostProductType(json.data)
    },
    onSuccess: () => {
      toast.success("Product type updated")
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export const costProductTypeKeys = KEYS
