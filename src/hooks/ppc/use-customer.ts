"use client"

// PPC customer hooks — list/get/create/edit plus the Orion sync and the
// Excel export/import/template trio. The master is sync-sourced from Orion
// OM_CUSTOMER; hand-added rows are marked MANUAL and the sync never overwrites
// them, so create/edit are legitimate here (unlike the machine master).

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { apiClient, buildQueryString, downloadFileFromBytes } from "@/lib/api"
import type {
  CreateCustomerRequest,
  UpdateCustomerRequest,
  ListCustomersParams,
  ExportCustomersParams,
} from "@/types/ppc/customer"
import {
  ListCustomersResponseParser,
  GetCustomerResponseParser,
  CreateCustomerResponseParser,
  UpdateCustomerResponseParser,
  SyncCustomersResponseParser,
  ExportCustomersResponseParser,
  ImportCustomersResponseParser,
  DownloadCustomerTemplateResponseParser,
} from "@/types/ppc/customer"

const customerKeys = {
  all: ["ppc", "customer"] as const,
  lists: () => [...customerKeys.all, "list"] as const,
  list: (params: ListCustomersParams) => [...customerKeys.lists(), JSON.stringify(params)] as const,
  detail: (id: number) => [...customerKeys.all, "detail", id] as const,
}

export { customerKeys }

export function useCustomers(params: ListCustomersParams = {}) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: async () => {
      const qs = buildQueryString(params as Record<string, unknown>)
      const raw = await apiClient.get<unknown>(`/api/v1/ppc/customers${qs}`)
      const res = ListCustomersResponseParser.fromJSON(raw)
      return {
        data: res.data || [],
        pagination: {
          currentPage: res.pagination?.currentPage || 1,
          pageSize: res.pagination?.pageSize || 10,
          totalItems: Number(res.pagination?.totalItems ?? 0),
          totalPages: res.pagination?.totalPages || 0,
        },
      }
    },
    staleTime: 30_000,
  })
}

export function useCustomer(id: number) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: async () => {
      const raw = await apiClient.get<unknown>(`/api/v1/ppc/customers/${id}`)
      return GetCustomerResponseParser.fromJSON(raw).data ?? null
    },
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useCreateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateCustomerRequest) => {
      const raw = await apiClient.post<unknown>("/api/v1/ppc/customers", data)
      return CreateCustomerResponseParser.fromJSON(raw)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.lists() })
      toast.success("Customer created")
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create customer"),
  })
}

export function useUpdateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateCustomerRequest }) => {
      const raw = await apiClient.put<unknown>(`/api/v1/ppc/customers/${id}`, data)
      return UpdateCustomerResponseParser.fromJSON(raw)
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: customerKeys.lists() })
      qc.invalidateQueries({ queryKey: customerKeys.detail(id) })
      toast.success("Customer updated")
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update customer"),
  })
}

export function useSyncCustomers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const raw = await apiClient.post<unknown>("/api/v1/ppc/customers/sync", {})
      return SyncCustomersResponseParser.fromJSON(raw)
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: customerKeys.lists() })
      if (!res.sourceUsed) {
        toast.warning("Oracle is not configured — nothing was synced")
        return
      }
      toast.success(
        `Sync complete: ${res.insertedCount} added, ${res.updatedCount} updated, ${res.unchangedCount} unchanged`
      )
    },
    onError: (e: Error) => toast.error(e.message || "Failed to sync customers"),
  })
}

export function useExportCustomers() {
  return useMutation({
    mutationFn: async (params: ExportCustomersParams = {}) => {
      const qs = buildQueryString(params as Record<string, unknown>)
      const raw = await apiClient.get<unknown>(`/api/v1/ppc/customers/export${qs}`)
      return ExportCustomersResponseParser.fromJSON(raw)
    },
    onSuccess: (res) => {
      if (res.base?.isSuccess && res.fileContent.length > 0) {
        downloadFileFromBytes(res.fileContent, res.fileName || "customer_export.xlsx")
        toast.success("Export completed")
        return
      }
      toast.error(res.base?.message || "Failed to export customers")
    },
    onError: (e: Error) => toast.error(e.message || "Failed to export customers"),
  })
}

interface ImportCustomersData {
  fileContent: Uint8Array
  fileName: string
  duplicateAction: string
}

export function useImportCustomers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: ImportCustomersData) => {
      const raw = await apiClient.post<unknown>("/api/v1/ppc/customers/import", {
        fileContent: Array.from(data.fileContent),
        fileName: data.fileName,
        duplicateAction: data.duplicateAction,
      })
      return ImportCustomersResponseParser.fromJSON(raw)
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: customerKeys.lists() })
      if (!res.base?.isSuccess) {
        toast.error(res.base?.message || "Failed to import customers")
        return
      }
      toast.success(
        `Import complete: ${res.successCount} created, ${res.updatedCount} updated, ` +
          `${res.skippedCount} skipped, ${res.failedCount} failed`
      )
    },
    onError: (e: Error) => toast.error(e.message || "Failed to import customers"),
  })
}

export function useDownloadCustomerTemplate() {
  return useMutation({
    mutationFn: async () => {
      const raw = await apiClient.get<unknown>("/api/v1/ppc/customers/template")
      return DownloadCustomerTemplateResponseParser.fromJSON(raw)
    },
    onSuccess: (res) => {
      if (res.base?.isSuccess && res.fileContent.length > 0) {
        downloadFileFromBytes(res.fileContent, res.fileName || "customer_import_template.xlsx")
        toast.success("Template downloaded")
        return
      }
      toast.error(res.base?.message || "Failed to download template")
    },
    onError: (e: Error) => toast.error(e.message || "Failed to download template"),
  })
}
