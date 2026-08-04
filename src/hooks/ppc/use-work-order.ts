"use client"

// PPC work-order hooks — CRUD via factory + rich workflow actions
// (submit, sequential PC/PM approval, reject, param resolution, RM alloc,
// execution, production-actual adjust/suggest, references).

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { createCrudHooks } from "@/lib/hooks"
import { apiClient, buildQueryString } from "@/lib/api"
import type {
  WorkOrder,
  CreateWorkOrderRequest,
  UpdateWorkOrderRequest,
  ResolveWOParametersRequest,
  SaveWOParametersRequest,
  SaveWORmAllocationsRequest,
  SaveWOExecutionRequest,
  SubmitWORequest,
  ApproveWOParameterRequest,
  ApproveWORequest,
  RejectWORequest,
  CreateWOReferenceRequest,
  AdjustWOActualRequest,
  SuggestWOActualRequest,
  ListWorkOrdersParams,
} from "@/types/ppc/work-order"
import {
  ListWorkOrdersResponseParser,
  CreateWorkOrderResponseParser,
  UpdateWorkOrderResponseParser,
  DeleteWorkOrderResponseParser,
  GetWorkOrderResponseParser,
  ResolveWOParametersResponseParser,
  SaveWOParametersResponseParser,
  SaveWORmAllocationsResponseParser,
  PopulateWORmFromRouteResponseParser,
  SaveWOExecutionResponseParser,
  ListWOExecutionsResponseParser,
  SubmitWOResponseParser,
  ApproveWOParameterResponseParser,
  ApproveWOResponseParser,
  RejectWOResponseParser,
  CreateWOReferenceResponseParser,
  GetWOProductionActualResponseParser,
  AdjustWOActualResponseParser,
  SuggestWOActualResponseParser,
  ListMergeCandidatesResponseParser,
} from "@/types/ppc/work-order"

export const {
  useList: useWorkOrders,
  useGet: useWorkOrder,
  useCreate: useCreateWorkOrder,
  useUpdate: useUpdateWorkOrder,
  useDelete: useDeleteWorkOrder,
  queryKeys: workOrderKeys,
} = createCrudHooks<WorkOrder, ListWorkOrdersParams, CreateWorkOrderRequest, UpdateWorkOrderRequest>({
  serviceScope: "ppc",
  resourceName: "work-order",
  apiBasePath: "/api/v1/ppc/work-orders",
  parsers: {
    listResponse: (d) => ListWorkOrdersResponseParser.fromJSON(d),
    createResponse: (d) => CreateWorkOrderResponseParser.fromJSON(d),
    updateResponse: (d) => UpdateWorkOrderResponseParser.fromJSON(d),
    deleteResponse: (d) => DeleteWorkOrderResponseParser.fromJSON(d),
    getResponse: (d) => GetWorkOrderResponseParser.fromJSON(d),
  },
  getEntityId: (w) => String(w.woId),
  messages: {
    createSuccess: "Work order created",
    updateSuccess: "Work order updated",
    deleteSuccess: "Work order deleted",
  },
})

function invalidateWO(qc: ReturnType<typeof useQueryClient>, woId?: number) {
  qc.invalidateQueries({ queryKey: workOrderKeys.all })
  if (woId) qc.invalidateQueries({ queryKey: workOrderKeys.detail(String(woId)) })
}

// ---- Parameter resolution (4-layer chain, used in create/param editor) -----
export function useResolveWOParameters() {
  return useMutation({
    mutationFn: async (req: ResolveWOParametersRequest) => {
      const raw = await apiClient.post<unknown>("/api/v1/ppc/work-orders/resolve-parameters", req)
      return ResolveWOParametersResponseParser.fromJSON(raw).data || []
    },
    onError: (e: Error) => toast.error(e.message || "Failed to resolve parameters"),
  })
}

export function useSaveWOParameters() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (req: SaveWOParametersRequest) => {
      const raw = await apiClient.post<unknown>(`/api/v1/ppc/work-orders/${req.woId}/parameters`, req)
      return SaveWOParametersResponseParser.fromJSON(raw)
    },
    onSuccess: (_, req) => {
      invalidateWO(qc, req.woId)
      toast.success("Parameters saved")
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save parameters"),
  })
}

export function useSaveWORmAllocations() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (req: SaveWORmAllocationsRequest) => {
      const raw = await apiClient.post<unknown>(`/api/v1/ppc/work-orders/${req.woId}/rm-allocations`, req)
      return SaveWORmAllocationsResponseParser.fromJSON(raw)
    },
    onSuccess: (_, req) => {
      invalidateWO(qc, req.woId)
      toast.success("RM allocations saved")
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save RM allocations"),
  })
}

/**
 * useSuggestWORmAllocations fetches the RM allocation lines proposed by the
 * WO's released route, with codes/names/stage attribution already resolved by
 * the backend. Read-only — nothing is persisted until the panel saves.
 *
 * `enabled` is caller-controlled so the request is confined to the window where
 * it is useful — the panel asks whenever its editor is open, including on a WO
 * that already has saved lines, because the result is also the RM picker's
 * option source (without it, hand-adding could only offer already-allocated
 * RMs). Not re-prefilling over saved edits is the panel's job, not this hook's:
 * it never seeds from a suggestion once a saved set exists.
 */
export function useSuggestWORmAllocations(woId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["ppc", "work-order", "rm-suggestions", woId],
    queryFn: async () => {
      const raw = await apiClient.post<unknown>(
        `/api/v1/ppc/work-orders/${woId}/rm-allocations/populate-from-route`,
        {}
      )
      return PopulateWORmFromRouteResponseParser.fromJSON(raw).data || []
    },
    enabled: enabled && woId > 0,
    staleTime: 60_000,
  })
}

export function useWOExecutions(woId: number, date?: string, shift?: string) {
  return useQuery({
    queryKey: ["ppc", "work-order", "executions", woId, date ?? "", shift ?? ""],
    queryFn: async () => {
      const qs = buildQueryString({ date, shift } as Record<string, unknown>)
      const raw = await apiClient.get<unknown>(`/api/v1/ppc/work-orders/${woId}/executions${qs}`)
      return ListWOExecutionsResponseParser.fromJSON(raw).data || []
    },
    enabled: !!woId,
    staleTime: 15_000,
  })
}

export function useSaveWOExecution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (req: SaveWOExecutionRequest) => {
      const raw = await apiClient.post<unknown>(`/api/v1/ppc/work-orders/${req.woId}/executions`, req)
      return SaveWOExecutionResponseParser.fromJSON(raw)
    },
    onSuccess: (_, req) => {
      invalidateWO(qc, req.woId)
      qc.invalidateQueries({ queryKey: ["ppc", "work-order", "executions", req.woId] })
      toast.success("Execution saved")
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save execution"),
  })
}

// ---- Approval workflow -----------------------------------------------------
export function useSubmitWO() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (req: SubmitWORequest) => {
      const raw = await apiClient.post<unknown>(`/api/v1/ppc/work-orders/${req.woId}/submit`, req)
      return SubmitWOResponseParser.fromJSON(raw)
    },
    onSuccess: (_, req) => {
      invalidateWO(qc, req.woId)
      toast.success("Work order submitted")
    },
    onError: (e: Error) => toast.error(e.message || "Failed to submit work order"),
  })
}

export function useApproveWOParameter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (req: ApproveWOParameterRequest) => {
      const raw = await apiClient.post<unknown>(`/api/v1/ppc/work-orders/${req.woId}/approve-parameter`, req)
      return ApproveWOParameterResponseParser.fromJSON(raw)
    },
    onSuccess: (_, req) => {
      invalidateWO(qc, req.woId)
      toast.success("PC parameters approved")
    },
    onError: (e: Error) => toast.error(e.message || "Failed to approve parameters"),
  })
}

export function useApproveWO() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (req: ApproveWORequest) => {
      const raw = await apiClient.post<unknown>(`/api/v1/ppc/work-orders/${req.woId}/approve`, req)
      return ApproveWOResponseParser.fromJSON(raw)
    },
    onSuccess: (_, req) => {
      invalidateWO(qc, req.woId)
      toast.success("Work order approved")
    },
    onError: (e: Error) => toast.error(e.message || "Failed to approve work order"),
  })
}

export function useRejectWO() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (req: RejectWORequest) => {
      const raw = await apiClient.post<unknown>(`/api/v1/ppc/work-orders/${req.woId}/reject`, req)
      return RejectWOResponseParser.fromJSON(raw)
    },
    onSuccess: (_, req) => {
      invalidateWO(qc, req.woId)
      toast.success("Work order rejected")
    },
    onError: (e: Error) => toast.error(e.message || "Failed to reject work order"),
  })
}

export function useCreateWOReference() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (req: CreateWOReferenceRequest) => {
      const raw = await apiClient.post<unknown>("/api/v1/ppc/work-orders/reference", req)
      return CreateWOReferenceResponseParser.fromJSON(raw)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workOrderKeys.all })
      toast.success("Reference work order created")
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create reference"),
  })
}

// ---- Production actuals (two-axis) -----------------------------------------
export function useWOProductionActual(woId: number) {
  return useQuery({
    queryKey: ["ppc", "work-order", "production-actual", woId],
    queryFn: async () => {
      const raw = await apiClient.get<unknown>(`/api/v1/ppc/work-orders/${woId}/production-actual`)
      return GetWOProductionActualResponseParser.fromJSON(raw).data || []
    },
    enabled: !!woId,
    staleTime: 15_000,
  })
}

export function useAdjustWOActual() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (req: AdjustWOActualRequest) => {
      const raw = await apiClient.post<unknown>(`/api/v1/ppc/work-orders/${req.woId}/adjust-actual`, req)
      return AdjustWOActualResponseParser.fromJSON(raw)
    },
    onSuccess: (_, req) => {
      qc.invalidateQueries({ queryKey: ["ppc", "work-order", "production-actual", req.woId] })
      invalidateWO(qc, req.woId)
      toast.success("Actual adjusted")
    },
    onError: (e: Error) => toast.error(e.message || "Failed to adjust actual"),
  })
}

export function useSuggestWOActual() {
  return useMutation({
    mutationFn: async (req: SuggestWOActualRequest) => {
      const raw = await apiClient.post<unknown>(`/api/v1/ppc/work-orders/${req.woId}/suggest-actual`, req)
      return SuggestWOActualResponseParser.fromJSON(raw)
    },
    onError: (e: Error) => toast.error(e.message || "Failed to get suggestion"),
  })
}

// ---- Merge candidates (WO merge) -------------------------------------------
/**
 * Plan items that may join one work order with the anchor: same product and
 * machine group, compatible shade, deadline within the window, and not already
 * covered by another work order. Merging is always an explicit planner action,
 * so this only ever lists options — it never merges anything.
 */
export function useMergeCandidates(anchorPlanItemId?: number, windowDays?: number) {
  return useQuery({
    queryKey: ["ppc", "work-order", "merge-candidates", anchorPlanItemId ?? 0, windowDays ?? 0],
    queryFn: async () => {
      const qs = buildQueryString({ anchorPlanItemId, windowDays } as Record<string, unknown>)
      const raw = await apiClient.get<unknown>(`/api/v1/ppc/work-orders/merge-candidates${qs}`)
      return ListMergeCandidatesResponseParser.fromJSON(raw).data || []
    },
    enabled: !!anchorPlanItemId,
    staleTime: 15_000,
  })
}
