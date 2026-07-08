"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { fillAssignmentKeys } from "@/hooks/finance/use-fill-assignment"
import { apiClient, buildQueryString, downloadFileFromBytes } from "@/lib/api"
import {
  type ClosedSubstatus,
  type CostProductRequest,
  type CreateCostProductRequestPayload,
  type ExportCostProductRequestsParams,
  type ExportCostProductRequestsResponse,
  type ImportCostProductRequestsResponse,
  type GetCostProductRequestImportTemplateResponse,
  type ListCostProductRequestsParams,
  type ProductClassification,
  type UpdateCostProductRequestPayload,
  ExportCostProductRequestsResponseParser,
  ImportCostProductRequestsResponseParser,
  GetCostProductRequestImportTemplateResponseParser,
  normalizeCostProductRequest,
} from "@/types/finance/cost-product-request"

const KEYS = {
  all: ["finance", "cost-product-request"] as const,
  lists: () => ["finance", "cost-product-request", "list"] as const,
  list: (p: ListCostProductRequestsParams) => ["finance", "cost-product-request", "list", p] as const,
  detail: (id: number) => ["finance", "cost-product-request", "detail", id] as const,
}

async function postJson(url: string, body?: unknown): Promise<{ data: CostProductRequest | null }> {
  const res = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!json.base?.isSuccess) throw new Error(json.base?.message || "Failed")
  return { data: json.data ? normalizeCostProductRequest(json.data) : null }
}

export function useCostProductRequests(params: ListCostProductRequestsParams) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams()
      if (params.search) qs.set("search", params.search)
      if (params.status) qs.set("status", params.status)
      if (params.requestTypeId) qs.set("requestTypeId", String(params.requestTypeId))
      if (params.requesterUserId) qs.set("requesterUserId", params.requesterUserId)
      if (params.assigneeUserId) qs.set("assigneeUserId", params.assigneeUserId)
      if (params.sortBy) qs.set("sortBy", params.sortBy)
      if (params.sortOrder) qs.set("sortOrder", params.sortOrder)
      if (params.page) qs.set("page", String(params.page))
      if (params.pageSize) qs.set("pageSize", String(params.pageSize))
      const res = await fetch(`/api/v1/finance/cost-product-requests?${qs.toString()}`)
      const json = await res.json()
      return {
        items: ((json.data as unknown[]) || []).map((r) => normalizeCostProductRequest(r as Parameters<typeof normalizeCostProductRequest>[0])),
        pagination: json.pagination,
      }
    },
    staleTime: 30_000,
  })
}

// fetchCount returns just the pagination.totalItems for a given status filter
// (pageSize=1 keeps the payload tiny — we only read the count).
async function fetchCount(status: string): Promise<number> {
  const qs = new URLSearchParams({ page: "1", pageSize: "1" })
  if (status) qs.set("status", status)
  const res = await fetch(`/api/v1/finance/cost-product-requests?${qs.toString()}`)
  const json = await res.json()
  return Number(json.pagination?.totalItems ?? 0)
}

export interface RequestStatusCounts {
  total: number
  open: number
  rejected: number
  closed: number
}

// useCostProductRequestCounts powers the list-page KPI widgets. Open = total
// minus the two terminal states.
export function useCostProductRequestCounts() {
  return useQuery({
    queryKey: [...KEYS.all, "counts"] as const,
    queryFn: async (): Promise<RequestStatusCounts> => {
      const [total, rejected, closed] = await Promise.all([
        fetchCount(""),
        fetchCount("REJECTED"),
        fetchCount("CLOSED"),
      ])
      return { total, rejected, closed, open: Math.max(0, total - rejected - closed) }
    },
    staleTime: 30_000,
  })
}

export function useCostProductRequest(requestId: number | undefined) {
  return useQuery({
    queryKey: KEYS.detail(requestId ?? 0),
    queryFn: async () => {
      if (!requestId) return null
      const res = await fetch(`/api/v1/finance/cost-product-requests/${requestId}`)
      const json = await res.json()
      return json.data ? normalizeCostProductRequest(json.data) : null
    },
    enabled: !!requestId,
  })
}

export function useCreateCostProductRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateCostProductRequestPayload) => {
      const res = await fetch("/api/v1/finance/cost-product-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!json.base?.isSuccess) throw new Error(json.base?.message || "Failed")
      return normalizeCostProductRequest(json.data)
    },
    onSuccess: (r) => {
      toast.success(`Request ${r.requestNo} created`)
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateCostProductRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { requestId: number } & UpdateCostProductRequestPayload) => {
      const { requestId, ...payload } = input
      const res = await fetch(`/api/v1/finance/cost-product-requests/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!json.base?.isSuccess) throw new Error(json.base?.message || "Failed")
      return normalizeCostProductRequest(json.data)
    },
    onSuccess: () => {
      toast.success("Request updated")
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// =============================================================================
// State transitions — one mutation each.
// =============================================================================

function makeTransition(slug: string, successMsg: string) {
  return function useTransition() {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: async (input: { requestId: number; body?: Record<string, unknown> }) => {
        const result = await postJson(`/api/v1/finance/cost-product-requests/${input.requestId}/${slug}`, input.body)
        return result.data
      },
      onSuccess: () => {
        toast.success(successMsg)
        qc.invalidateQueries({ queryKey: KEYS.all })
      },
      onError: (e: Error) => toast.error(e.message),
    })
  }
}

export const useSubmitRequest = makeTransition("submit", "Submitted")
export const useStartReview = makeTransition("start-review", "Review started")
export const useUseExistingCosting = makeTransition("use-existing-costing", "Marked quote-ready")
export const useReviseRequest = makeTransition("revise", "Revised; back to SUBMITTED")
export const useReopenRequest = makeTransition("reopen", "Reopened; back to DRAFT")
export const useRejectRequest = makeTransition("reject", "Rejected")
export const useCancelRequest = makeTransition("cancel", "Cancelled")
export function useMarkParameterPending() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { requestId: number; body?: Record<string, unknown> }) => {
      const result = await postJson(`/api/v1/finance/cost-product-requests/${input.requestId}/mark-parameter-pending`, input.body)
      return result.data
    },
    onSuccess: () => {
      toast.success("Route promoted — fill tasks created")
      qc.invalidateQueries({ queryKey: KEYS.all })
      qc.invalidateQueries({ queryKey: fillAssignmentKeys.all })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
export const useMarkParameterComplete = makeTransition(
  "mark-parameter-complete",
  "Marked PARAMETER_COMPLETE",
)
export const useConfirmRequest = makeTransition("confirm", "Confirmed")
export const useApproveRequest = makeTransition("approve", "Approved")
export const useReleaseRequest = makeTransition("release", "Released — ready for costing")

// Hooks with structured payloads.
export function useVerifyClassification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { requestId: number; verifiedClassification: ProductClassification; overrideReason?: string }) => {
      const result = await postJson(`/api/v1/finance/cost-product-requests/${input.requestId}/verify-classification`, {
        verifiedClassification: input.verifiedClassification,
        overrideReason: input.overrideReason || "",
      })
      return result.data
    },
    onSuccess: () => {
      toast.success("Classification verified")
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDecideFeasibility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { requestId: number; decision: "FEASIBLE" | "NOT_FEASIBLE"; note?: string }) => {
      const result = await postJson(`/api/v1/finance/cost-product-requests/${input.requestId}/decide-feasibility`, {
        decision: input.decision,
        note: input.note || "",
      })
      return result.data
    },
    onSuccess: () => {
      toast.success("Feasibility decided")
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// useSubmitAndDecide is the B3 merged action — replaces the standalone Submit +
// Start review click sequence. It performs Submit + StartReview + VerifyClassification +
// DecideFeasibility + (if FEASIBLE) LinkRoute server-side in one call, gated by a single
// `finance.product.request.review` permission (design.md §3 B3). Used by
// ClassificationAndFeasibilityDialog when opened from a DRAFT request.
export function useSubmitAndDecide() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      requestId: number
      verifiedClassification: ProductClassification
      overrideReason?: string
      decision: "FEASIBLE" | "NOT_FEASIBLE"
      note?: string
      referenceProductHeadId?: number
    }) => {
      const result = await postJson(`/api/v1/finance/cost-product-requests/${input.requestId}/submit-and-decide`, {
        verifiedClassification: input.verifiedClassification,
        overrideReason: input.overrideReason || "",
        decision: input.decision,
        note: input.note || "",
        referenceProductHeadId: input.referenceProductHeadId || 0,
      })
      return result.data
    },
    onSuccess: () => {
      toast.success("Submitted and decided")
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useCloseRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { requestId: number; closedSubstatus: ClosedSubstatus }) => {
      const result = await postJson(`/api/v1/finance/cost-product-requests/${input.requestId}/close`, {
        closedSubstatus: input.closedSubstatus,
      })
      return result.data
    },
    onSuccess: () => {
      toast.success("Closed")
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useAssignRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { requestId: number; assigneeUserId: string }) => {
      const result = await postJson(`/api/v1/finance/cost-product-requests/${input.requestId}/assign`, {
        assigneeUserId: input.assigneeUserId,
      })
      return result.data
    },
    onSuccess: () => {
      toast.success("Assigned")
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export const costProductRequestKeys = KEYS

// =============================================================================
// Export/Import/Template (design.md §4 Area D6, P4-T4) — mirrors use-uom.ts's
// useExportUOMs/useImportUOMs/useDownloadTemplate (apiClient-based style),
// not this file's own postJson/fetch style, per plan.md's explicit mirror
// instruction for the 3 new hooks.
// =============================================================================

/**
 * Hook for exporting cost product requests to Excel.
 */
export function useExportCostProductRequests() {
  return useMutation({
    mutationFn: async (params: ExportCostProductRequestsParams = {}): Promise<ExportCostProductRequestsResponse> => {
      const queryString = buildQueryString(params as Record<string, unknown>)
      const rawResponse = await apiClient.get<unknown>(`/api/v1/finance/cost-product-requests/export${queryString}`)
      return ExportCostProductRequestsResponseParser.fromJSON(rawResponse)
    },
    onSuccess: (response) => {
      if (response.base?.isSuccess && response.fileContent.length > 0) {
        downloadFileFromBytes(response.fileContent, response.fileName || "product-requests-export.xlsx")
        toast.success("Export completed successfully")
      } else {
        toast.error(response.base?.message || "Failed to export product requests")
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to export product requests")
    },
  })
}

/**
 * Import request data for cost product requests.
 */
interface ImportCostProductRequestsData {
  fileContent: Uint8Array
  fileName: string
  duplicateAction: string
}

/**
 * Hook for importing cost product requests from Excel. Create-only in v1
 * (design.md §4 D6): every row creates a new DRAFT request, so
 * updatedCount/skippedCount are always 0.
 */
export function useImportCostProductRequests() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (data: ImportCostProductRequestsData): Promise<ImportCostProductRequestsResponse> => {
      const rawResponse = await apiClient.post<unknown>("/api/v1/finance/cost-product-requests/import", {
        fileContent: Array.from(data.fileContent), // Convert Uint8Array to array for JSON
        fileName: data.fileName,
        duplicateAction: data.duplicateAction,
      })
      return ImportCostProductRequestsResponseParser.fromJSON(rawResponse)
    },
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: costProductRequestKeys.lists() })
      if (response.base?.isSuccess) {
        const { successCount, updatedCount, skippedCount, failedCount } = response
        toast.success(
          `Import completed: ${successCount} created, ${updatedCount} updated, ${skippedCount} skipped, ${failedCount} failed`
        )
      } else {
        toast.error(response.base?.message || "Failed to import product requests")
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to import product requests")
    },
  })
}

/**
 * Hook for downloading the cost product request import template.
 */
export function useDownloadCostProductRequestTemplate() {
  return useMutation({
    mutationFn: async (): Promise<GetCostProductRequestImportTemplateResponse> => {
      const rawResponse = await apiClient.get<unknown>("/api/v1/finance/cost-product-requests/template")
      return GetCostProductRequestImportTemplateResponseParser.fromJSON(rawResponse)
    },
    onSuccess: (response) => {
      if (response.base?.isSuccess && response.fileContent.length > 0) {
        downloadFileFromBytes(response.fileContent, response.fileName || "product-request-import-template.xlsx")
        toast.success("Template downloaded successfully")
      } else {
        toast.error(response.base?.message || "Failed to download template")
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to download template")
    },
  })
}

// -- Approval Trace History --------------------------------------------------

interface StatusHistoryEntry {
  id: number
  requestId: number
  fromStatus: string
  toStatus: string
  actorUserId: string
  actorName: string
  note: string
  createdAt: string
}

function normalizeHistoryEntry(raw: Record<string, unknown>): StatusHistoryEntry {
  return {
    id: Number(raw.id ?? 0),
    requestId: Number(raw.requestId ?? raw["request_id"] ?? 0),
    fromStatus: String(raw.fromStatus ?? raw["from_status"] ?? ""),
    toStatus: String(raw.toStatus ?? raw["to_status"] ?? ""),
    actorUserId: String(raw.actorUserId ?? raw["actor_user_id"] ?? ""),
    actorName: String(raw.actorName ?? raw["actor_name"] ?? ""),
    note: String(raw.note ?? ""),
    createdAt: String(raw.createdAt ?? raw["created_at"] ?? ""),
  }
}

export function useRequestHistory(requestId: number) {
  return useQuery({
    queryKey: ["finance", "cpr", "history", requestId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/finance/cost-product-requests/${requestId}/history`)
      if (!res.ok) throw new Error("Failed to fetch history")
      const data = (await res.json()) as { entries?: Record<string, unknown>[] }
      return (data.entries ?? []).map(normalizeHistoryEntry)
    },
    enabled: requestId > 0,
    staleTime: 30_000,
  })
}
