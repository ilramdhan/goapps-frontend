"use client"

// ERP Integration Hooks - TanStack Query hooks for the ERP cost integration workflow

import { useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import * as api from "@/services/finance/erp-integration-api"
import { apiClient } from "@/lib/api"
import { GetSyncJobResponseParser } from "@/types/finance/oracle-sync"
import { isJobActive } from "@/types/finance/oracle-sync"
import type { GetSyncJobResponse } from "@/types/finance/oracle-sync"
import { oracleSyncKeys } from "@/hooks/finance/use-oracle-sync"

type Params = Record<string, string | number | boolean | undefined>

// ============================================================================
// Query Keys
// ============================================================================

export const erpIntegrationKeys = {
  all: ["finance", "erp-integration"] as const,
  batches: () => [...erpIntegrationKeys.all, "batches"] as const,
  batchList: (params?: Params) => [...erpIntegrationKeys.batches(), "list", params ?? {}] as const,
  batchDetail: (id: number) => [...erpIntegrationKeys.batches(), "detail", id] as const,
  coverage: (id: number, params?: Params) => [...erpIntegrationKeys.batchDetail(id), "coverage", params ?? {}] as const,
  stdCost: (id: number, params?: Params) => [...erpIntegrationKeys.batchDetail(id), "std-cost", params ?? {}] as const,
  oracleCalls: (id: number) => [...erpIntegrationKeys.batchDetail(id), "oracle-calls"] as const,
  adjPreview: (previewId: string) => [...erpIntegrationKeys.all, "adj-preview", previewId] as const,
  backtestReport: (batchId: number) => [...erpIntegrationKeys.all, "backtest", batchId] as const,
  schedule: () => [...erpIntegrationKeys.all, "schedule"] as const,
  config: () => [...erpIntegrationKeys.all, "config"] as const,
  periodLock: (period: string) => [...erpIntegrationKeys.all, "period-lock", period] as const,
  currencySanity: (period: string) => [...erpIntegrationKeys.all, "currency-sanity", period] as const,
  linkReport: (params?: Params) => [...erpIntegrationKeys.all, "link-report", params ?? {}] as const,
}

// ============================================================================
// Queries
// ============================================================================

export function useErpBatches(params?: Params) {
  return useQuery({
    queryKey: erpIntegrationKeys.batchList(params),
    queryFn: () => api.listBatches(params),
    staleTime: 30_000,
  })
}

export function useErpBatch(batchId: number) {
  return useQuery({
    queryKey: erpIntegrationKeys.batchDetail(batchId),
    queryFn: () => api.getBatch(batchId),
    enabled: !!batchId,
    staleTime: 10_000,
  })
}

export function useErpCoverage(batchId: number, params?: Params) {
  return useQuery({
    queryKey: erpIntegrationKeys.coverage(batchId, params),
    queryFn: () => api.listCoverage(batchId, params),
    enabled: !!batchId,
    staleTime: 30_000,
  })
}

export function useErpStdCost(batchId: number, params?: Params) {
  return useQuery({
    queryKey: erpIntegrationKeys.stdCost(batchId, params),
    queryFn: () => api.listStdCost(batchId, params),
    enabled: !!batchId,
    staleTime: 30_000,
  })
}

export function useErpOracleCalls(batchId: number, params?: Params) {
  return useQuery({
    queryKey: [...erpIntegrationKeys.oracleCalls(batchId), params ?? {}] as const,
    queryFn: () => api.listOracleCalls(batchId, params),
    enabled: !!batchId,
    staleTime: 30_000,
  })
}

export function useErpAdjPreview(previewId: string, params?: Params) {
  return useQuery({
    queryKey: [...erpIntegrationKeys.adjPreview(previewId), params ?? {}] as const,
    queryFn: () => api.getAdjPreview(previewId, params),
    enabled: !!previewId,
    staleTime: 0,
  })
}

export function useErpBacktestReport(batchId: number) {
  return useQuery({
    queryKey: erpIntegrationKeys.backtestReport(batchId),
    queryFn: () => api.getBacktestReport(batchId),
    enabled: !!batchId,
    staleTime: 30_000,
  })
}

export function useErpSchedule() {
  return useQuery({
    queryKey: erpIntegrationKeys.schedule(),
    queryFn: () => api.getSchedule(),
    staleTime: 60_000,
  })
}

export function useErpConfig() {
  return useQuery({
    queryKey: erpIntegrationKeys.config(),
    queryFn: () => api.getConfig(),
    staleTime: 60_000,
  })
}

export function useErpPeriodLock(period: string) {
  return useQuery({
    queryKey: erpIntegrationKeys.periodLock(period),
    queryFn: () => api.getPeriodLock(period),
    enabled: !!period,
    staleTime: 10_000,
  })
}

export function useErpCurrencySanity(period: string) {
  return useQuery({
    queryKey: erpIntegrationKeys.currencySanity(period),
    queryFn: () => api.getCurrencySanity(period),
    enabled: !!period,
    staleTime: 30_000,
  })
}

export function useErpLinkReport(params?: Params) {
  return useQuery({
    queryKey: erpIntegrationKeys.linkReport(params),
    queryFn: () => api.getItemLinkReport(params),
    staleTime: 30_000,
  })
}

// ============================================================================
// Job polling (reuses the oracle-sync job endpoint; it returns any job by id)
// ============================================================================

export function useErpJob(jobId: string, batchId?: number) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: oracleSyncKeys.jobDetail(jobId),
    queryFn: async (): Promise<GetSyncJobResponse> => {
      const raw = await apiClient.get<unknown>(`/api/v1/finance/oracle-sync/jobs/${jobId}`)
      return GetSyncJobResponseParser.fromJSON(raw)
    },
    enabled: !!jobId,
    staleTime: 0,
    refetchInterval: (q) => {
      const status = q.state.data?.data?.status
      return status !== undefined && isJobActive(status) ? 2000 : status === undefined ? 2000 : false
    },
  })

  const status = query.data?.data?.status
  const terminal = status !== undefined && !isJobActive(status)
  const notified = useRef<string>("")
  useEffect(() => {
    if (!terminal || notified.current === jobId) return
    notified.current = jobId
    if (batchId) {
      queryClient.invalidateQueries({ queryKey: erpIntegrationKeys.batchDetail(batchId) })
    }
    queryClient.invalidateQueries({ queryKey: erpIntegrationKeys.batches() })
  }, [terminal, jobId, batchId, queryClient])

  return query
}

// ============================================================================
// Mutations
// ============================================================================

function useBatchMutation<TVars, TRes>(
  fn: (vars: TVars) => Promise<TRes>,
  batchIdOf: (vars: TVars) => number | undefined,
  okMsg: string,
  errMsg: string,
  extraKeys: () => readonly (readonly unknown[])[] = () => []
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (_res, vars) => {
      const id = batchIdOf(vars)
      if (id) queryClient.invalidateQueries({ queryKey: erpIntegrationKeys.batchDetail(id) })
      queryClient.invalidateQueries({ queryKey: erpIntegrationKeys.batches() })
      extraKeys().forEach((k) => queryClient.invalidateQueries({ queryKey: k }))
      toast.success(okMsg)
    },
    onError: (error: Error) => {
      toast.error(error.message || errMsg)
    },
  })
}

export function useCreateErpBatch() {
  return useBatchMutation(
    (v: { period: string; mode: string }) => api.createBatch(v),
    () => undefined,
    "ERP batch created",
    "Failed to create ERP batch"
  )
}

export function useAbandonErpBatch() {
  return useBatchMutation((batchId: number) => api.abandonBatch(batchId), (id) => id, "Batch abandoned", "Failed to abandon batch")
}

export function useLockErpBatch() {
  return useBatchMutation((batchId: number) => api.lockBatch(batchId), (id) => id, "Batch locked", "Failed to lock batch", () => [
    erpIntegrationKeys.all,
  ])
}

type StepVars = { batchId: number; body?: unknown }

function useStepMutation(fn: (batchId: number, body?: unknown) => Promise<unknown>, name: string) {
  return useBatchMutation(
    (v: StepVars) => fn(v.batchId, v.body ?? {}),
    (v) => v.batchId,
    `${name} started`,
    `Failed to run ${name.toLowerCase()}`
  )
}

export const useLoadErpDemand = () => useStepMutation(api.loadDemand, "Load demand")
export const useRunErpCoverage = () => useStepMutation(api.runCoverage, "Coverage")
export const useRunErpDerive = () => useStepMutation(api.runDerive, "Derive")
export const useValidateErpBatch = () => useStepMutation(api.validateBatch, "Validation")
export const useReconErpBatch = () => useStepMutation(api.reconBatch, "Reconciliation")
export const usePushErpBatch = () => useStepMutation(api.pushBatch, "Push")

export function useAckErpWarnings() {
  return useBatchMutation(
    (v: StepVars) => api.ackWarnings(v.batchId, v.body ?? {}),
    (v) => v.batchId,
    "Warnings acknowledged",
    "Failed to acknowledge warnings"
  )
}

export function usePreviewErpAdj() {
  return useBatchMutation(
    (v: { batchId: number; operation: string }) => api.previewAdjOperation(v.batchId, v.operation),
    (v) => v.batchId,
    "ADJ preview started",
    "Failed to preview ADJ"
  )
}

export function useExecuteErpAdj() {
  return useBatchMutation(
    (v: { batchId?: number; previewId: string; confirmSetHash: string; confirmText: string }) =>
      api.executeAdjOperation(v.previewId, { confirmSetHash: v.confirmSetHash, confirmText: v.confirmText }),
    (v) => v.batchId,
    "ADJ execution started",
    "Failed to execute ADJ"
  )
}

export function useCreateErpProductFromDemand() {
  return useBatchMutation(
    (v: { batchId: number; cecId: number; body?: unknown }) => api.createProductFromDemand(v.batchId, v.cecId, v.body ?? {}),
    (v) => v.batchId,
    "Product created",
    "Failed to create product"
  )
}

export function useLockErpPeriod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (v: { period: string; reason?: string }) => api.lockPeriod(v.period, { reason: v.reason }),
    onSuccess: (_r, v) => {
      queryClient.invalidateQueries({ queryKey: erpIntegrationKeys.periodLock(v.period) })
      queryClient.invalidateQueries({ queryKey: erpIntegrationKeys.batches() })
      toast.success("Period locked")
    },
    onError: (error: Error) => toast.error(error.message || "Failed to lock period"),
  })
}

export function useUnlockErpPeriod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (v: { period: string; reason?: string }) => api.unlockPeriod(v.period, { reason: v.reason }),
    onSuccess: (_r, v) => {
      queryClient.invalidateQueries({ queryKey: erpIntegrationKeys.periodLock(v.period) })
      queryClient.invalidateQueries({ queryKey: erpIntegrationKeys.batches() })
      toast.success("Period unlocked")
    },
    onError: (error: Error) => toast.error(error.message || "Failed to unlock period"),
  })
}

export function useLinkErpToProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: unknown) => api.linkErpToProduct(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: erpIntegrationKeys.linkReport() })
      toast.success("ERP item linked")
    },
    onError: (error: Error) => toast.error(error.message || "Failed to link ERP item"),
  })
}

export function useRunErpAttributeBackfill() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: unknown = {}) => api.runAttributeBackfill(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: erpIntegrationKeys.linkReport() })
      toast.success("Attribute backfill started")
    },
    onError: (error: Error) => toast.error(error.message || "Failed to start attribute backfill"),
  })
}

export function useRunErpMasterSync() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: unknown = {}) => api.runMasterSync(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: erpIntegrationKeys.linkReport() })
      toast.success("Master sync started")
    },
    onError: (error: Error) => toast.error(error.message || "Failed to start master sync"),
  })
}

export function useRunErpBacktest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { period: string }) => api.runBacktest(body),
    onSuccess: (ref) => {
      if (ref.batchId) queryClient.invalidateQueries({ queryKey: erpIntegrationKeys.backtestReport(ref.batchId) })
      queryClient.invalidateQueries({ queryKey: erpIntegrationKeys.batches() })
      toast.success("Backtest started")
    },
    onError: (error: Error) => toast.error(error.message || "Failed to start backtest"),
  })
}

export function useUpdateErpSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: Parameters<typeof api.updateSchedule>[0]) => api.updateSchedule(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: erpIntegrationKeys.schedule() })
      toast.success("Schedule updated")
    },
    onError: (error: Error) => toast.error(error.message || "Failed to update schedule"),
  })
}

// ============================================================================
// Exports (download)
// ============================================================================

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function useExportErpCoverage() {
  return useMutation({
    mutationFn: async (v: { batchId: number; params?: Params }) => {
      downloadBlob(await api.exportCoverage(v.batchId, v.params), `erp_coverage_${v.batchId}.xlsx`)
    },
    onError: (error: Error) => toast.error(error.message || "Export failed"),
  })
}

export function useExportErpRecon() {
  return useMutation({
    mutationFn: async (batchId: number) => {
      downloadBlob(await api.exportRecon(batchId), `erp_recon_${batchId}.xlsx`)
    },
    onError: (error: Error) => toast.error(error.message || "Export failed"),
  })
}

export function useExportErpManualSample() {
  return useMutation({
    mutationFn: async (batchId: number) => {
      downloadBlob(await api.exportManualSample(batchId), `erp_manual_sample_${batchId}.xlsx`)
    },
    onError: (error: Error) => toast.error(error.message || "Export failed"),
  })
}

export interface ErpPushPreview {
  rowCount: number
  sumStd: string
  setHash: string
  warnings: string[]
}

/** Push control totals (no Oracle I/O). Enabled on demand by the Push tab. */
export function useErpPushPreview(batchId: number, enabled = true) {
  return useQuery({
    queryKey: [...erpIntegrationKeys.batchDetail(batchId), "push-preview"] as const,
    queryFn: async (): Promise<ErpPushPreview> => {
      const r = (await api.previewPush(batchId)) as Record<string, unknown>
      const d = ((r.data as Record<string, unknown> | undefined) ?? r) as Record<string, unknown>
      const pick = (a: string, b: string) => d[a] ?? d[b]
      return {
        rowCount: Number(pick("rowCount", "row_count") ?? 0),
        sumStd: String(pick("sumStd", "sum_std") ?? ""),
        setHash: String(pick("setHash", "set_hash") ?? ""),
        warnings: Array.isArray(d.warnings) ? d.warnings.map(String) : [],
      }
    },
    enabled: !!batchId && enabled,
    staleTime: 0,
  })
}
