"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { useNotificationEventStore } from "@/stores/notification-event-store"
import { NotificationSeverity } from "@/types/iam/notification"
import {
  type CalJob,
  type CalJobChunk,
  type CalJobProduct,
  type CalcJobScope,
  type CalcJobStatus,
  type CalculationType,
  type CostBreakdown,
  type CostHistoryEntry,
  type CostResult,
  type ListCalcJobChunksParams,
  type ListCalcJobProductsParams,
  type ListCalcJobsParams,
  type ListCostHistoryParams,
  normalizeCalJob,
  normalizeCalJobChunk,
  normalizeCalJobProduct,
  normalizeCostBreakdown,
  normalizeCostHistoryEntry,
  normalizeCostResult,
} from "@/types/finance/cost-calc"

const KEYS = {
  all: ["finance", "cost-calc"] as const,
  jobs: (p: ListCalcJobsParams) => ["finance", "cost-calc", "jobs", p] as const,
  job: (id: number) => ["finance", "cost-calc", "job", id] as const,
  jobChunks: (id: number, p: ListCalcJobChunksParams) =>
    ["finance", "cost-calc", "job", id, "chunks", p] as const,
  jobProducts: (id: number, p: ListCalcJobProductsParams) =>
    ["finance", "cost-calc", "job", id, "products", p] as const,
  result: (pid: number, period: string, type: CalculationType) =>
    ["finance", "cost-calc", "result", pid, period, type] as const,
  breakdown: (pid: number, period: string, type: CalculationType) =>
    ["finance", "cost-calc", "breakdown", pid, period, type] as const,
  history: (pid: number, p: ListCostHistoryParams) =>
    ["finance", "cost-calc", "history", pid, p] as const,
  resultsList: (p: object) =>
    ["finance", "cost-calc", "results-list", p] as const,
  periods: () => ["finance", "cost-calc", "periods"] as const,
  exportBatchChildren: (parentJobId: string) =>
    ["finance", "cost-calc", "export-batch-children", parentJobId] as const,
  exportJobsList: (p: ListExportJobsParams) =>
    ["finance", "cost-calc", "export-jobs-list", p] as const,
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

// BFFError carries the backend's statusCode alongside the message so callers
// can branch on the specific failure (e.g. a 409 conflict) instead of
// string-matching err.message, which is fragile against copy changes.
export interface BFFError extends Error {
  statusCode?: string
}

function ensureOK<T>(json: BFFResponse<T>): T {
  if (!json.base?.isSuccess) {
    const err = new Error(json.base?.message || "request failed") as BFFError
    err.statusCode = json.base?.statusCode
    throw err
  }
  return json.data as T
}

// ---------- list jobs ----------

export interface ListCalcJobsResult {
  items: CalJob[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function useCalcJobs(params: ListCalcJobsParams = {}) {
  return useQuery({
    queryKey: KEYS.jobs(params),
    queryFn: async (): Promise<ListCalcJobsResult> => {
      const qs = new URLSearchParams()
      if (params.period) qs.set("period", params.period)
      if (params.calculationType) qs.set("calculationType", params.calculationType)
      if (params.status) qs.set("status", params.status)
      if (params.triggeredBy) qs.set("triggeredBy", params.triggeredBy)
      if (params.page) qs.set("page", String(params.page))
      if (params.pageSize) qs.set("pageSize", String(params.pageSize))
      const res = await fetch(`/api/v1/finance/calc-jobs?${qs.toString()}`)
      const json = (await res.json()) as BFFResponse<unknown[]>
      if (!json.base?.isSuccess) throw new Error(json.base?.message || "list calc jobs failed")
      const items = ((json.data as unknown[]) || []).map((row) =>
        normalizeCalJob(row as Record<string, unknown>),
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

// ---------- single job (polls while active) ----------

const ACTIVE_JOB_STATUSES: CalcJobStatus[] = ["QUEUED", "PLANNING", "PROCESSING"]

export function useCalcJob(jobId: number | undefined) {
  return useQuery({
    queryKey: KEYS.job(jobId ?? 0),
    enabled: !!jobId,
    queryFn: async (): Promise<CalJob | null> => {
      if (!jobId) return null
      const res = await fetch(`/api/v1/finance/calc-jobs/${jobId}`)
      const json = (await res.json()) as BFFResponse<Record<string, unknown>>
      if (!json.base?.isSuccess) throw new Error(json.base?.message || "get calc job failed")
      return normalizeCalJob(json.data ?? {})
    },
    refetchInterval: (query) => {
      const job = query.state.data as CalJob | null | undefined
      if (job && ACTIVE_JOB_STATUSES.includes(job.status)) return 3000
      return false
    },
  })
}

// ---------- trigger ----------

export interface TriggerCalcJobInput {
  period: string
  calculationType: CalculationType
  scope: CalcJobScope
  productSysId?: number
  routeHeadId?: number
  productTypeIdFilter?: number
}

export function useTriggerCalcJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: TriggerCalcJobInput): Promise<CalJob> => {
      const res = await fetch(`/api/v1/finance/calc-jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: input.period,
          calculationType: input.calculationType,
          scope: input.scope,
          productSysId: input.productSysId ?? 0,
          routeHeadId: input.routeHeadId ?? 0,
          productTypeIdFilter: input.productTypeIdFilter ?? 0,
        }),
      })
      const json = (await res.json()) as BFFResponse<Record<string, unknown>>
      const data = ensureOK(json)
      return normalizeCalJob((data ?? {}) as Record<string, unknown>)
    },
    onSuccess: (job) => {
      toast.success(`Calc job ${job.jobCode || job.jobId} queued`)
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

// ---------- cancel ----------

export function useCancelCalcJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ jobId, reason }: { jobId: number; reason?: string }): Promise<CalJob> => {
      const res = await fetch(`/api/v1/finance/calc-jobs/${jobId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason ?? "" }),
      })
      const json = (await res.json()) as BFFResponse<Record<string, unknown>>
      const data = ensureOK(json)
      return normalizeCalJob((data ?? {}) as Record<string, unknown>)
    },
    onSuccess: (_data, { jobId }) => {
      toast.success("Calc job cancelled")
      qc.invalidateQueries({ queryKey: KEYS.job(jobId) })
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
    onError: (err: Error, { jobId }) => {
      // Likely race: job reached terminal status before cancel hit backend.
      // Refresh job state so UI hides the now-stale Cancel button.
      const msg = err.message.includes("state transition")
        ? "Job already finished — refresh to see latest status"
        : err.message
      toast.error(msg)
      qc.invalidateQueries({ queryKey: KEYS.job(jobId) })
    },
  })
}

// ---------- chunks ----------

export interface ListCalcJobChunksResult {
  items: CalJobChunk[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function useCalcJobChunks(
  jobId: number | undefined,
  params: ListCalcJobChunksParams = {},
) {
  return useQuery({
    queryKey: KEYS.jobChunks(jobId ?? 0, params),
    enabled: !!jobId,
    queryFn: async (): Promise<ListCalcJobChunksResult> => {
      const qs = new URLSearchParams()
      if (params.waveNo) qs.set("waveNo", String(params.waveNo))
      if (params.status) qs.set("status", params.status)
      if (params.page) qs.set("page", String(params.page))
      if (params.pageSize) qs.set("pageSize", String(params.pageSize))
      const res = await fetch(`/api/v1/finance/calc-jobs/${jobId}/chunks?${qs.toString()}`)
      const json = (await res.json()) as BFFResponse<unknown[]>
      if (!json.base?.isSuccess) throw new Error(json.base?.message || "list chunks failed")
      const items = ((json.data as unknown[]) || []).map((row) =>
        normalizeCalJobChunk(row as Record<string, unknown>),
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
    staleTime: 15_000,
  })
}

// ---------- products ----------

export interface ListCalcJobProductsResult {
  items: CalJobProduct[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function useCalcJobProducts(
  jobId: number | undefined,
  params: ListCalcJobProductsParams = {},
) {
  return useQuery({
    queryKey: KEYS.jobProducts(jobId ?? 0, params),
    enabled: !!jobId,
    queryFn: async (): Promise<ListCalcJobProductsResult> => {
      const qs = new URLSearchParams()
      if (params.status) qs.set("status", params.status)
      if (params.page) qs.set("page", String(params.page))
      if (params.pageSize) qs.set("pageSize", String(params.pageSize))
      const res = await fetch(`/api/v1/finance/calc-jobs/${jobId}/products?${qs.toString()}`)
      const json = (await res.json()) as BFFResponse<unknown[]>
      if (!json.base?.isSuccess) throw new Error(json.base?.message || "list products failed")
      const items = ((json.data as unknown[]) || []).map((row) =>
        normalizeCalJobProduct(row as Record<string, unknown>),
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
    staleTime: 15_000,
  })
}

// ---------- cost result ----------

export function useCostResult(
  productSysId: number | undefined,
  period: string | undefined,
  calcType: CalculationType | undefined,
) {
  return useQuery({
    queryKey: KEYS.result(productSysId ?? 0, period ?? "", calcType ?? "ACTUAL"),
    enabled: !!productSysId && !!period && !!calcType,
    queryFn: async (): Promise<CostResult | null> => {
      if (!productSysId || !period || !calcType) return null
      const res = await fetch(
        `/api/v1/finance/cost-results/${productSysId}/${period}/${calcType}`,
      )
      const json = (await res.json()) as BFFResponse<Record<string, unknown>>
      if (!json.base?.isSuccess) throw new Error(json.base?.message || "get cost result failed")
      return normalizeCostResult(json.data ?? {})
    },
  })
}

// ---------- job counts (list KPIs) ----------

async function fetchJobCount(status: string): Promise<number> {
  const qs = new URLSearchParams({ page: "1", pageSize: "1" })
  if (status) qs.set("status", status)
  const res = await fetch(`/api/v1/finance/calc-jobs?${qs.toString()}`)
  const json = await res.json()
  return Number(json.pagination?.totalItems ?? 0)
}

export interface CalcJobCounts {
  total: number
  queued: number
  processing: number
  failed: number
}

export function useCalcJobCounts() {
  return useQuery({
    queryKey: [...KEYS.all, "job-counts"] as const,
    queryFn: async (): Promise<CalcJobCounts> => {
      const [total, queued, processing, failed] = await Promise.all([
        fetchJobCount(""),
        fetchJobCount("QUEUED"),
        fetchJobCount("PROCESSING"),
        fetchJobCount("FAILED"),
      ])
      return { total, queued, processing, failed }
    },
    staleTime: 15_000,
  })
}

// ---------- cross-product list ----------

export interface ListCostResultsParams {
  period?: string
  calculationType?: string
  status?: string
  search?: string
  productTypeIds?: number[]
  sortBy?: string
  sortOrder?: "asc" | "desc"
  page?: number
  pageSize?: number
}

export interface CostResultsListPage {
  items: CostResult[]
  resolvedPeriod: string
  pagination?: {
    currentPage: number
    pageSize: number
    totalItems: string
    totalPages: number
  }
}

export function useCostResultsList(params: ListCostResultsParams = {}) {
  return useQuery({
    queryKey: KEYS.resultsList(params),
    queryFn: async (): Promise<CostResultsListPage> => {
      const qs = new URLSearchParams()
      if (params.period) qs.set("period", params.period)
      if (params.calculationType) qs.set("calculationType", params.calculationType)
      if (params.status) qs.set("status", params.status)
      if (params.search) qs.set("search", params.search)
      if (params.productTypeIds && params.productTypeIds.length > 0) {
        qs.set("productTypeIds", params.productTypeIds.join(","))
      }
      if (params.sortBy) qs.set("sortBy", params.sortBy)
      if (params.sortOrder) qs.set("sortOrder", params.sortOrder)
      qs.set("page", String(params.page ?? 1))
      qs.set("pageSize", String(params.pageSize ?? 50))
      const res = await fetch(`/api/v1/finance/cost-results?${qs.toString()}`)
      const json = (await res.json()) as BFFResponse<unknown[]> & { resolvedPeriod?: string }
      if (!json.base?.isSuccess) throw new Error(json.base?.message || "list cost results failed")
      return {
        items: ((json.data as unknown[]) || []).map((r) =>
          normalizeCostResult(r as Record<string, unknown>),
        ),
        resolvedPeriod: json.resolvedPeriod || params.period || "",
        pagination: json.pagination
          ? {
              currentPage: Number(json.pagination.currentPage ?? 1),
              pageSize: Number(json.pagination.pageSize ?? 50),
              totalItems: String(json.pagination.totalItems ?? 0),
              totalPages: Number(json.pagination.totalPages ?? 0),
            }
          : undefined,
      }
    },
    staleTime: 30_000,
  })
}

// ---------- distinct periods (for filter dropdown) ----------

export function useCostResultPeriods() {
  return useQuery({
    queryKey: KEYS.periods(),
    queryFn: async (): Promise<{ periods: string[] }> => {
      const res = await fetch(`/api/v1/finance/cost-results/periods`)
      const json = (await res.json()) as BFFResponse<{ periods: string[] }>
      if (!json.base?.isSuccess) throw new Error(json.base?.message || "list cost result periods failed")
      return { periods: json.data?.periods || [] }
    },
    staleTime: 30_000,
  })
}

// ---------- product cost sheet export ----------

export interface RequestCostSheetExportInput {
  // Period is required — MinIO artifacts are namespaced by it.
  period: string
  calculationType?: string
  productTypeIds?: number[]
  search?: string
  status?: string
  // Explicit selection; when non-empty the filters above are ignored server-side.
  productSysIds?: number[]
}

export interface CostSheetExportJobInfo {
  jobId: string
  jobCode: string
  status: string
  // Batch fan-out fields (backend job.Execution parent/child pattern) — only
  // meaningful when isBatch is true. A non-batch (single) export job reports
  // isBatch=false with all counters at zero.
  isBatch: boolean
  totalChildren: number
  completedChildren: number
  failedChildren: number
}

export function useRequestCostSheetExport() {
  return useMutation({
    mutationFn: async (input: RequestCostSheetExportInput): Promise<CostSheetExportJobInfo> => {
      const res = await fetch(`/api/v1/finance/cost-results/request-export`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      const json = (await res.json()) as BFFResponse<Record<string, unknown>>
      const data = ensureOK(json)
      return {
        jobId: String(data?.jobId ?? ""),
        jobCode: String(data?.jobCode ?? ""),
        status: String(data?.status ?? ""),
        isBatch: Boolean(data?.isBatch ?? data?.is_batch ?? false),
        totalChildren: Number(data?.totalChildren ?? data?.total_children ?? 0),
        completedChildren: Number(data?.completedChildren ?? data?.completed_children ?? 0),
        failedChildren: Number(data?.failedChildren ?? data?.failed_children ?? 0),
      }
    },
    onSuccess: (info) => {
      toast.success("Export started", {
        description: `Job ${info.jobCode || info.jobId} is being processed. You'll be notified when it's ready to download.`,
      })
    },
    onError: (err: BFFError) => {
      if (err.statusCode === "409") {
        toast.error("Export already running", { description: err.message })
        return
      }
      toast.error("Failed to start export", { description: err.message })
    },
  })
}

// ---------- export job status (live poll) ----------
//
// GetProductCostSheetExportJobStatus polls job_execution's live counters
// (jex_completed_children/jex_total_children/jex_failed_children), updated
// atomically by the worker as children finish. Works for both a standalone
// job (isBatch=false) and a batch parent (isBatch=true) — mirrors
// useCalcJob's refetchInterval-while-active pattern.
const ACTIVE_EXPORT_STATUSES = ["QUEUED", "PROCESSING"]

export function useExportJobStatus(
  jobId: string | undefined,
  opts?: { enabled?: boolean; refetchInterval?: number },
) {
  return useQuery({
    queryKey: ["finance", "cost-calc", "export-job-status", jobId ?? ""],
    enabled: !!jobId && (opts?.enabled ?? true),
    queryFn: async (): Promise<CostSheetExportJobInfo> => {
      const res = await fetch(`/api/v1/finance/cost-results/exports/${jobId}/status`)
      const json = (await res.json()) as BFFResponse<Record<string, unknown>>
      const data = ensureOK(json)
      return {
        jobId: String(data?.jobId ?? ""),
        jobCode: String(data?.jobCode ?? ""),
        status: String(data?.status ?? ""),
        isBatch: Boolean(data?.isBatch ?? data?.is_batch ?? false),
        totalChildren: Number(data?.totalChildren ?? data?.total_children ?? 0),
        completedChildren: Number(data?.completedChildren ?? data?.completed_children ?? 0),
        failedChildren: Number(data?.failedChildren ?? data?.failed_children ?? 0),
      }
    },
    refetchInterval: (query) => {
      const info = query.state.data as CostSheetExportJobInfo | undefined
      if (info && ACTIVE_EXPORT_STATUSES.includes(info.status)) {
        return opts?.refetchInterval ?? 3000
      }
      return false
    },
  })
}

// ---------- batch export progress (live poll + SSE fallback) ----------
//
// Polls GetProductCostSheetExportJobStatus while the job is active so
// progress increments live instead of only flipping once at the end. The SSE
// batch-complete notification (source_type "finance.product_cost_sheet_export",
// action_type NONE — see CostSheetExportHandler.emitBatchReadyNotification)
// is still observed as a cheap "definitely done now" signal / for cross-tab
// consistency, but polling is now the primary progress source.
export interface ExportBatchProgress {
  totalChildren: number
  completedChildren: number
  failedChildren: number
  isBatch: boolean
  /** True once the job has reached a terminal state (poll or notification). */
  done: boolean
  /** True if every child (or the standalone job) ended in failure. */
  failed: boolean
}

const TERMINAL_EXPORT_STATUSES = ["SUCCESS", "FAILED", "CANCELLED"]

// useExportBatchProgress drives the export button's status UI for BOTH a
// batch parent (isBatch=true, live child counters) and a standalone job
// (isBatch=false, single success/fail outcome modeled as a 1-item batch) so
// callers can share one done/failed/download code path regardless of shape.
export function useExportBatchProgress(job: CostSheetExportJobInfo | null): ExportBatchProgress | null {
  const [progress, setProgress] = useState<ExportBatchProgress | null>(null)
  const statusQuery = useExportJobStatus(job?.jobId, {
    enabled: !!job,
  })

  useEffect(() => {
    if (!job) {
      setProgress(null)
      return
    }
    setProgress({
      totalChildren: job.isBatch ? job.totalChildren : 1,
      completedChildren: job.isBatch ? job.completedChildren : 0,
      failedChildren: job.isBatch ? job.failedChildren : 0,
      isBatch: job.isBatch,
      done: false,
      failed: false,
    })
    if (!job.isBatch) return
    const unsubscribe = useNotificationEventStore.getState().subscribe((n) => {
      if (n.sourceType !== "finance.product_cost_sheet_export" || n.sourceId !== job.jobId) return
      setProgress((prev) => {
        const total = prev?.totalChildren ?? job.totalChildren
        const failed = n.severity === NotificationSeverity.NOTIFICATION_SEVERITY_ERROR
        return {
          totalChildren: total,
          completedChildren: failed ? (prev?.completedChildren ?? 0) : total,
          failedChildren: failed ? total : (prev?.failedChildren ?? 0),
          isBatch: true,
          done: true,
          failed,
        }
      })
    })
    return unsubscribe
    // job.jobId is the stable identity for the subscription; other job fields
    // only matter for the initial snapshot above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.jobId, job?.isBatch])

  useEffect(() => {
    const info = statusQuery.data
    if (!info || !job) return
    const done = TERMINAL_EXPORT_STATUSES.includes(info.status)
    if (job.isBatch) {
      setProgress((prev) => ({
        totalChildren: info.totalChildren || prev?.totalChildren || 0,
        completedChildren: info.completedChildren,
        failedChildren: info.failedChildren,
        isBatch: true,
        done: done || (prev?.done ?? false),
        failed: done ? info.failedChildren >= info.totalChildren && info.totalChildren > 0 : (prev?.failed ?? false),
      }))
      return
    }
    setProgress((prev) => ({
      totalChildren: 1,
      completedChildren: info.status === "SUCCESS" ? 1 : 0,
      failedChildren: info.status === "FAILED" || info.status === "CANCELLED" ? 1 : 0,
      isBatch: false,
      done: done || (prev?.done ?? false),
      failed: done ? info.status !== "SUCCESS" : (prev?.failed ?? false),
    }))
  }, [statusQuery.data, job?.isBatch, job])

  return progress
}

// ---------- batch export children (list once a batch reaches a terminal state) ----------
//
// ListCostSheetExportBatchChildren is safe to fetch exactly once, no polling,
// once the batch job is done: handleChildCompletion() in
// costsheet_export_handler.go increments the parent's completed/failed
// counters via an atomic UPDATE ... RETURNING, and the single batch-complete
// notification only fires when that increment reports every child accounted
// for (completed + failed == total). By the time useExportBatchProgress's
// `done` flips true, every child row in the DB is already terminal
// (SUCCESS/FAILED) with its download_url resolved if applicable — so a
// second fetch or refetchInterval here would only ever return the same data.

export interface ExportBatchChild {
  jobId: string
  jobCode: string
  status: string
  downloadUrl: string
  fileName: string
}

export function useExportBatchChildren(
  parentJobId: string | undefined,
  opts?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: KEYS.exportBatchChildren(parentJobId ?? ""),
    enabled: !!parentJobId && (opts?.enabled ?? true),
    queryFn: async (): Promise<ExportBatchChild[]> => {
      if (!parentJobId) return []
      const res = await fetch(`/api/v1/finance/cost-results/exports/${parentJobId}/children`)
      const json = (await res.json()) as BFFResponse<{ children?: Record<string, unknown>[] }>
      if (!json.base?.isSuccess) {
        throw new Error(json.base?.message || "list export batch children failed")
      }
      return (json.data?.children || []).map((c) => ({
        jobId: String(c.jobId ?? c.job_id ?? ""),
        jobCode: String(c.jobCode ?? c.job_code ?? ""),
        status: String(c.status ?? ""),
        downloadUrl: String(c.downloadUrl ?? c.download_url ?? ""),
        fileName: String(c.fileName ?? c.file_name ?? ""),
      }))
    },
    staleTime: Infinity,
  })
}

// ---------- batch child download URL (fresh presign on demand) ----------
//
// The batch-children list (useExportBatchChildren) is fetched once and
// cached forever (staleTime: Infinity) — any downloadUrl it carries can be
// stale by the time the user actually clicks Download, since MinIO presigned
// URLs expire after ~5 min. This mutation re-presigns fresh on every call,
// meant to be fired right before window.open()'ing the result.

export interface BatchChildDownloadUrlInput {
  parentJobId: string
  childJobId: string
}

export interface BatchChildDownloadUrlResult {
  downloadUrl: string
  fileName: string
}

export function useBatchChildDownloadUrl() {
  return useMutation({
    mutationFn: async ({
      parentJobId,
      childJobId,
    }: BatchChildDownloadUrlInput): Promise<BatchChildDownloadUrlResult> => {
      const res = await fetch(
        `/api/v1/finance/cost-results/exports/${parentJobId}/children/${childJobId}/download-url`,
      )
      const json = (await res.json()) as BFFResponse<Record<string, unknown>>
      const data = ensureOK(json)
      return {
        downloadUrl: String(data?.downloadUrl ?? ""),
        fileName: String(data?.fileName ?? ""),
      }
    },
    onError: (err: Error) => toast.error("Failed to get download link", { description: err.message }),
  })
}

// ---------- export job history ("recent exports") ----------

export interface ListExportJobsParams {
  period?: string
  page?: number
  pageSize?: number
}

export interface ExportJobSummaryItem {
  jobId: string
  jobCode: string
  period: string
  status: string
  totalChildren: number
  completedChildren: number
  failedChildren: number
  queuedAt: string
  isBatch: boolean
}

export interface ListExportJobsResult {
  items: ExportJobSummaryItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function useExportJobsList(params: ListExportJobsParams = {}) {
  return useQuery({
    queryKey: KEYS.exportJobsList(params),
    queryFn: async (): Promise<ListExportJobsResult> => {
      const qs = new URLSearchParams()
      if (params.period) qs.set("period", params.period)
      qs.set("page", String(params.page ?? 1))
      qs.set("pageSize", String(params.pageSize ?? 10))
      const res = await fetch(`/api/v1/finance/cost-results/exports?${qs.toString()}`)
      const json = (await res.json()) as BFFResponse<Record<string, unknown>[]>
      if (!json.base?.isSuccess) throw new Error(json.base?.message || "list export jobs failed")
      const items = ((json.data as Record<string, unknown>[]) || []).map((row) => ({
        jobId: String(row.jobId ?? row.job_id ?? ""),
        jobCode: String(row.jobCode ?? row.job_code ?? ""),
        period: String(row.period ?? ""),
        status: String(row.status ?? ""),
        totalChildren: Number(row.totalChildren ?? row.total_children ?? 0),
        completedChildren: Number(row.completedChildren ?? row.completed_children ?? 0),
        failedChildren: Number(row.failedChildren ?? row.failed_children ?? 0),
        queuedAt: String(row.queuedAt ?? row.queued_at ?? ""),
        isBatch: Boolean(row.isBatch ?? row.is_batch ?? false),
      }))
      const pag = json.pagination
      return {
        items,
        total: Number(pag?.totalItems ?? items.length),
        page: pag?.currentPage ?? 1,
        pageSize: pag?.pageSize ?? items.length,
        totalPages: pag?.totalPages ?? 1,
      }
    },
    staleTime: 15_000,
  })
}

// ---------- breakdown ----------

export function useCostBreakdown(
  productSysId: number | undefined,
  period: string | undefined,
  calcType: CalculationType | undefined,
) {
  return useQuery({
    queryKey: KEYS.breakdown(productSysId ?? 0, period ?? "", calcType ?? "ACTUAL"),
    enabled: !!productSysId && !!period && !!calcType,
    queryFn: async (): Promise<CostBreakdown | null> => {
      if (!productSysId || !period || !calcType) return null
      const res = await fetch(
        `/api/v1/finance/cost-results/${productSysId}/${period}/${calcType}/breakdown`,
      )
      const json = (await res.json()) as BFFResponse<Record<string, unknown>>
      if (!json.base?.isSuccess) throw new Error(json.base?.message || "get breakdown failed")
      return normalizeCostBreakdown(json.data ?? {})
    },
  })
}

// ---------- history ----------

export interface ListCostHistoryResult {
  items: CostHistoryEntry[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function useCostHistory(
  productSysId: number | undefined,
  params: ListCostHistoryParams = {},
) {
  return useQuery({
    queryKey: KEYS.history(productSysId ?? 0, params),
    enabled: !!productSysId,
    queryFn: async (): Promise<ListCostHistoryResult> => {
      const qs = new URLSearchParams()
      if (params.calculationType) qs.set("calculationType", params.calculationType)
      if (params.page) qs.set("page", String(params.page))
      if (params.pageSize) qs.set("pageSize", String(params.pageSize))
      const res = await fetch(
        `/api/v1/finance/cost-results/${productSysId}/history?${qs.toString()}`,
      )
      const json = (await res.json()) as BFFResponse<unknown[]>
      if (!json.base?.isSuccess) throw new Error(json.base?.message || "list history failed")
      const items = ((json.data as unknown[]) || []).map((row) =>
        normalizeCostHistoryEntry(row as Record<string, unknown>),
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

// ---------- verify / approve ----------

export function useVerifyCost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ costId }: { costId: number }): Promise<CostResult> => {
      const res = await fetch(`/api/v1/finance/cost-results/by-id/${costId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
      const json = (await res.json()) as BFFResponse<Record<string, unknown>>
      const data = ensureOK(json)
      return normalizeCostResult((data ?? {}) as Record<string, unknown>)
    },
    onSuccess: () => {
      toast.success("Cost result verified")
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useApproveCost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ costId }: { costId: number }): Promise<CostResult> => {
      const res = await fetch(`/api/v1/finance/cost-results/by-id/${costId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
      const json = (await res.json()) as BFFResponse<Record<string, unknown>>
      const data = ensureOK(json)
      return normalizeCostResult((data ?? {}) as Record<string, unknown>)
    },
    onSuccess: () => {
      toast.success("Cost result approved")
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export const costCalcKeys = KEYS
