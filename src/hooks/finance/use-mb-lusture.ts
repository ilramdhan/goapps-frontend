"use client"

// MB Lusture Hooks - TanStack Query hooks for MB lusture master CRUD

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  listMbLustures,
  createMbLusture,
  updateMbLusture,
  deleteMbLusture,
} from "@/services/finance/mb-lusture-api"
import { apiClient, buildQueryString, downloadFileFromBytes } from "@/lib/api"
import {
  type ListMbLustureParams,
  type MbLustureFormData,
  type ExportMbLustureParams,
  type ExportMbLustureResponse,
  type ImportMbLustureResponse,
  type DownloadMbLustureTemplateResponse,
  ExportMbLustureResponseParser,
  ImportMbLustureResponseParser,
  DownloadMbLustureTemplateResponseParser,
} from "@/types/finance/mb-lusture"

const mbLustureKeys = {
  all: ["finance", "mb-lusture"] as const,
  lists: () => [...mbLustureKeys.all, "list"] as const,
  list: (params: ListMbLustureParams) => [...mbLustureKeys.lists(), JSON.stringify(params)] as const,
}

export function useMbLustures(params: ListMbLustureParams = {}) {
  return useQuery({
    queryKey: mbLustureKeys.list(params),
    queryFn: () => listMbLustures(params),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

export function useCreateMbLusture() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: MbLustureFormData) => createMbLusture(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mbLustureKeys.lists() })
      toast.success("MB Lusture created successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create MB lusture")
    },
  })
}

export function useUpdateMbLusture() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ mblId, data }: { mblId: string; data: MbLustureFormData }) =>
      updateMbLusture(mblId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mbLustureKeys.lists() })
      toast.success("MB Lusture updated successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update MB lusture")
    },
  })
}

export function useDeleteMbLusture() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (mblId: string) => deleteMbLusture(mblId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mbLustureKeys.lists() })
      toast.success("MB Lusture deleted successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete MB lusture")
    },
  })
}

export function useExportMbLustures() {
  return useMutation({
    mutationFn: async (params: ExportMbLustureParams = {}): Promise<ExportMbLustureResponse> => {
      const queryString = buildQueryString(params as Record<string, unknown>)
      const rawResponse = await apiClient.get<unknown>(`/api/v1/finance/master/mb-lusture/export${queryString}`)
      return ExportMbLustureResponseParser.fromJSON(rawResponse)
    },
    onSuccess: (response) => {
      if (response.base?.isSuccess && response.fileContent.length > 0) {
        downloadFileFromBytes(response.fileContent, response.fileName || "mb-lusture-export.xlsx")
        toast.success("Export completed successfully")
      } else {
        toast.error(response.base?.message || "Failed to export MB lusture")
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to export MB lusture")
    },
  })
}

interface ImportMbLustureData {
  fileContent: Uint8Array
  fileName: string
  duplicateAction: string
}

export function useImportMbLustures() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ImportMbLustureData): Promise<ImportMbLustureResponse> => {
      const rawResponse = await apiClient.post<unknown>("/api/v1/finance/master/mb-lusture/import", {
        fileContent: Array.from(data.fileContent),
        fileName: data.fileName,
        duplicateAction: data.duplicateAction,
      })
      return ImportMbLustureResponseParser.fromJSON(rawResponse)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: mbLustureKeys.lists() })
      if (response.base?.isSuccess) {
        const { successCount, skippedCount, failedCount } = response
        toast.success(
          `Import completed: ${successCount} created, ${skippedCount} skipped, ${failedCount} failed`
        )
      } else {
        toast.error(response.base?.message || "Failed to import MB lusture")
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to import MB lusture")
    },
  })
}

export function useDownloadMbLustureTemplate() {
  return useMutation({
    mutationFn: async (): Promise<DownloadMbLustureTemplateResponse> => {
      const rawResponse = await apiClient.get<unknown>("/api/v1/finance/master/mb-lusture/template")
      return DownloadMbLustureTemplateResponseParser.fromJSON(rawResponse)
    },
    onSuccess: (response) => {
      if (response.base?.isSuccess && response.fileContent.length > 0) {
        downloadFileFromBytes(response.fileContent, response.fileName || "mb-lusture-template.xlsx")
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
