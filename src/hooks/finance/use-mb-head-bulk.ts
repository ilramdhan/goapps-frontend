"use client"

// Bulk MB Head Lifecycle Regenerate Hooks (Super Admin) — bulk re-trigger the
// Unvalidate → Submit → Validate cycle so downstream cost_product_master/CAPP/
// CPP/MB Spin data regenerates for records stuck in VALIDATED. Each bulk
// mutation queues an async job; useBulkMBHeadJobStatus polls it to completion
// and useBulkMBHeadJobFailures fetches per-item errors on demand.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  bulkForceUnvalidateMBHeads,
  bulkSubmitMBHeads,
  bulkValidateMBHeads,
  getBulkMBHeadJobStatus,
  listBulkMBHeadJobFailures,
} from "@/services/finance/mb-head-api"
import {
  BULK_MB_HEAD_JOB_TERMINAL_STATUSES,
  type BulkMBHeadJobInfo,
  type GetBulkMBHeadJobStatusResponse,
  type BulkMBHeadJobFailure,
} from "@/types/finance/mb-head"
import { mbHeadKeys } from "@/hooks/finance/use-mb-head"

// ============================================================================
// Query Keys
// ============================================================================

export const bulkMBHeadJobKeys = {
  status: (jobId: string) => ["finance", "mb-head", "bulk-job", "status", jobId] as const,
  failures: (jobId: string) => ["finance", "mb-head", "bulk-job", "failures", jobId] as const,
}

// ============================================================================
// Mutation Hooks — queue a bulk job
// ============================================================================

function useBulkMbHeadJobMutation(
  mutationFn: (mbhIds: string[]) => Promise<BulkMBHeadJobInfo>,
  successMessage: string,
  errorMessage: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mbHeadKeys.lists() })
      toast.success(successMessage)
    },
    onError: (error: Error) => {
      toast.error(error.message || errorMessage)
    },
  })
}

// `reason` is optional (proto default ""), so the mutation variables carry it
// alongside mbhIds rather than as a second mutate() argument.
export function useBulkForceUnvalidateMBHeads() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ mbhIds, reason }: { mbhIds: string[]; reason?: string }) =>
      bulkForceUnvalidateMBHeads(mbhIds, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mbHeadKeys.lists() })
      toast.success("Bulk force-unvalidate job queued")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to queue bulk force-unvalidate job")
    },
  })
}

export function useBulkSubmitMBHeads() {
  return useBulkMbHeadJobMutation(
    bulkSubmitMBHeads,
    "Bulk submit job queued",
    "Failed to queue bulk submit job",
  )
}

export function useBulkValidateMBHeads() {
  return useBulkMbHeadJobMutation(
    bulkValidateMBHeads,
    "Bulk validate job queued",
    "Failed to queue bulk validate job",
  )
}

// ============================================================================
// Job Status Polling Hook
// ============================================================================

/**
 * Polls GetBulkMBHeadJobStatus every ~3s while the job is running, stopping
 * once `status` reaches a terminal value (DONE/FAILED/PARTIAL) — mirrors the
 * refetchInterval pattern in use-cost-import.ts's useAsyncImport polling.
 */
export function useBulkMBHeadJobStatus(jobId: string | undefined) {
  return useQuery<GetBulkMBHeadJobStatusResponse>({
    queryKey: bulkMBHeadJobKeys.status(jobId ?? ""),
    queryFn: () => getBulkMBHeadJobStatus(jobId as string),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status && (BULK_MB_HEAD_JOB_TERMINAL_STATUSES as readonly string[]).includes(status)) {
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
 * Lists per-item failures for a bulk job. `enabled: !!jobId` by default so
 * callers can fetch on demand (e.g. when a "view failures" panel opens) by
 * simply not calling the hook with a jobId until then.
 */
export function useBulkMBHeadJobFailures(jobId: string | undefined) {
  return useQuery<BulkMBHeadJobFailure[]>({
    queryKey: bulkMBHeadJobKeys.failures(jobId ?? ""),
    queryFn: () => listBulkMBHeadJobFailures(jobId as string),
    enabled: !!jobId,
  })
}
