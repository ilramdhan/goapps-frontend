"use client"

// MB Param Hooks - TanStack Query hooks for MB param master CRUD + picklist options

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  listMbParams,
  createMbParam,
  updateMbParam,
  deleteMbParam,
  createMbParamOption,
  updateMbParamOption,
  deleteMbParamOption,
} from "@/services/finance/mb-param-api"
import { apiClient, buildQueryString, downloadFileFromBytes } from "@/lib/api"
import {
  type ListMbParamsParams,
  type MbParamFormData,
  type MbParamOptionFormData,
  type ExportMbParamParams,
  type ExportMbParamsResponse,
  type ImportMbParamsResponse,
  type DownloadMbParamTemplateResponse,
  ExportMbParamsResponseParser,
  ImportMbParamsResponseParser,
  DownloadMbParamTemplateResponseParser,
} from "@/types/finance/mb-param"

const mbParamKeys = {
  all: ["finance", "mb-param"] as const,
  lists: () => [...mbParamKeys.all, "list"] as const,
  list: (params: ListMbParamsParams) => [...mbParamKeys.lists(), JSON.stringify(params)] as const,
}

export function useMbParams(params: ListMbParamsParams = {}) {
  return useQuery({
    queryKey: mbParamKeys.list(params),
    queryFn: () => listMbParams(params),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

/** A single picklist option reduced to what a `<Select>` needs. */
export interface MbParamOptionChoice {
  /** Option code stored on the entity, e.g. "S" / "D" / "T". */
  code: string
  /** Human label — option description when present, otherwise the code itself. */
  name: string
  /** Numeric value the option maps to, e.g. "1.000000". */
  numericValue: string
}

/**
 * Picklist options for one MB parameter, sourced live from `mst_mb_param_option`.
 * Nothing is hardcoded — adding an option in the master surfaces it here with no code change.
 *
 * Reuses `useMbParams` (which eager-loads `options`) so it shares the existing
 * `["finance","mb-param","list",…]` cache entry instead of opening a second request path.
 *
 * Inactive options are filtered out, matching the backend's active-only membership check.
 */
export function useMbParamOptions(paramCode: string) {
  const { data, isLoading, isError } = useMbParams({ pageSize: 100 })

  const param = data?.items.find((p) => p.code === paramCode)
  const options: MbParamOptionChoice[] = (param?.options ?? [])
    .filter((o) => o.isActive)
    .map((o) => ({
      code: o.code,
      name: o.description || o.code,
      numericValue: o.numericValue,
    }))

  return { options, unit: param?.unit ?? "", isLoading, isError }
}

export function useCreateMbParam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: MbParamFormData) => createMbParam(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mbParamKeys.lists() })
      toast.success("MB Param created successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create MB param")
    },
  })
}

export function useUpdateMbParam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ mbpId, data }: { mbpId: string; data: MbParamFormData }) =>
      updateMbParam(mbpId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mbParamKeys.lists() })
      toast.success("MB Param updated successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update MB param")
    },
  })
}

export function useDeleteMbParam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (mbpId: string) => deleteMbParam(mbpId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mbParamKeys.lists() })
      toast.success("MB Param deleted successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete MB param")
    },
  })
}

export function useCreateMbParamOption() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ mbpId, data }: { mbpId: string; data: MbParamOptionFormData }) =>
      createMbParamOption(mbpId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mbParamKeys.lists() })
      toast.success("Param option created successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create param option")
    },
  })
}

export function useUpdateMbParamOption() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      mbpId,
      mbpoId,
      data,
    }: {
      mbpId: string
      mbpoId: string
      data: Omit<MbParamOptionFormData, "mbpCode" | "code">
    }) => updateMbParamOption(mbpId, mbpoId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mbParamKeys.lists() })
      toast.success("Param option updated successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update param option")
    },
  })
}

export function useDeleteMbParamOption() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ mbpId, mbpoId }: { mbpId: string; mbpoId: string }) =>
      deleteMbParamOption(mbpId, mbpoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mbParamKeys.lists() })
      toast.success("Param option deleted successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete param option")
    },
  })
}

export function useExportMbParams() {
  return useMutation({
    mutationFn: async (params: ExportMbParamParams = {}): Promise<ExportMbParamsResponse> => {
      const queryString = buildQueryString(params as Record<string, unknown>)
      const rawResponse = await apiClient.get<unknown>(`/api/v1/finance/master/mb-param/export${queryString}`)
      return ExportMbParamsResponseParser.fromJSON(rawResponse)
    },
    onSuccess: (response) => {
      if (response.base?.isSuccess && response.fileContent.length > 0) {
        downloadFileFromBytes(response.fileContent, response.fileName || "mb-param-export.xlsx")
        toast.success("Export completed successfully")
      } else {
        toast.error(response.base?.message || "Failed to export MB param")
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to export MB param")
    },
  })
}

interface ImportMbParamData {
  fileContent: Uint8Array
  fileName: string
  duplicateAction: string
}

export function useImportMbParams() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ImportMbParamData): Promise<ImportMbParamsResponse> => {
      const rawResponse = await apiClient.post<unknown>("/api/v1/finance/master/mb-param/import", {
        fileContent: Array.from(data.fileContent),
        fileName: data.fileName,
        duplicateAction: data.duplicateAction,
      })
      return ImportMbParamsResponseParser.fromJSON(rawResponse)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: mbParamKeys.lists() })
      if (response.base?.isSuccess) {
        const { successCount, skippedCount, failedCount } = response
        toast.success(
          `Import completed: ${successCount} created, ${skippedCount} skipped, ${failedCount} failed`
        )
      } else {
        toast.error(response.base?.message || "Failed to import MB param")
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to import MB param")
    },
  })
}

export function useDownloadMbParamTemplate() {
  return useMutation({
    mutationFn: async (): Promise<DownloadMbParamTemplateResponse> => {
      const rawResponse = await apiClient.get<unknown>("/api/v1/finance/master/mb-param/template")
      return DownloadMbParamTemplateResponseParser.fromJSON(rawResponse)
    },
    onSuccess: (response) => {
      if (response.base?.isSuccess && response.fileContent.length > 0) {
        downloadFileFromBytes(response.fileContent, response.fileName || "mb-param-template.xlsx")
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
