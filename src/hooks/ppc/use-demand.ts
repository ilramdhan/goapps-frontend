"use client"

// PPC demand hooks — CRUD via factory + bespoke workflow actions
// (confirm, pull-from-orion, carry-forward, MTS approval).

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { createCrudHooks } from "@/lib/hooks"
import { apiClient } from "@/lib/api"
import { CarryAction } from "@/types/ppc/common"
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
      const res = ProcessCarryForwardResponseParser.fromJSON(raw)
      // Without this a domain rejection — ErrSplitExceedsRemaining, a refused
      // state transition — arrives as HTTP 200 with base.isSuccess = false and
      // toasts "Carry-forward processed" for a demand that was not carried.
      assertOk(res.base, "Failed to process carry-forward")
      return res
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: demandKeys.all })
      toast.success("Carry-forward processed")
    },
    onError: (e: Error) => toast.error(e.message || "Failed to process carry-forward"),
  })
}

/** One demand's outcome in a bulk carry-forward run. */
export interface BulkCarryOutcome {
  demandId: number
  /** Human label for the row — product code, contract no, or a described fallback. Never a raw id. */
  label: string
  ok: boolean
  /** Present only when ok === false. */
  error?: string
}

export interface BulkCarryInput {
  demands: { demandId: number; label: string }[]
  targetMonth: string
  /** Called after each demand settles so the caller can show progress. */
  onProgress?: (done: number, total: number) => void
}

export interface BulkCarryResult {
  outcomes: BulkCarryOutcome[]
  succeeded: number
  failed: number
}

/**
 * Thrown when the loop itself dies part-way, carrying the verdicts already
 * collected. Every attempted row has a verdict by then — discarding them would
 * force the caller to guess, and the only honest guess is none.
 *
 * Rows with no outcome were never attempted: they are simply still outstanding
 * and stay in the candidate list, so they need no special reporting.
 */
export class BulkCarryError extends Error {
  constructor(
    message: string,
    readonly outcomes: BulkCarryOutcome[]
  ) {
    super(message)
    this.name = "BulkCarryError"
  }
}

/**
 * Bulk "carry all as-is".
 *
 * There is no batch RPC: ppc/v1/ppc_service.proto exposes only the single-demand
 * ProcessCarryForward, so this loops client-side. Consequences the UI must own,
 * not hide:
 *   - It is NOT atomic. A failure part-way through leaves the earlier demands
 *     already carried, so the result is per-demand and the caller reports every
 *     row by name.
 *   - It runs sequentially. Firing N writes concurrently against the same month
 *     buys little and makes a partial failure harder to describe.
 *
 * This intentionally does not toast on its own — a batch has no single outcome
 * to announce. The caller renders the per-row result.
 */
export function useBulkCarryForwardAsIs() {
  const qc = useQueryClient()
  return useMutation<BulkCarryResult, Error, BulkCarryInput>({
    mutationFn: async ({ demands, targetMonth, onProgress }) => {
      const outcomes: BulkCarryOutcome[] = []
      const tally = () => ({
        outcomes,
        succeeded: outcomes.filter((o) => o.ok).length,
        failed: outcomes.filter((o) => !o.ok).length,
      })
      try {
        for (const [index, d] of demands.entries()) {
          try {
            const req: ProcessCarryForwardRequest = {
              sourceDemandId: d.demandId,
              action: CarryAction.CARRY_ACTION_CARRY_AS_IS,
              targetMonth,
              splits: [],
            }
            const raw = await apiClient.post<unknown>("/api/v1/ppc/demands/carry-forward", req)
            const res = ProcessCarryForwardResponseParser.fromJSON(raw)
            // A domain rejection comes back as HTTP 200 with
            // base.isSuccess = false, so apiClient does not throw. Without this
            // the row is counted ok, written into the session recap as carried,
            // and dropped from the candidate list — having done nothing. That is
            // precisely the "never claim success for a partially-failed batch"
            // guarantee. The throw lands in the catch below, which turns the row
            // into a named failure carrying the backend's own message.
            assertOk(res.base, "Failed to carry demand forward")
            outcomes.push({ demandId: d.demandId, label: d.label, ok: true })
          } catch (e) {
            outcomes.push({
              demandId: d.demandId,
              label: d.label,
              ok: false,
              error: e instanceof Error ? e.message : "Unknown error",
            })
          }
          onProgress?.(index + 1, demands.length)
        }
      } catch (e) {
        // The loop itself died — the inner try already absorbs every per-demand
        // failure, so this is the caller's onProgress throwing or something
        // equally structural. Carry the verdicts out rather than dropping them:
        // every row attempted so far has one, and the rest were never touched.
        throw new BulkCarryError(
          e instanceof Error ? e.message : "The batch stopped unexpectedly",
          outcomes
        )
      }
      return tally()
    },
    // Always invalidate: even an all-failed run may have partially mutated
    // server state before erroring, and a stale list is worse than a refetch.
    onSettled: () => {
      qc.invalidateQueries({ queryKey: demandKeys.all })
      qc.invalidateQueries({ queryKey: ["ppc", "demand", "carry-forward-candidates"] })
    },
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
