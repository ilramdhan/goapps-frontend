"use client"

// MB Head Hooks - TanStack Query hooks for MB Head operations

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { createCrudHooks } from "@/lib/hooks"
import { apiClient, buildQueryString, downloadFileFromBytes } from "@/lib/api"
import {
  type MBHead,
  type CreateMBHeadRequest,
  type UpdateMBHeadRequest,
  type ListMBHeadsParams,
  type ExportMBHeadsParams,
  type ExportMBRecipeFullParams,
  type ExportMBCostCalcDetailParams,
  type ListMBHeadsResponse,
  type CreateMBHeadResponse,
  type UpdateMBHeadResponse,
  type DeleteMBHeadResponse,
  type GetMBHeadResponse,
  type ExportMBHeadsResponse,
  type ExportMBRecipeFullResponse,
  type ExportMBCostCalcDetailResponse,
  type ImportMBHeadsResponse,
  type DownloadMBHeadTemplateResponse,
  ListMBHeadsResponseParser,
  CreateMBHeadResponseParser,
  UpdateMBHeadResponseParser,
  DeleteMBHeadResponseParser,
  GetMBHeadResponseParser,
  ExportMBHeadsResponseParser,
  ExportMBRecipeFullResponseParser,
  ExportMBCostCalcDetailResponseParser,
  ImportMBHeadsResponseParser,
  DownloadMBHeadTemplateResponseParser,
} from "@/types/finance/mb-head"
import {
  submitMBHead,
  approveMBHead,
  validateMBHead,
  unApproveMBHead,
  revokeMBHead,
  rejectMBHead,
  returnMBHeadToDraft,
  unrevokeMBHead,
  requestUnlockMBHead,
  grantUnlockMBHead,
  rejectUnlockMBHead,
} from "@/services/finance/mb-head-api"

// ============================================================================
// Create CRUD hooks using factory
// ============================================================================

const {
  useList: useMBHeads,
  useGet: useMBHead,
  useCreate: useCreateMBHead,
  useUpdate: useUpdateMBHead,
  useDelete: useDeleteMBHead,
  queryKeys: mbHeadKeys,
} = createCrudHooks<
  MBHead,
  ListMBHeadsParams,
  CreateMBHeadRequest,
  UpdateMBHeadRequest,
  ListMBHeadsResponse,
  CreateMBHeadResponse,
  UpdateMBHeadResponse,
  DeleteMBHeadResponse,
  GetMBHeadResponse
>({
  serviceScope: "finance",
  resourceName: "mb-head",
  apiBasePath: "/api/v1/finance/mb-heads",
  parsers: {
    listResponse: (data) => ListMBHeadsResponseParser.fromJSON(data),
    createResponse: (data) => CreateMBHeadResponseParser.fromJSON(data),
    updateResponse: (data) => UpdateMBHeadResponseParser.fromJSON(data),
    deleteResponse: (data) => DeleteMBHeadResponseParser.fromJSON(data),
    getResponse: (data) => GetMBHeadResponseParser.fromJSON(data),
  },
  getEntityId: (mbHead) => String(mbHead.mbhId),
  messages: {
    createSuccess: "MB Head created successfully",
    updateSuccess: "MB Head updated successfully",
    deleteSuccess: "MB Head deleted successfully",
  },
})

// Export CRUD hooks
export {
  useMBHeads,
  useMBHead,
  useCreateMBHead,
  useUpdateMBHead,
  useDeleteMBHead,
  mbHeadKeys,
}

// ============================================================================
// Export Hook
// ============================================================================

export function useExportMBHeads() {
  return useMutation({
    mutationFn: async (params: ExportMBHeadsParams = {}): Promise<ExportMBHeadsResponse> => {
      const queryString = buildQueryString(params as Record<string, unknown>)
      const rawResponse = await apiClient.get<unknown>(`/api/v1/finance/mb-heads/export${queryString}`)
      return ExportMBHeadsResponseParser.fromJSON(rawResponse)
    },
    onSuccess: (response) => {
      if (response.base?.isSuccess && response.fileContent.length > 0) {
        downloadFileFromBytes(response.fileContent, response.fileName || "mb-heads-export.xlsx")
        toast.success("Export completed successfully")
      } else {
        toast.error(response.base?.message || "Failed to export MB Heads")
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to export MB Heads")
    },
  })
}

/**
 * P12 (C1 + C2) — denormalized full-recipe export: one row per composition line,
 * with the MB cost block joined in.
 *
 * Deliberately SEPARATE from `useExportMBHeads`, which drives the round-trip import
 * format (D7) and must not change. This one is a read-only report and is gated on the
 * `finance.mb.recipe.export` permission server-side.
 *
 * Omitted params are sent omitted: `period` empty means "latest active period per
 * head", `costType` empty means the backend default (ACTUAL), and `checkStatusCalc`
 * empty means NO derived-check-status filter — every head, including the ones whose
 * derived status is still NULL ("Belum dihitung").
 */
export function useExportMBRecipeFull() {
  return useMutation({
    mutationFn: async (params: ExportMBRecipeFullParams = {}): Promise<ExportMBRecipeFullResponse> => {
      const queryString = buildQueryString(params as Record<string, unknown>)
      const rawResponse = await apiClient.get<unknown>(
        `/api/v1/finance/mb-heads/export-full${queryString}`
      )
      return ExportMBRecipeFullResponseParser.fromJSON(rawResponse)
    },
    onSuccess: (response) => {
      if (response.base?.isSuccess && response.fileContent.length > 0) {
        downloadFileFromBytes(response.fileContent, response.fileName || "mb-recipe-full-export.xlsx")
        toast.success("Full recipe export completed successfully")
      } else {
        toast.error(response.base?.message || "Failed to export full MB recipe")
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to export full MB recipe")
    },
  })
}

/**
 * Flat 29-column snake_case dump of the PERSISTED cost snapshot — one row per
 * (MB, raw-material line).
 *
 * ⛔ Deliberately SEPARATE from `useExportMBRecipeFull`. That one is the 37-column
 * recipe report and must stay byte-for-byte unchanged; this one has a different grain
 * (RM lines out of the cost snapshot, not composition rows) and a different column set.
 *
 * Every mb_* aggregate in the output is READ FROM the stored snapshot, never re-derived
 * by summing the RM detail rows — the two disagree for a large minority of MBs, so the
 * stored value is the only correct one.
 *
 * Gated server-side on the same `finance.mb.recipe.export` permission as the full
 * recipe export. Omitted params are sent omitted (D13).
 */
export function useExportMBCostCalcDetail() {
  return useMutation({
    mutationFn: async (
      params: ExportMBCostCalcDetailParams = {}
    ): Promise<ExportMBCostCalcDetailResponse> => {
      const queryString = buildQueryString(params as Record<string, unknown>)
      const rawResponse = await apiClient.get<unknown>(
        `/api/v1/finance/mb-heads/export-cost-calc-detail${queryString}`
      )
      return ExportMBCostCalcDetailResponseParser.fromJSON(rawResponse)
    },
    onSuccess: (response) => {
      if (response.base?.isSuccess && response.fileContent.length > 0) {
        downloadFileFromBytes(
          response.fileContent,
          response.fileName || "mb_cost_calc_detail_export.xlsx"
        )
        toast.success("Cost calc detail export completed successfully")
      } else {
        toast.error(response.base?.message || "Failed to export MB cost calc detail")
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to export MB cost calc detail")
    },
  })
}

// ============================================================================
// Import Hook
// ============================================================================

interface ImportData {
  fileContent: Uint8Array
  fileName: string
  duplicateAction: string
}

export function useImportMBHeads() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ImportData): Promise<ImportMBHeadsResponse> => {
      const rawResponse = await apiClient.post<unknown>("/api/v1/finance/mb-heads/import", {
        fileContent: Array.from(data.fileContent),
        fileName: data.fileName,
        duplicateAction: data.duplicateAction,
      })
      return ImportMBHeadsResponseParser.fromJSON(rawResponse)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: mbHeadKeys.lists() })
      if (response.base?.isSuccess) {
        const { successCount, skippedCount, failedCount } = response
        toast.success(
          `Import completed: ${successCount} created, ${skippedCount} skipped, ${failedCount} failed`
        )
      } else {
        toast.error(response.base?.message || "Failed to import MB Heads")
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to import MB Heads")
    },
  })
}

// ============================================================================
// Workflow Transition Hooks
// ============================================================================

function useMbHeadTransition(
  transitionFn: (mbhId: string) => Promise<MBHead>,
  successMessage: string,
  errorMessage: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (mbhId: string) => transitionFn(mbhId),
    onSuccess: (_, mbhId) => {
      queryClient.invalidateQueries({ queryKey: mbHeadKeys.detail(mbhId) })
      queryClient.invalidateQueries({ queryKey: mbHeadKeys.lists() })
      toast.success(successMessage)
    },
    onError: (error: Error) => {
      toast.error(error.message || errorMessage)
    },
  })
}

function useMbHeadReasonTransition(
  transitionFn: (mbhId: string, reason: string) => Promise<MBHead>,
  successMessage: string,
  errorMessage: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ mbhId, reason }: { mbhId: string; reason: string }) =>
      transitionFn(mbhId, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: mbHeadKeys.detail(variables.mbhId) })
      queryClient.invalidateQueries({ queryKey: mbHeadKeys.lists() })
      toast.success(successMessage)
    },
    onError: (error: Error) => {
      toast.error(error.message || errorMessage)
    },
  })
}

export function useSubmitMBHead() {
  return useMbHeadTransition(submitMBHead, "MB Head submitted for approval", "Failed to submit MB Head")
}

export function useApproveMBHead() {
  return useMbHeadTransition(approveMBHead, "MB Head approved", "Failed to approve MB Head")
}

export function useValidateMBHead() {
  return useMbHeadTransition(validateMBHead, "MB Head validated", "Failed to validate MB Head")
}

export function useUnApproveMBHead() {
  return useMbHeadReasonTransition(unApproveMBHead, "MB Head un-approved", "Failed to un-approve MB Head")
}

export function useRevokeMBHead() {
  return useMbHeadReasonTransition(revokeMBHead, "MB Head revoked", "Failed to revoke MB Head")
}

export function useRejectMBHead() {
  return useMbHeadReasonTransition(rejectMBHead, "MB Head rejected", "Failed to reject MB Head")
}

// K-29: REJECTED → DRAFT. Same reason-carrying shape as the other transitions, but
// the reason is OPTIONAL — callers may pass "" and the backend keeps the old stateReason.
export function useReturnMBHeadToDraft() {
  return useMbHeadReasonTransition(
    returnMBHeadToDraft,
    "MB Head returned to draft",
    "Failed to return MB Head to draft",
  )
}

// 2026-08-31: REVOKED → DRAFT, gated by the dedicated finance.mb.head.unrevoke
// permission (Super Admin only). Reason is OPTIONAL — same shape as
// useReturnMBHeadToDraft above.
export function useUnrevokeMBHead() {
  return useMbHeadReasonTransition(
    unrevokeMBHead,
    "MB Head unrevoked",
    "Failed to unrevoke MB Head",
  )
}

// ============================================================================
// P10 Unlock Hooks (request / grant / reject)
// ============================================================================

// P10: APPROVED|VALIDATED → UNLOCK_REQUESTED. The reason is MANDATORY — the domain
// returns ErrReasonRequired for an empty or whitespace-only value — so this uses the
// reason-carrying helper WITHOUT `reasonOptional` on the calling dialog.
export function useRequestUnlockMBHead() {
  return useMbHeadReasonTransition(
    requestUnlockMBHead,
    "Unlock requested",
    "Failed to request unlock",
  )
}

// P10: UNLOCK_REQUESTED → DRAFT. ⛔ Deliberately the NO-reason helper: GrantUnlockMBHeadRequest
// carries no reason field at all (granting is an assent, and the original request reason is
// what stays on record).
export function useGrantUnlockMBHead() {
  return useMbHeadTransition(
    grantUnlockMBHead,
    "Unlock granted",
    "Failed to grant unlock",
  )
}

// P10/K-52: UNLOCK_REQUESTED → back to whichever locked state it came from. Reason MANDATORY.
export function useRejectUnlockMBHead() {
  return useMbHeadReasonTransition(
    rejectUnlockMBHead,
    "Unlock request rejected",
    "Failed to reject unlock request",
  )
}

// ============================================================================
// Download Template Hook
// ============================================================================

export function useDownloadMBHeadTemplate() {
  return useMutation({
    mutationFn: async (): Promise<DownloadMBHeadTemplateResponse> => {
      const rawResponse = await apiClient.get<unknown>("/api/v1/finance/mb-heads/template")
      return DownloadMBHeadTemplateResponseParser.fromJSON(rawResponse)
    },
    onSuccess: (response) => {
      if (response.base?.isSuccess && response.fileContent.length > 0) {
        downloadFileFromBytes(response.fileContent, response.fileName || "mb-head-template.xlsx")
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

// ============================================================================
// Fetch-all-matching (bulk "select all") Hook
// ============================================================================

/**
 * Fetches EVERY MB Head matching a filter, paging through the list endpoint at
 * the proto's maximum `page_size` (100 — `ListMBHeadsRequest.page_size` carries
 * `lte: 100`, so asking for more is a validation error, not a bigger page).
 *
 * Exists because the MB Recipe header checkbox selects all rows matching the
 * current filter across every page, and there is no ids-only/filter-based bulk
 * RPC to do that server-side. Deliberately NOT a useQuery: it runs on demand
 * (a click), not on render, and its result feeds selection state rather than
 * the cache.
 *
 * `page`/`pageSize` on the incoming params are ignored — every other filter
 * (search, activeFilter, sortBy/sortOrder, costProductId) is preserved verbatim
 * so the selection matches exactly what the user is looking at.
 */
const FETCH_ALL_PAGE_SIZE = 100
// Hard stop so a runaway/looping backend can't spin this forever. 200 pages ×
// 100 = 20 000 heads, far above any realistic MB Recipe list.
const FETCH_ALL_MAX_PAGES = 200

export function useFetchAllMBHeads() {
  return useMutation({
    mutationFn: async (params: ListMBHeadsParams = {}): Promise<MBHead[]> => {
      const all: MBHead[] = []
      let page = 1
      let totalPages = 1

      do {
        const queryString = buildQueryString({
          ...params,
          page,
          pageSize: FETCH_ALL_PAGE_SIZE,
        } as Record<string, unknown>)
        const rawResponse = await apiClient.get<unknown>(`/api/v1/finance/mb-heads${queryString}`)
        const response = ListMBHeadsResponseParser.fromJSON(rawResponse)

        if (response.base?.isSuccess === false) {
          throw new Error(response.base.message || "Failed to load MB Heads")
        }

        all.push(...(response.data || []))
        // totalPages is int32 on the wire but totalItems is int64 (a STRING in
        // JSON) — Number() both rather than trusting the parsed type.
        totalPages = Number(response.pagination?.totalPages ?? 1) || 1
        page += 1
      } while (page <= totalPages && page <= FETCH_ALL_MAX_PAGES)

      return all
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to load all MB Heads for selection")
    },
  })
}
