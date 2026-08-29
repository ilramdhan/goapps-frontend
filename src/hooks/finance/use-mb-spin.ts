"use client"

// MBSpin Hooks - TanStack Query hooks for MBSpin operations

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { createCrudHooks } from "@/lib/hooks"
import { apiClient, buildQueryString, downloadFileFromBytes } from "@/lib/api"
import {
  type MBSpin,
  type CreateMBSpinRequest,
  type UpdateMBSpinRequest,
  type ListMBSpinsParams,
  type ExportMBSpinsParams,
  type ListMBSpinsResponse,
  type CreateMBSpinResponse,
  type UpdateMBSpinResponse,
  type DeleteMBSpinResponse,
  type GetMBSpinResponse,
  type ExportMBSpinsResponse,
  type ImportMBSpinsResponse,
  type DownloadMBSpinTemplateResponse,
  ListMBSpinsResponseParser,
  CreateMBSpinResponseParser,
  UpdateMBSpinResponseParser,
  DeleteMBSpinResponseParser,
  GetMBSpinResponseParser,
  ExportMBSpinsResponseParser,
  ImportMBSpinsResponseParser,
  DownloadMBSpinTemplateResponseParser,
} from "@/types/finance/mb-spin"
import { duplicateMBSpin, type DuplicateMBSpinInput } from "@/services/finance/mb-spin-api"

// ============================================================================
// Create CRUD hooks using factory
// ============================================================================

const {
  useList: useMBSpins,
  useGet: useMBSpin,
  useCreate: useCreateMBSpin,
  useUpdate: useUpdateMBSpin,
  useDelete: useDeleteMBSpin,
  queryKeys: mbSpinKeys,
} = createCrudHooks<
  MBSpin,
  ListMBSpinsParams,
  CreateMBSpinRequest,
  UpdateMBSpinRequest,
  ListMBSpinsResponse,
  CreateMBSpinResponse,
  UpdateMBSpinResponse,
  DeleteMBSpinResponse,
  GetMBSpinResponse
>({
  serviceScope: "finance",
  resourceName: "mb-spin",
  apiBasePath: "/api/v1/finance/mb-spins",
  parsers: {
    listResponse: (data) => ListMBSpinsResponseParser.fromJSON(data),
    createResponse: (data) => CreateMBSpinResponseParser.fromJSON(data),
    updateResponse: (data) => UpdateMBSpinResponseParser.fromJSON(data),
    deleteResponse: (data) => DeleteMBSpinResponseParser.fromJSON(data),
    getResponse: (data) => GetMBSpinResponseParser.fromJSON(data),
  },
  getEntityId: (mbSpin) => String(mbSpin.mbsId),
  messages: {
    createSuccess: "MB Spin created successfully",
    updateSuccess: "MB Spin updated successfully",
    deleteSuccess: "MB Spin deleted successfully",
  },
})

// Export CRUD hooks
export {
  useMBSpins,
  useMBSpin,
  useCreateMBSpin,
  useUpdateMBSpin,
  useDeleteMBSpin,
  mbSpinKeys,
}

// ============================================================================
// Export Hook
// ============================================================================

export function useExportMBSpins() {
  return useMutation({
    mutationFn: async (params: ExportMBSpinsParams = {}): Promise<ExportMBSpinsResponse> => {
      const queryString = buildQueryString(params as Record<string, unknown>)
      const rawResponse = await apiClient.get<unknown>(`/api/v1/finance/mb-spins/export${queryString}`)
      return ExportMBSpinsResponseParser.fromJSON(rawResponse)
    },
    onSuccess: (response) => {
      if (response.base?.isSuccess && response.fileContent.length > 0) {
        downloadFileFromBytes(response.fileContent, response.fileName || "mb-spins-export.xlsx")
        toast.success("Export completed successfully")
      } else {
        toast.error(response.base?.message || "Failed to export MB Spins")
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to export MB Spins")
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

export function useImportMBSpins() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ImportData): Promise<ImportMBSpinsResponse> => {
      const rawResponse = await apiClient.post<unknown>("/api/v1/finance/mb-spins/import", {
        fileContent: Array.from(data.fileContent),
        fileName: data.fileName,
        duplicateAction: data.duplicateAction,
      })
      return ImportMBSpinsResponseParser.fromJSON(rawResponse)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: mbSpinKeys.lists() })
      if (response.base?.isSuccess) {
        const { successCount, skippedCount, failedCount } = response
        toast.success(
          `Import completed: ${successCount} created, ${skippedCount} skipped, ${failedCount} failed`
        )
      } else {
        toast.error(response.base?.message || "Failed to import MB Spins")
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to import MB Spins")
    },
  })
}

// ============================================================================
// Duplicate Hook (P8)
// ============================================================================

// Clones one MB Spin into a fresh "R and D" (draft) child (RPC DuplicateMBSpin).
// Requires permission finance.yarnmaster.mbspin.create — same permission the
// backend already gates the RPC behind, since this produces a brand-new record.
// Invalidates the list so the new draft shows up without a manual refresh.
export function useDuplicateMBSpin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: DuplicateMBSpinInput) => duplicateMBSpin(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mbSpinKeys.lists() })
      toast.success("MB Spin duplicated successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to duplicate MB Spin")
    },
  })
}

// ============================================================================
// Download Template Hook
// ============================================================================

export function useDownloadMBSpinTemplate() {
  return useMutation({
    mutationFn: async (): Promise<DownloadMBSpinTemplateResponse> => {
      const rawResponse = await apiClient.get<unknown>("/api/v1/finance/mb-spins/template")
      return DownloadMBSpinTemplateResponseParser.fromJSON(rawResponse)
    },
    onSuccess: (response) => {
      if (response.base?.isSuccess && response.fileContent.length > 0) {
        downloadFileFromBytes(response.fileContent, response.fileName || "mb-spin-template.xlsx")
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
