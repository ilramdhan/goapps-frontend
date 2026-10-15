"use client"

// Lookup Sync hooks - usage count, paged preview, apply, job status polling
// and failures. Mirrors use-bulk-edit-product-params.ts.

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { costProductMasterKeys } from "@/hooks/finance/use-cost-product-master"
import {
  applyLookupSync,
  fetchLookupSyncJobFailures,
  fetchLookupSyncJobStatus,
  fetchLookupSyncPreview,
  fetchLookupUsage,
} from "@/services/finance/lookup-sync-api"
import {
  isLookupSyncJobTerminal,
  type LookupSyncApplyResult,
  type LookupSyncJobFailure,
  type LookupSyncJobStatus,
  type LookupSyncPreview,
  type LookupSyncScope,
  type LookupSyncSummary,
} from "@/types/finance/lookup-sync"

export const LOOKUP_SYNC_PAGE_SIZE = 20

export const lookupSyncKeys = {
  all: ["finance", "lookup-sync"] as const,
  usage: (code: string, key: string) => ["finance", "lookup-sync", "usage", code, key] as const,
  preview: (scope: LookupSyncScope, page: number, onlyActionable: boolean) =>
    ["finance", "lookup-sync", "preview", scope, page, onlyActionable] as const,
  status: (jobId: string) => ["finance", "lookup-sync", "job", "status", jobId] as const,
  failures: (jobId: string) => ["finance", "lookup-sync", "job", "failures", jobId] as const,
}

export function useLookupUsage(code: string, key: string, options: { enabled?: boolean } = {}) {
  return useQuery<LookupSyncSummary>({
    queryKey: lookupSyncKeys.usage(code, key),
    queryFn: () => fetchLookupUsage(code, key),
    enabled: (options.enabled ?? true) && !!code && !!key,
  })
}

export function useLookupSyncPreview(
  scope: LookupSyncScope | undefined,
  page: number,
  onlyActionable: boolean,
  options: { enabled?: boolean } = {},
) {
  return useQuery<LookupSyncPreview>({
    queryKey: lookupSyncKeys.preview(scope as LookupSyncScope, page, onlyActionable),
    queryFn: () => fetchLookupSyncPreview(scope as LookupSyncScope, page, LOOKUP_SYNC_PAGE_SIZE, onlyActionable),
    enabled: (options.enabled ?? true) && !!scope,
    placeholderData: keepPreviousData,
  })
}

export function useApplyLookupSync() {
  return useMutation<LookupSyncApplyResult, Error, { scope: LookupSyncScope; planFingerprint: string }>({
    mutationFn: ({ scope, planFingerprint }) => applyLookupSync(scope, planFingerprint),
  })
}

/** Polls until the job reaches DONE / FAILED / PARTIAL. */
export function useLookupSyncJobStatus(jobId: string | undefined) {
  return useQuery<LookupSyncJobStatus>({
    queryKey: lookupSyncKeys.status(jobId ?? ""),
    queryFn: () => fetchLookupSyncJobStatus(jobId as string),
    enabled: !!jobId,
    refetchInterval: (query) => (isLookupSyncJobTerminal(query.state.data?.status) ? false : 3000),
  })
}

export function useLookupSyncJobFailures(jobId: string | undefined) {
  return useQuery<LookupSyncJobFailure[]>({
    queryKey: lookupSyncKeys.failures(jobId ?? ""),
    queryFn: () => fetchLookupSyncJobFailures(jobId as string),
    enabled: !!jobId,
  })
}

/** Invalidate everything a finished sync may have changed. */
export function useInvalidateAfterLookupSync() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: costProductMasterKeys.all })
    qc.invalidateQueries({ queryKey: ["finance", "cost-product-parameter"] })
    qc.invalidateQueries({ queryKey: lookupSyncKeys.all })
  }
}
