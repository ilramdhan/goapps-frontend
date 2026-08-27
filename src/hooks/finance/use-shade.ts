"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { createCrudHooks } from "@/lib/hooks"
import { apiClient } from "@/lib/api"
import type {
  Shade,
  ListShadesParams,
  CreateShadeRequest,
  UpdateShadeRequest,
} from "@/types/finance/shade"
import {
  ListShadesResponseParser,
  CreateShadeResponseParser,
  UpdateShadeResponseParser,
  DeactivateShadeResponseParser,
  GetShadeResponseParser,
  SyncShadesResponseParser,
} from "@/types/finance/shade"

function buildShadeQueryString(params: ListShadesParams): string {
  const qs = new URLSearchParams()
  if (params.page) qs.set("page", String(params.page))
  if (params.pageSize) qs.set("pageSize", String(params.pageSize))
  if (params.search) qs.set("search", params.search)
  if (params.activeFilter) qs.set("activeFilter", String(params.activeFilter))
  if (params.sourceFilter) qs.set("sourceFilter", params.sourceFilter)
  if (params.sortBy) qs.set("sortBy", params.sortBy)
  if (params.sortOrder) qs.set("sortOrder", params.sortOrder)
  const s = qs.toString()
  return s ? `?${s}` : ""
}

const {
  useList: useShades,
  useGet: useShade,
  useCreate: useCreateShade,
  useUpdate: useUpdateShade,
  useDelete: useDeactivateShade,
  queryKeys: shadeKeys,
} = createCrudHooks<Shade, ListShadesParams, CreateShadeRequest, UpdateShadeRequest>({
  serviceScope: "finance",
  resourceName: "Shade",
  apiBasePath: "/api/v1/finance/shades",
  parsers: {
    listResponse: (data) => ListShadesResponseParser.fromJSON(data),
    createResponse: (data) => CreateShadeResponseParser.fromJSON(data),
    updateResponse: (data) => UpdateShadeResponseParser.fromJSON(data),
    deleteResponse: (data) => DeactivateShadeResponseParser.fromJSON(data),
    getResponse: (data) => GetShadeResponseParser.fromJSON(data),
  },
  messages: {
    createSuccess: "Shade created successfully",
    createError: "Failed to create shade",
    updateSuccess: "Shade updated successfully",
    updateError: "Failed to update shade",
    deleteSuccess: "Shade deactivated successfully",
    deleteError: "Failed to deactivate shade",
    fetchError: "Failed to fetch shades",
  },
  getEntityId: (shade) => String(shade.shadeId),
  buildQueryString: buildShadeQueryString,
})

export { useShades, useShade, useCreateShade, useUpdateShade, useDeactivateShade, shadeKeys }

/**
 * useSyncShades triggers an Oracle-to-Postgres shade master sync (SyncShades RPC).
 * Rows a finance user created/edited by hand (shadeSource === "MANUAL") are never
 * overwritten by the backend — sync only inserts new codes and refreshes ORACLE rows,
 * so re-running it never duplicates data already saved in Postgres.
 */
export function useSyncShades() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const raw = await apiClient.post<unknown>("/api/v1/finance/shades/sync", {})
      return SyncShadesResponseParser.fromJSON(raw)
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: shadeKeys.lists() })
      toast.success(
        `Sync complete: ${res.inserted} added, ${res.updated} updated, ${res.skipped} skipped (of ${res.totalRows} rows from Oracle)`
      )
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to sync shades")
    },
  })
}
