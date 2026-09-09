"use client"

// Bulk Edit Product Params Hooks (F4, product-route-fork-attach-bulk) — submit
// an async job that applies add-applicable/remove-applicable/upsert-value
// operations across many selected products, poll its status to completion,
// and list per-product failures on demand. Mirrors use-mb-head-bulk.ts's
// submit/status/failures pattern exactly.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  bulkEditProductParams,
  type BulkEditProductParamsPayload,
  getBulkProductParamJobStatus,
  listBulkProductParamJobFailures,
} from "@/services/finance/cost-product-param-bulk-api"
import {
  BULK_PRODUCT_PARAM_JOB_TERMINAL_STATUSES,
  type BulkParamJobInfo,
  type BulkProductParamJobFailure,
  type GetBulkProductParamJobStatusResponse,
} from "@/types/finance/cost-product-param-bulk"
import { costProductMasterKeys } from "@/hooks/finance/use-cost-product-master"

// ============================================================================
// Query Keys
// ============================================================================

export const bulkProductParamJobKeys = {
  status: (jobId: string) => ["finance", "cost-product-parameter", "bulk-job", "status", jobId] as const,
  failures: (jobId: string) => ["finance", "cost-product-parameter", "bulk-job", "failures", jobId] as const,
}

// ============================================================================
// Submit Mutation Hook — queue a bulk edit job
// ============================================================================

export function useBulkEditProductParams() {
  const queryClient = useQueryClient()
  return useMutation<BulkParamJobInfo, Error, BulkEditProductParamsPayload>({
    mutationFn: bulkEditProductParams,
    onSuccess: () => {
      // Products' applicable-param sets / values may have changed — invalidate
      // the product-master list (KPI counts, etc.) and per-product param caches
      // broadly; individual product detail pages will refetch on next visit.
      queryClient.invalidateQueries({ queryKey: costProductMasterKeys.all })
      queryClient.invalidateQueries({ queryKey: ["finance", "cost-product-parameter"] })
      toast.success("Bulk param edit job queued")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to queue bulk param edit job")
    },
  })
}

// ============================================================================
// Job Status Polling Hook
// ============================================================================

/**
 * Polls GetBulkProductParamJobStatus every ~3s while the job is running,
 * stopping once `status` reaches a terminal value (DONE/FAILED/PARTIAL) —
 * mirrors useBulkMBHeadJobStatus's refetchInterval pattern.
 */
export function useBulkProductParamJobStatus(jobId: string | undefined) {
  return useQuery<GetBulkProductParamJobStatusResponse>({
    queryKey: bulkProductParamJobKeys.status(jobId ?? ""),
    queryFn: () => getBulkProductParamJobStatus(jobId as string),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status && (BULK_PRODUCT_PARAM_JOB_TERMINAL_STATUSES as readonly string[]).includes(status)) {
        return false
      }
      return 3000
    },
  })
}

// ============================================================================
// Job Failures Hook
// ============================================================================

/**
 * Lists per-product failures for a bulk job. `enabled: !!jobId` by default so
 * callers can fetch on demand (e.g. when a "view failures" panel opens).
 */
export function useBulkProductParamJobFailures(jobId: string | undefined) {
  return useQuery<BulkProductParamJobFailure[]>({
    queryKey: bulkProductParamJobKeys.failures(jobId ?? ""),
    queryFn: () => listBulkProductParamJobFailures(jobId as string),
    enabled: !!jobId,
  })
}
