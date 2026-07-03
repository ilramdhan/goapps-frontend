"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { costProductRequestKeys } from "./use-cost-product-request"

export function useLinkExistingRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ requestId, routeHeadId }: { requestId: number; routeHeadId: number }) => {
      const res = await fetch(`/api/v1/finance/cost-product-requests/${requestId}/link-route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeHeadId }),
      })
      const json = await res.json()
      if (!json.base?.isSuccess) throw new Error(json.base?.message || "Link failed")
      return json.data
    },
    onSuccess: (_data, { requestId }) => {
      toast.success("Route linked")
      qc.invalidateQueries({ queryKey: costProductRequestKeys.detail(requestId) })
      qc.invalidateQueries({ queryKey: costProductRequestKeys.all })
      qc.invalidateQueries({ queryKey: ["finance", "cost-route"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUnlinkRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ requestId }: { requestId: number }) => {
      const res = await fetch(`/api/v1/finance/cost-product-requests/${requestId}/unlink-route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
      const json = await res.json()
      if (!json.base?.isSuccess) throw new Error(json.base?.message || "Unlink failed")
      return json.data
    },
    onSuccess: (_data, { requestId }) => {
      toast.success("Route unlinked")
      qc.invalidateQueries({ queryKey: costProductRequestKeys.detail(requestId) })
      qc.invalidateQueries({ queryKey: costProductRequestKeys.all })
      qc.invalidateQueries({ queryKey: ["finance", "cost-route"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
