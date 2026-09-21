"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  type CostRouteHead,
  type ListRoutesParams,
  type RouteGraph,
  normalizeCostRouteHead,
  normalizeRouteGraph,
} from "@/types/finance/cost-route"

const KEYS = {
  all: ["finance", "cost-route"] as const,
  list: (p: ListRoutesParams) => ["finance", "cost-route", "list", p] as const,
  graph: (headId: number, includeNestedMb = false) =>
    ["finance", "cost-route", "graph", headId, includeNestedMb] as const,
  // Prefix key covering both includeNestedMb variants -- use for invalidation, not queryFn.
  graphAll: (headId: number) => ["finance", "cost-route", "graph", headId] as const,
  byProduct: (productSysId: number) => ["finance", "cost-route", "by-product", productSysId] as const,
}

interface BFFResponse<T> {
  base?: { isSuccess?: boolean; message?: string; statusCode?: string }
  data?: T
  pagination?: {
    currentPage?: number
    pageSize?: number
    totalItems?: string | number
    totalPages?: number
  }
}

function ensureOK<T>(json: BFFResponse<T>): T {
  if (!json.base?.isSuccess) {
    throw new Error(json.base?.message || "request failed")
  }
  return json.data as T
}

// ---------- list ----------

export interface ListRoutesResult {
  items: CostRouteHead[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function useRoutes(params: ListRoutesParams = {}) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: async (): Promise<ListRoutesResult> => {
      const qs = new URLSearchParams()
      if (params.search) qs.set("search", params.search)
      if (params.status) qs.set("status", params.status)
      if (params.page) qs.set("page", String(params.page))
      if (params.pageSize) qs.set("pageSize", String(params.pageSize))
      if (params.sortBy) qs.set("sortBy", params.sortBy)
      if (params.sortOrder) qs.set("sortOrder", params.sortOrder)
      const res = await fetch(`/api/v1/finance/routes?${qs.toString()}`)
      const json = (await res.json()) as BFFResponse<unknown[]>
      const items = ((json.data as unknown[]) || []).map((row) =>
        normalizeCostRouteHead(row as Record<string, unknown>),
      )
      const pag = json.pagination
      return {
        items,
        total: Number(pag?.totalItems ?? items.length),
        page: pag?.currentPage ?? 1,
        pageSize: pag?.pageSize ?? items.length,
        totalPages: pag?.totalPages ?? 1,
      }
    },
    staleTime: 30_000,
  })
}

// ---------- counts (list KPIs) ----------

async function fetchRouteCount(status: string): Promise<number> {
  const qs = new URLSearchParams({ page: "1", pageSize: "1" })
  if (status) qs.set("status", status)
  const res = await fetch(`/api/v1/finance/routes?${qs.toString()}`)
  const json = (await res.json()) as BFFResponse<unknown[]>
  return Number(json.pagination?.totalItems ?? 0)
}

export interface RouteCounts {
  total: number
  draft: number
  complete: number
  locked: number
}

export function useRouteCounts() {
  return useQuery({
    queryKey: [...KEYS.all, "counts"] as const,
    queryFn: async (): Promise<RouteCounts> => {
      const [total, draft, complete, locked] = await Promise.all([
        fetchRouteCount(""),
        fetchRouteCount("DRAFT"),
        fetchRouteCount("COMPLETE"),
        fetchRouteCount("LOCKED"),
      ])
      return { total, draft, complete, locked }
    },
    staleTime: 30_000,
  })
}

// ---------- graph ----------

export function useRouteGraph(headId: number | undefined, options: { includeNestedMb?: boolean } = {}) {
  const includeNestedMb = options.includeNestedMb ?? false
  return useQuery({
    queryKey: KEYS.graph(headId ?? 0, includeNestedMb),
    enabled: !!headId,
    queryFn: async (): Promise<RouteGraph | null> => {
      if (!headId) return null
      const qs = includeNestedMb ? "?includeNestedMb=true" : ""
      const res = await fetch(`/api/v1/finance/routes/${headId}/graph${qs}`)
      const json = (await res.json()) as BFFResponse<Record<string, unknown>>
      if (!json.base?.isSuccess) throw new Error(json.base?.message || "load graph failed")
      return normalizeRouteGraph(json.data ?? {})
    },
  })
}

export function useRouteByProduct(productSysId: number | undefined) {
  return useQuery({
    queryKey: KEYS.byProduct(productSysId ?? 0),
    enabled: !!productSysId,
    queryFn: async (): Promise<CostRouteHead | null> => {
      if (!productSysId) return null
      const res = await fetch(`/api/v1/finance/routes/by-product/${productSysId}`)
      const json = (await res.json()) as BFFResponse<Record<string, unknown>>
      if (!json.base?.isSuccess) return null
      return normalizeCostRouteHead(json.data ?? {})
    },
  })
}

// ---------- save graph ----------

export function useSaveRouteGraph() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ headId, graph }: { headId: number; graph: RouteGraph }) => {
      const res = await fetch(`/api/v1/finance/routes/${headId}/graph`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ graph }),
      })
      const json = (await res.json()) as BFFResponse<Record<string, unknown>>
      const data = ensureOK(json)
      return normalizeRouteGraph(data as Record<string, unknown>)
    },
    onSuccess: (_data, { headId }) => {
      toast.success("Route graph saved")
      qc.invalidateQueries({ queryKey: KEYS.graphAll(headId) })
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

// ---------- status transitions ----------

function makeTransition(path: "complete" | "lock" | "unlock", successMsg: string) {
  return function useTransition() {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: async ({ headId, password }: { headId: number; password?: string }) => {
        const res = await fetch(`/api/v1/finance/routes/${headId}/${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(password !== undefined ? { password } : {}),
        })
        const json = (await res.json()) as BFFResponse<Record<string, unknown>>
        const data = ensureOK(json)
        return normalizeCostRouteHead(data as Record<string, unknown>)
      },
      onSuccess: (_data, { headId }) => {
        toast.success(successMsg)
        qc.invalidateQueries({ queryKey: KEYS.graphAll(headId) })
        qc.invalidateQueries({ queryKey: KEYS.all })
      },
      onError: (err: Error) => toast.error(err.message),
    })
  }
}

export const useCompleteRoute = makeTransition("complete", "Route marked COMPLETE")
export const useLockRoute = makeTransition("lock", "Route locked")
export const useUnlockRoute = makeTransition("unlock", "Route unlocked")

export function useDeleteRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ headId }: { headId: number }) => {
      const res = await fetch(`/api/v1/finance/routes/${headId}`, { method: "DELETE" })
      const json = (await res.json()) as BFFResponse<unknown>
      if (!json.base?.isSuccess) throw new Error(json.base?.message || "delete failed")
    },
    onSuccess: () => {
      toast.success("Route deleted")
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export const costRouteKeys = KEYS

export function useCreateRouteFromProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { productSysId: number; linkedRequestId?: number; cylTypeId?: number }) => {
      const res = await fetch(`/api/v1/finance/routes/from-product`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productSysId: input.productSysId,
          linkedRequestId: input.linkedRequestId ?? 0,
          cylTypeId: input.cylTypeId ?? 0,
        }),
      })
      const json = await res.json()
      if (!json.base?.isSuccess) throw new Error(json.base?.message || "Create route failed")
      return Number(json.headId ?? 0)
    },
    onSuccess: () => {
      toast.success("Route created")
      qc.invalidateQueries({ queryKey: ["finance", "cost-route"] })
      qc.invalidateQueries({ queryKey: ["finance", "cost-product-request"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
