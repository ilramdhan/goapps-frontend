"use client"

// PPC daily-performance hooks — shift entry, area shift log, efficiency
// snapshots/recalc, machine shift logs, shift-log notes (CRUD).

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { createCrudHooks } from "@/lib/hooks"
import { apiClient, buildQueryString } from "@/lib/api"
import type {
  SubmitShiftEntryRequest,
  SubmitAreaShiftLogRequest,
  RecalcEfficiencyRequest,
  ShiftLogNote,
  CreateShiftLogNoteRequest,
  UpdateShiftLogNoteRequest,
  ListMachineShiftLogsParams,
  ListEfficiencySnapshotsParams,
  ListShiftLogNotesParams,
} from "@/types/ppc/daily-performance"
import {
  SubmitShiftEntryResponseParser,
  SubmitAreaShiftLogResponseParser,
  RecalcEfficiencyResponseParser,
  ListMachineShiftLogsResponseParser,
  ListEfficiencySnapshotsResponseParser,
  ListShiftLogNotesResponseParser,
  CreateShiftLogNoteResponseParser,
  UpdateShiftLogNoteResponseParser,
  DeleteShiftLogNoteResponseParser,
  GetShiftLogNoteResponseParser,
} from "@/types/ppc/daily-performance"

const efficiencyKeys = ["ppc", "efficiency-snapshot"] as const
const shiftLogKeys = ["ppc", "machine-shift-log"] as const

export function useMachineShiftLogs(params: ListMachineShiftLogsParams = {}) {
  return useQuery({
    queryKey: [...shiftLogKeys, "list", JSON.stringify(params)],
    queryFn: async () => {
      const qs = buildQueryString(params as Record<string, unknown>)
      const raw = await apiClient.get<unknown>(`/api/v1/ppc/machine-shift-logs${qs}`)
      const res = ListMachineShiftLogsResponseParser.fromJSON(raw)
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
    staleTime: 15_000,
  })
}

export function useEfficiencySnapshots(params: ListEfficiencySnapshotsParams = {}) {
  return useQuery({
    queryKey: [...efficiencyKeys, "list", JSON.stringify(params)],
    queryFn: async () => {
      const qs = buildQueryString(params as Record<string, unknown>)
      const raw = await apiClient.get<unknown>(`/api/v1/ppc/efficiency-snapshots${qs}`)
      const res = ListEfficiencySnapshotsResponseParser.fromJSON(raw)
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
    staleTime: 15_000,
  })
}

export function useSubmitShiftEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (req: SubmitShiftEntryRequest) => {
      const raw = await apiClient.post<unknown>("/api/v1/ppc/shift-entries", req)
      return SubmitShiftEntryResponseParser.fromJSON(raw)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: shiftLogKeys })
      qc.invalidateQueries({ queryKey: efficiencyKeys })
      toast.success("Shift entry submitted")
    },
    onError: (e: Error) => toast.error(e.message || "Failed to submit shift entry"),
  })
}

export function useSubmitAreaShiftLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (req: SubmitAreaShiftLogRequest) => {
      const raw = await apiClient.post<unknown>("/api/v1/ppc/area-shift-logs", req)
      return SubmitAreaShiftLogResponseParser.fromJSON(raw)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: shiftLogKeys })
      toast.success("Area shift log saved")
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save area shift log"),
  })
}

export function useRecalcEfficiency() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (req: RecalcEfficiencyRequest) => {
      const raw = await apiClient.post<unknown>("/api/v1/ppc/efficiency-snapshots/recalc", req)
      return RecalcEfficiencyResponseParser.fromJSON(raw)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: efficiencyKeys })
      toast.success("Efficiency recalculated")
    },
    onError: (e: Error) => toast.error(e.message || "Failed to recalculate efficiency"),
  })
}

// ---- Shift-log notes (CRUD) ------------------------------------------------
export const {
  useList: useShiftLogNotes,
  useGet: useShiftLogNote,
  useCreate: useCreateShiftLogNote,
  useUpdate: useUpdateShiftLogNote,
  useDelete: useDeleteShiftLogNote,
  queryKeys: shiftLogNoteKeys,
} = createCrudHooks<ShiftLogNote, ListShiftLogNotesParams, CreateShiftLogNoteRequest, UpdateShiftLogNoteRequest>({
  serviceScope: "ppc",
  resourceName: "shift-log-note",
  apiBasePath: "/api/v1/ppc/shift-log-notes",
  parsers: {
    listResponse: (d) => ListShiftLogNotesResponseParser.fromJSON(d),
    createResponse: (d) => CreateShiftLogNoteResponseParser.fromJSON(d),
    updateResponse: (d) => UpdateShiftLogNoteResponseParser.fromJSON(d),
    deleteResponse: (d) => DeleteShiftLogNoteResponseParser.fromJSON(d),
    getResponse: (d) => GetShiftLogNoteResponseParser.fromJSON(d),
  },
  getEntityId: (n) => String(n.noteId),
  messages: {
    createSuccess: "Note added",
    updateSuccess: "Note updated",
    deleteSuccess: "Note deleted",
  },
})
