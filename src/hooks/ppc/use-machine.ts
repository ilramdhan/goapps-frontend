"use client"

// PPC machine hooks — read + local-edit only (machine master is sync-sourced
// from finance mst_machine + Oracle TXTMACH). No create/delete on the client.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { apiClient, buildQueryString } from "@/lib/api"
import type { UpdateMachineRequest, ListMachinesParams } from "@/types/ppc/master"
import {
  ListMachinesResponseParser,
  GetMachineResponseParser,
  UpdateMachineResponseParser,
  SyncMachinesResponseParser,
} from "@/types/ppc/master"

const machineKeys = {
  all: ["ppc", "machine"] as const,
  lists: () => [...machineKeys.all, "list"] as const,
  list: (params: ListMachinesParams) => [...machineKeys.lists(), JSON.stringify(params)] as const,
  detail: (id: number) => [...machineKeys.all, "detail", id] as const,
}

export { machineKeys }

export function useMachines(params: ListMachinesParams = {}) {
  return useQuery({
    queryKey: machineKeys.list(params),
    queryFn: async () => {
      const qs = buildQueryString(params as Record<string, unknown>)
      const raw = await apiClient.get<unknown>(`/api/v1/ppc/machines${qs}`)
      const res = ListMachinesResponseParser.fromJSON(raw)
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

export function useMachine(id: number) {
  return useQuery({
    queryKey: machineKeys.detail(id),
    queryFn: async () => {
      const raw = await apiClient.get<unknown>(`/api/v1/ppc/machines/${id}`)
      return GetMachineResponseParser.fromJSON(raw).data ?? null
    },
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useUpdateMachine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateMachineRequest }) => {
      const raw = await apiClient.put<unknown>(`/api/v1/ppc/machines/${id}`, data)
      return UpdateMachineResponseParser.fromJSON(raw)
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: machineKeys.lists() })
      qc.invalidateQueries({ queryKey: machineKeys.detail(id) })
      toast.success("Machine updated")
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update machine"),
  })
}

export function useSyncMachines() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const raw = await apiClient.post<unknown>("/api/v1/ppc/machines/sync", {})
      return SyncMachinesResponseParser.fromJSON(raw)
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: machineKeys.lists() })
      toast.success(res.base?.message || "Machine sync triggered")
    },
    onError: (e: Error) => toast.error(e.message || "Failed to sync machines"),
  })
}
