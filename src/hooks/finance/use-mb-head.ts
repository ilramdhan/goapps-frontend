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
  type ListMBHeadsResponse,
  type CreateMBHeadResponse,
  type UpdateMBHeadResponse,
  type DeleteMBHeadResponse,
  type GetMBHeadResponse,
  type ExportMBHeadsResponse,
  type ImportMBHeadsResponse,
  type DownloadMBHeadTemplateResponse,
  ListMBHeadsResponseParser,
  CreateMBHeadResponseParser,
  UpdateMBHeadResponseParser,
  DeleteMBHeadResponseParser,
  GetMBHeadResponseParser,
  ExportMBHeadsResponseParser,
  ImportMBHeadsResponseParser,
  DownloadMBHeadTemplateResponseParser,
} from "@/types/finance/mb-head"
import {
  submitMBHead,
  approveMBHead,
  validateMBHead,
  unApproveMBHead,
  revokeMBHead,
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
