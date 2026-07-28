"use client"

// PPC demand hooks — CRUD via factory + bespoke workflow actions
// (confirm, pull-from-orion, carry-forward, MTS approval).

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { createCrudHooks } from "@/lib/hooks"
import { apiClient } from "@/lib/api"
import type {
  Demand,
  CreateDemandRequest,
  UpdateDemandRequest,
  PullFromOrionRequest,
  ProcessCarryForwardRequest,
  ApproveMTSDemandRequest,
  MapDemandProductRequest,
} from "@/types/ppc/demand"
import type { ListDemandsParams } from "@/types/ppc/demand"
import {
  ListDemandsResponseParser,
  CreateDemandResponseParser,
  UpdateDemandResponseParser,
  DeleteDemandResponseParser,
  GetDemandResponseParser,
  ConfirmDemandResponseParser,
  PullFromOrionResponseParser,
  ListCarryForwardCandidatesResponseParser,
  ProcessCarryForwardResponseParser,
  ApproveMTSDemandResponseParser,
  MapDemandProductResponseParser,
  SetStagingProductResponseParser,
} from "@/types/ppc/demand"

export const {
  useList: useDemands,
  useGet: useDemand,
  useCreate: useCreateDemand,
  useUpdate: useUpdateDemand,
  useDelete: useDeleteDemand,
  queryKeys: demandKeys,
} = createCrudHooks<Demand, ListDemandsParams, CreateDemandRequest, UpdateDemandRequest>({
  serviceScope: "ppc",
  resourceName: "demand",
  apiBasePath: "/api/v1/ppc/demands",
  parsers: {
    listResponse: (d) => ListDemandsResponseParser.fromJSON(d),
    createResponse: (d) => CreateDemandResponseParser.fromJSON(d),
    updateResponse: (d) => UpdateDemandResponseParser.fromJSON(d),
    deleteResponse: (d) => DeleteDemandResponseParser.fromJSON(d),
    getResponse: (d) => GetDemandResponseParser.fromJSON(d),
  },
  getEntityId: (d) => String(d.demandId),
  messages: {
    createSuccess: "Demand created",
    updateSuccess: "Demand updated",
    deleteSuccess: "Demand deleted",
  },
})

/**
 * assertOk throws when a PPC gRPC call reported a domain failure.
 *
 * The PPC BFF proxies the gRPC response verbatim with HTTP 200, and the backend
 * maps every domain error to `base.isSuccess = false` rather than a gRPC status
 * (see `domainErrorToBaseResponse` in the PPC delivery layer). `apiClient` only
 * throws on a non-OK HTTP status, so without this check a rejected confirm or a
 * rejected product map resolves as success and toasts as one.
 */
function assertOk(base: { isSuccess: boolean; message: string } | undefined, fallback: string): void {
  if (base && !base.isSuccess) {
    throw new Error(base.message || fallback)
  }
}

async function confirmDemandRequest(demandId: number) {
  const raw = await apiClient.post<unknown>(`/api/v1/ppc/demands/${demandId}/confirm`, {})
  const res = ConfirmDemandResponseParser.fromJSON(raw)
  assertOk(res.base, "Failed to confirm demand")
  return res
}

async function mapDemandProductRequest(req: MapDemandProductRequest) {
  const raw = await apiClient.post<unknown>(`/api/v1/ppc/demands/${req.demandId}/map-product`, req)
  const res = MapDemandProductResponseParser.fromJSON(raw)
  assertOk(res.base, "Failed to map product")
  return res
}

async function updateDemandRequest(req: UpdateDemandRequest) {
  const raw = await apiClient.put<unknown>(`/api/v1/ppc/demands/${req.demandId}`, req)
  const res = UpdateDemandResponseParser.fromJSON(raw)
  assertOk(res.base, "Failed to update demand")
  return res
}

export function useConfirmDemand() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: confirmDemandRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: demandKeys.all })
      toast.success("Demand confirmed")
    },
    onError: (e: Error) => toast.error(e.message || "Failed to confirm demand"),
  })
}

/** Fills the confirm pre-check dialog may apply before confirming. */
export interface ConfirmDemandFills {
  demandId: number
  /** Set only when the demand has no product linked yet. */
  cpmProductSysId?: number
  /** Field updates to apply before confirming; omitted when nothing changed. */
  update?: Omit<UpdateDemandRequest, "demandId">
}

/**
 * useConfirmDemandWithFills applies a planner's pre-confirm fills and then
 * confirms, composing the existing MapDemandProduct / UpdateDemand / ConfirmDemand
 * RPCs — there is no single "confirm with fills" RPC.
 *
 * Order is load-bearing and not interchangeable:
 *   1. map product — an unlinked demand sits in PENDING_PRODUCT_LINK, whose only
 *      legal transition is to PENDING_CONFIRMATION. Confirming first is rejected.
 *   2. update — grade / clause percentages must be valid before the demand is
 *      committed; UpdateDemand re-runs the AX_AM_CLAUSE percentage validation.
 *   3. confirm.
 *
 * Each step throws on a domain failure, so a failed fill aborts the chain rather
 * than confirming a demand that is still missing the data it was opened for.
 */
export function useConfirmDemandWithFills() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ demandId, cpmProductSysId, update }: ConfirmDemandFills) => {
      if (cpmProductSysId) {
        await mapDemandProductRequest({ demandId, cpmProductSysId })
      }
      if (update && Object.keys(update).length > 0) {
        await updateDemandRequest({ ...update, demandId })
      }
      return confirmDemandRequest(demandId)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: demandKeys.all })
      toast.success("Demand confirmed")
    },
    onError: (e: Error) => toast.error(e.message || "Failed to confirm demand"),
  })
}

export function usePullFromOrion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (req: PullFromOrionRequest) => {
      const raw = await apiClient.post<unknown>("/api/v1/ppc/demands/pull-from-orion", req)
      return PullFromOrionResponseParser.fromJSON(raw)
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: demandKeys.all })
      qc.invalidateQueries({ queryKey: ["ppc", "sales-order-staging"] })
      toast.success(`Pulled ${res.createdCount} demand(s) from Orion`)
    },
    onError: (e: Error) => toast.error(e.message || "Failed to pull from Orion"),
  })
}

export function useCarryForwardCandidates(sourceMonth: string) {
  return useQuery({
    queryKey: ["ppc", "demand", "carry-forward-candidates", sourceMonth],
    queryFn: async () => {
      const raw = await apiClient.get<unknown>(
        `/api/v1/ppc/demands/carry-forward-candidates?sourceMonth=${encodeURIComponent(sourceMonth)}`
      )
      return ListCarryForwardCandidatesResponseParser.fromJSON(raw).data || []
    },
    enabled: !!sourceMonth,
    staleTime: 15_000,
  })
}

export function useProcessCarryForward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (req: ProcessCarryForwardRequest) => {
      const raw = await apiClient.post<unknown>("/api/v1/ppc/demands/carry-forward", req)
      return ProcessCarryForwardResponseParser.fromJSON(raw)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: demandKeys.all })
      toast.success("Carry-forward processed")
    },
    onError: (e: Error) => toast.error(e.message || "Failed to process carry-forward"),
  })
}

export function useMapDemandProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: mapDemandProductRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: demandKeys.all })
      toast.success("Product mapped to demand")
    },
    onError: (e: Error) => toast.error(e.message || "Failed to map product"),
  })
}

/**
 * useSetStagingProduct persists a planner's manual product pick onto the
 * `sales_order_staging` row itself (match_status becomes MANUAL).
 *
 * Writing it here rather than on the demand created later is what makes the
 * pick survive: the row is no longer AMBIGUOUS/NOT_FOUND, so the next ETL
 * resolution pass leaves it alone and the planner is not asked again. The pull
 * then reads the resolved product straight off the row.
 *
 * The response carries the decorated row, so the staging list is refreshed
 * from the server rather than patched optimistically.
 */
export function useSetStagingProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      sosId,
      cpmProductSysId,
    }: {
      sosId: number
      cpmProductSysId: number
    }) => {
      const raw = await apiClient.post<unknown>(
        `/api/v1/ppc/sales-order-staging/${sosId}/product`,
        { cpmProductSysId }
      )
      return SetStagingProductResponseParser.fromJSON(raw)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ppc", "sales-order-staging"] })
      toast.success("Product linked to sales order")
    },
    onError: (e: Error) => toast.error(e.message || "Failed to link product"),
  })
}

export function useApproveMTSDemand() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (req: ApproveMTSDemandRequest) => {
      const raw = await apiClient.post<unknown>(`/api/v1/ppc/demands/${req.demandId}/approve-mts`, req)
      return ApproveMTSDemandResponseParser.fromJSON(raw)
    },
    onSuccess: (_, req) => {
      qc.invalidateQueries({ queryKey: demandKeys.all })
      toast.success(req.approved ? "MTS demand approved" : "MTS demand rejected")
    },
    onError: (e: Error) => toast.error(e.message || "Failed to process MTS approval"),
  })
}
