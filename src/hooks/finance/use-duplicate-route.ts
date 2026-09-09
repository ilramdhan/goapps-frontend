"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

/**
 * Mirrors finance.v1.DuplicateRouteTargetMode. Kept as a plain string union
 * (rather than importing the generated numeric enum) so the hook/dialog can
 * stay decoupled from the wire encoding — the BFF route is the only place
 * that needs to know the numeric values.
 */
export type DuplicateRouteTargetMode = "NEW_PRODUCT" | "SAME_PRODUCT"

export interface DuplicateRouteInput {
  headId: number
  includeRouting: boolean
  includeUpstream: boolean
  includeApplicability: boolean
  includeValues: boolean
  newCodePrefix?: string
  linkedRequestId?: number
  /** Defaults to NEW_PRODUCT (existing behavior) when omitted. */
  targetMode?: DuplicateRouteTargetMode
}

export interface DuplicateRouteResult {
  newHeadId: number
  newProductSysId: number
  newProductCode: string
}

export function useDuplicateRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: DuplicateRouteInput): Promise<DuplicateRouteResult> => {
      const res = await fetch(`/api/v1/finance/routes/${input.headId}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          includeRouting: input.includeRouting,
          includeUpstream: input.includeUpstream,
          includeApplicability: input.includeApplicability,
          includeValues: input.includeValues,
          newCodePrefix: input.newCodePrefix ?? "",
          linkedRequestId: input.linkedRequestId ?? 0,
          targetMode: input.targetMode ?? "NEW_PRODUCT",
        }),
      })
      const json = await res.json()
      if (!json.base?.isSuccess) throw new Error(json.base?.message || "Duplicate failed")
      return {
        newHeadId: Number(json.newHeadId ?? 0),
        newProductSysId: Number(json.newProductSysId ?? 0),
        newProductCode: String(json.newProductCode ?? ""),
      }
    },
    onSuccess: (res) => {
      toast.success(`Route duplicated → #${res.newHeadId} (${res.newProductCode})`)
      qc.invalidateQueries({ queryKey: ["finance", "cost-route"] })
      qc.invalidateQueries({ queryKey: ["finance", "cost-product-request"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export interface LinkedRequest {
  requestId: number
  requestNo: string
  status: string
  productTop2?: string
  createdBy?: string
  createdAt?: string
}

export function useLinkedRequests(headId: number | undefined) {
  return useQuery({
    queryKey: ["finance", "cost-route", "linked-requests", headId ?? 0],
    enabled: !!headId,
    queryFn: async (): Promise<LinkedRequest[]> => {
      if (!headId) return []
      const res = await fetch(`/api/v1/finance/routes/${headId}/linked-requests`)
      const json = await res.json()
      const rows = (json.data ?? []) as Array<Record<string, unknown>>
      return rows.map((r) => ({
        requestId: Number(r.requestId ?? r.request_id ?? 0),
        requestNo: String(r.requestNo ?? r.request_no ?? ""),
        status: String(r.status ?? ""),
        productTop2: String(r.productTop_2 ?? r.productTop2 ?? r.product_top_2 ?? "") || undefined,
        createdBy: String(r.createdBy ?? r.created_by ?? "") || undefined,
        createdAt: String(r.createdAt ?? r.created_at ?? "") || undefined,
      }))
    },
    staleTime: 30_000,
  })
}
