"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { createCrudHooks } from "@/lib/hooks"
import { apiClient } from "@/lib/api"
import {
  type SuperbaCostSp,
  type ListSuperbaCostSpsParams,
  type CreateSuperbaCostSpRequest,
  type UpdateSuperbaCostSpRequest,
  ListSuperbaCostSpsResponseParser,
  CreateSuperbaCostSpResponseParser,
  UpdateSuperbaCostSpResponseParser,
  DeleteSuperbaCostSpResponseParser,
  GetSuperbaCostSpResponseParser,
  parseSyncOutcome,
  normalizeSuperbaCostSpList,
} from "@/types/finance/superba-cost-sp"

function buildQueryString(params: ListSuperbaCostSpsParams): string {
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
  useList: useSuperbaCostSps,
  useGet: useSuperbaCostSp,
  useCreate: useCreateSuperbaCostSp,
  useUpdate: useUpdateSuperbaCostSp,
  useDelete: useDeleteSuperbaCostSp,
  queryKeys: superbaCostSpKeys,
} = createCrudHooks<SuperbaCostSp, ListSuperbaCostSpsParams, CreateSuperbaCostSpRequest, UpdateSuperbaCostSpRequest>({
  serviceScope: "finance",
  resourceName: "SuperbaCostSp",
  apiBasePath: "/api/v1/finance/superba-cost-sps",
  parsers: {
    listResponse: (data) => ListSuperbaCostSpsResponseParser.fromJSON(data),
    createResponse: (data) => CreateSuperbaCostSpResponseParser.fromJSON(data),
    updateResponse: (data) => UpdateSuperbaCostSpResponseParser.fromJSON(data),
    deleteResponse: (data) => DeleteSuperbaCostSpResponseParser.fromJSON(data),
    getResponse: (data) => GetSuperbaCostSpResponseParser.fromJSON(data),
  },
  messages: {
    createSuccess: "Superba Cost SP created successfully",
    createError: "Failed to create Superba Cost SP",
    updateSuccess: "Superba Cost SP updated successfully",
    updateError: "Failed to update Superba Cost SP",
    deleteSuccess: "Superba Cost SP deleted successfully",
    deleteError: "Failed to delete Superba Cost SP",
    fetchError: "Failed to fetch Superba Cost SPs",
  },
  getEntityId: (row) => row.id,
  buildQueryString,
})

export {
  useSuperbaCostSps,
  useSuperbaCostSp,
  useCreateSuperbaCostSp,
  useUpdateSuperbaCostSp,
  useDeleteSuperbaCostSp,
  superbaCostSpKeys,
}

/**
 * useSyncSuperbaCostSps triggers the legacy-to-Postgres sync. The backend
 * answers "not configured" until the legacy source is known; that is surfaced
 * as an informational toast (never an error/crash). A real sync overwrites
 * manually edited rows (source becomes ORACLE).
 */
export function useSyncSuperbaCostSps() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const raw = await apiClient.post<unknown>("/api/v1/finance/superba-cost-sps/sync", {})
      return parseSyncOutcome(raw)
    },
    onSuccess: (outcome) => {
      if (outcome.kind === "not_configured") {
        toast.info(outcome.message || "Superba Cost SP sync is not configured yet")
        return
      }
      queryClient.invalidateQueries({ queryKey: superbaCostSpKeys.lists() })
      const r = outcome.result
      toast.success(
        `Sync complete: ${r.inserted} added, ${r.updated} updated, ${r.unchanged} unchanged, ${r.skipped} skipped (of ${r.totalRows} rows)`
      )
    },
    onError: (error: Error) => {
      // The BFF maps backend FAILED_PRECONDITION/UNIMPLEMENTED to a 4xx/5xx whose
      // message says "not configured"; ApiError carries that message here.
      if (/not\s+configured/i.test(error.message)) {
        toast.info(error.message)
        return
      }
      toast.error(error.message || "Failed to sync Superba Cost SPs")
    },
  })
}

/**
 * useSuperbaLastSync reads lastSyncedAt (carried on the list response, which
 * the CRUD factory does not expose). Keyed under lists() so every create /
 * update / delete / sync invalidation refreshes it.
 */
export function useSuperbaLastSync() {
  return useQuery({
    queryKey: [...superbaCostSpKeys.lists(), "last-sync"] as const,
    queryFn: async () => {
      const raw = await apiClient.get<unknown>("/api/v1/finance/superba-cost-sps?page=1&pageSize=1")
      return normalizeSuperbaCostSpList(raw).lastSyncedAt
    },
    staleTime: 30 * 1000,
  })
}
