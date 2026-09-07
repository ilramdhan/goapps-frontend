"use client"

// RM Group Hooks - TanStack Query hooks for RM Group operations
// GetRMGroupResponse.data is RMGroupHeadWithDetails, not RMGroupHead, so we
// bypass the generic constraint by using explicit hooks for get.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { apiClient, buildQueryString, ApiError, downloadFileFromBytes } from "@/lib/api"

import {
  type CreateRMGroupRequest,
  type UpdateRMGroupRequest,
  type ListRMGroupsParams,
  type ExportRMGroupsParams,
  type ExportRMGroupsResponse,
  type ImportRMGroupsResponse,
  type DownloadRMGroupTemplateResponse,
  ListRMGroupsResponseParser,
  CreateRMGroupResponseParser,
  UpdateRMGroupResponseParser,
  DeleteRMGroupResponseParser,
  GetRMGroupResponseParser,
  ExportRMGroupsResponseParser,
  ImportRMGroupsResponseParser,
  DownloadRMGroupTemplateResponseParser,
} from "@/types/finance/rm-group"

// Query keys
export const rmGroupKeys = {
  all: ["finance", "rm-group"] as const,
  lists: () => [...rmGroupKeys.all, "list"] as const,
  list: (params: ListRMGroupsParams) => [...rmGroupKeys.lists(), JSON.stringify(params)] as const,
  details: () => [...rmGroupKeys.all, "detail"] as const,
  detail: (id: string) => [...rmGroupKeys.details(), id] as const,
}

// --- List hook ---
export function useRMGroups(params: ListRMGroupsParams = {}) {
  return useQuery({
    queryKey: rmGroupKeys.list(params),
    queryFn: async () => {
      const qs = buildQueryString(params as Record<string, unknown>)
      const raw = await apiClient.get<unknown>(`/api/v1/finance/rm-groups${qs}`)

      // The raw response from BFF is already a plain JSON object
      // fromJSON handles both camelCase and snake_case field names
      const response = ListRMGroupsResponseParser.fromJSON(raw)

      return {
        data: response.data || [],
        pagination: response.pagination
          ? {
              currentPage: response.pagination.currentPage || 1,
              pageSize: response.pagination.pageSize || 10,
              totalItems: Number(response.pagination.totalItems) || 0,
              totalPages: response.pagination.totalPages || 0,
            }
          : undefined,
      }
    },
    staleTime: 0,
    gcTime: 5 * 60_000,
    refetchOnMount: "always",
  })
}

// --- Get hook (returns RMGroupHeadWithDetails) ---
export function useRMGroup(id: string) {
  return useQuery({
    queryKey: rmGroupKeys.detail(id),
    queryFn: async () => {
      const raw = await apiClient.get<unknown>(`/api/v1/finance/rm-groups/${id}`)
      const response = GetRMGroupResponseParser.fromJSON(raw)
      if (response.base && response.base.isSuccess === false) {
        throw new Error(response.base.message || "Failed to load RM group")
      }
      const withDetails = response.data
      const head = withDetails?.head
      return {
        data: head
          ? { ...head, details: withDetails?.details || [] }
          : null,
      }
    },
    enabled: !!id,
    staleTime: 5_000,
    gcTime: 5 * 60_000,
    refetchOnMount: true,
  })
}

// --- Create hook ---
export function useCreateRMGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateRMGroupRequest) => {
      const raw = await apiClient.post<unknown>("/api/v1/finance/rm-groups", data)
      const response = CreateRMGroupResponseParser.fromJSON(raw)
      if (!response.base?.isSuccess) {
        throw new ApiError(
          response.base?.message || "Failed to create RM Group",
          parseInt(response.base?.statusCode || "400", 10),
          response.base?.validationErrors || []
        )
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rmGroupKeys.lists() })
      toast.success("RM Group created successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create RM Group")
    },
  })
}

// --- Update hook ---
export function useUpdateRMGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateRMGroupRequest }) => {
      // `data` (UpdateRMGroupRequest) already carries the required `period`
      // field end-to-end from the proto type — it is forwarded to the BFF
      // route as-is in the PUT body.
      const raw = await apiClient.put<unknown>(`/api/v1/finance/rm-groups/${id}`, data)
      const response = UpdateRMGroupResponseParser.fromJSON(raw)
      if (!response.base?.isSuccess) {
        throw new ApiError(
          response.base?.message || "Failed to update RM Group",
          parseInt(response.base?.statusCode || "400", 10),
          response.base?.validationErrors || []
        )
      }
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: rmGroupKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: rmGroupKeys.lists() })
      toast.success("RM Group updated successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update RM Group")
    },
  })
}

// --- Delete hook ---
export function useDeleteRMGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const raw = await apiClient.delete<unknown>(`/api/v1/finance/rm-groups/${id}`)
      const response = DeleteRMGroupResponseParser.fromJSON(raw)
      if (!response.base?.isSuccess) {
        throw new ApiError(
          response.base?.message || "Failed to delete RM Group",
          parseInt(response.base?.statusCode || "400", 10),
          response.base?.validationErrors || []
        )
      }
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: rmGroupKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: rmGroupKeys.lists() })
      toast.success("RM Group deleted successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete RM Group")
    },
  })
}

// --- Export hook ---
export function useExportRMGroups() {
  return useMutation({
    mutationFn: async (params: ExportRMGroupsParams = {}): Promise<ExportRMGroupsResponse> => {
      const qs = buildQueryString(params as Record<string, unknown>)
      const raw = await apiClient.get<unknown>(`/api/v1/finance/rm-groups/export${qs}`)
      return ExportRMGroupsResponseParser.fromJSON(raw)
    },
    onSuccess: (response) => {
      if (response.base?.isSuccess && response.fileContent.length > 0) {
        downloadFileFromBytes(response.fileContent, response.fileName || "rm-groups-export.xlsx")
        toast.success("Export completed successfully")
      } else {
        toast.error(response.base?.message || "Failed to export RM Groups")
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to export RM Groups")
    },
  })
}

// --- Import hook ---
interface ImportRMGroupData {
  fileContent: Uint8Array
  fileName: string
  duplicateAction: string
}

export function useImportRMGroups() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ImportRMGroupData): Promise<ImportRMGroupsResponse> => {
      const raw = await apiClient.post<unknown>("/api/v1/finance/rm-groups/import", {
        fileContent: Array.from(data.fileContent),
        fileName: data.fileName,
        duplicateAction: data.duplicateAction,
      })
      return ImportRMGroupsResponseParser.fromJSON(raw)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: rmGroupKeys.lists() })
      if (response.base?.isSuccess) {
        const { groupsCreated, groupsUpdated, groupsSkipped, itemsAdded, itemsSkipped, failedCount } = response
        toast.success(
          `Import completed: ${groupsCreated} groups created, ${groupsUpdated} updated, ${groupsSkipped} skipped, ${itemsAdded} items added, ${itemsSkipped} items skipped, ${failedCount} failed`
        )
      } else {
        toast.error(response.base?.message || "Failed to import RM Groups")
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to import RM Groups")
    },
  })
}

// --- Download template hook ---
export function useDownloadRMGroupTemplate() {
  return useMutation({
    mutationFn: async (): Promise<DownloadRMGroupTemplateResponse> => {
      const raw = await apiClient.get<unknown>("/api/v1/finance/rm-groups/template")
      return DownloadRMGroupTemplateResponseParser.fromJSON(raw)
    },
    onSuccess: (response) => {
      if (response.base?.isSuccess && response.fileContent.length > 0) {
        downloadFileFromBytes(response.fileContent, response.fileName || "rm-groups-template.xlsx")
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

// --- Period-scoped config read hook ---
// Source of truth for the Marketing Inputs card / item table's *displayed*
// values once a period is selected — a period-aware sibling to `useRMGroup`
// (which stays anchor/latest-only for identity fields). The BFF route just
// forwards `period` to the same GetRMGroup RPC, so we reuse
// GetRMGroupResponseParser to parse the response.
export const groupPeriodConfigKeys = {
  all: ["finance", "rm-group-period-config"] as const,
  detail: (groupHeadId: string, period: string) =>
    [...groupPeriodConfigKeys.all, groupHeadId, period] as const,
}

export function useGroupPeriodConfig(groupHeadId: string, period: string) {
  return useQuery({
    queryKey: groupPeriodConfigKeys.detail(groupHeadId, period),
    queryFn: async () => {
      const qs = buildQueryString({ period })
      const raw = await apiClient.get<unknown>(`/api/v1/finance/rm-groups/${groupHeadId}${qs}`)
      const response = GetRMGroupResponseParser.fromJSON(raw)
      if (response.base && response.base.isSuccess === false) {
        throw new Error(response.base.message || "Failed to load RM group for period")
      }
      const withDetails = response.data
      const head = withDetails?.head
      return {
        data: head
          ? { ...head, details: withDetails?.details || [] }
          : null,
      }
    },
    enabled: !!groupHeadId && !!period,
    staleTime: 5_000,
    gcTime: 5 * 60_000,
  })
}
