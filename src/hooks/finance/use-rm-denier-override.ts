"use client"

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { costCalcKeys } from "@/hooks/finance/use-cost-calc"
import { costRouteKeys } from "@/hooks/finance/use-cost-route"
import {
  deleteRMDenierOverride,
  fetchRMDenierOverrides,
  upsertRMDenierOverride,
} from "@/services/finance/rm-denier-override-api"
import type {
  DeleteRMDenierOverrideInput,
  UpsertRMDenierOverrideInput,
} from "@/types/finance/rm-denier-override"

export const rmDenierOverrideKeys = {
  all: ["finance", "rm-denier-override"] as const,
  list: (productSysId: number) => ["finance", "rm-denier-override", "list", productSysId] as const,
}

export function useRMDenierOverrides(productSysId: number | undefined) {
  return useQuery({
    queryKey: rmDenierOverrideKeys.list(productSysId ?? 0),
    enabled: !!productSysId,
    queryFn: () => fetchRMDenierOverrides(productSysId as number),
    staleTime: 30_000,
  })
}

// An override changes the computed ratios shown on the route graph (any head
// containing the product) and, after recalculation, the cost results; the
// copies may also have been written (applyToDuplicates), so invalidate broadly.
function invalidateAfterChange(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: rmDenierOverrideKeys.all })
  void qc.invalidateQueries({ queryKey: [...costRouteKeys.all, "graph"] })
  void qc.invalidateQueries({ queryKey: costCalcKeys.all })
}

/** Number of products written besides the parent (robust to the parent being listed or not). */
export function countCopies(appliedProductSysIds: number[], parentSysId: number): number {
  return new Set(appliedProductSysIds.filter((id) => id !== parentSysId)).size
}

export function useUpsertRMDenierOverride() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertRMDenierOverrideInput) => upsertRMDenierOverride(input),
    onSuccess: (res, input) => {
      const copies = countCopies(res.appliedProductSysIds, input.productSysId)
      toast.success(
        copies > 0 ? `Override denier disimpan (+${copies} product salinan)` : "Override denier disimpan",
      )
      invalidateAfterChange(qc)
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteRMDenierOverride() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: DeleteRMDenierOverrideInput) => deleteRMDenierOverride(input),
    onSuccess: (res, input) => {
      const copies = countCopies(res.appliedProductSysIds, input.productSysId)
      toast.success(
        copies > 0 ? `Override denier dihapus (+${copies} product salinan)` : "Override denier dihapus",
      )
      invalidateAfterChange(qc)
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
