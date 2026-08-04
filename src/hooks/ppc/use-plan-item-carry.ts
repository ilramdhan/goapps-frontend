"use client"

// PPC plan-item carry-forward hooks. Mirrors the demand pair in use-demand.ts.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { apiClient } from "@/lib/api"
import type { ProcessPlanCarryForwardRequest } from "@/types/ppc/plan-item"
import {
  ListPlanCarryForwardCandidatesResponseParser,
  ProcessPlanCarryForwardResponseParser,
} from "@/types/ppc/plan-item"
import { PlanCarryAction } from "@/types/ppc/common"
import { planItemKeys } from "./use-plan-item"

const CANDIDATES_KEY = ["ppc", "plan-item", "carry-forward-candidates"] as const

/**
 * assertOk throws when a PPC gRPC call reported a domain failure.
 *
 * The PPC BFF proxies the gRPC response verbatim with HTTP 200 and the backend
 * maps every domain error to `base.isSuccess = false` rather than a gRPC status
 * (`domainErrorToBaseResponse`, delivery/grpc/master_shared.go). `apiClient`
 * only throws on a non-OK HTTP status, so without this a rejected carry —
 * "already carried", "nothing left to carry" — resolves as a success and toasts
 * as one.
 */
function assertOk(base: { isSuccess: boolean; message: string } | undefined, fallback: string): void {
  if (base && !base.isSuccess) {
    throw new Error(base.message || fallback)
  }
}

/**
 * Candidates are scoped to BOTH months: the backend needs the target month to
 * answer whether each candidate has already been carried into it, so changing
 * the target month is a different query, not the same one re-rendered.
 */
export function usePlanCarryForwardCandidates(sourceMonth: string, targetMonth: string) {
  return useQuery({
    queryKey: [...CANDIDATES_KEY, sourceMonth, targetMonth],
    queryFn: async () => {
      const qs = new URLSearchParams({ sourceMonth, targetMonth }).toString()
      const raw = await apiClient.get<unknown>(
        `/api/v1/ppc/plan-items/carry-forward-candidates?${qs}`
      )
      const response = ListPlanCarryForwardCandidatesResponseParser.fromJSON(raw)
      assertOk(response.base, "Failed to load plan carry-forward candidates")
      return response.data || []
    },
    enabled: !!sourceMonth && !!targetMonth,
    staleTime: 15_000,
  })
}

export function useProcessPlanCarryForward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (req: ProcessPlanCarryForwardRequest) => {
      const raw = await apiClient.post<unknown>("/api/v1/ppc/plan-items/carry-forward", req)
      const response = ProcessPlanCarryForwardResponseParser.fromJSON(raw)
      assertOk(response.base, "Failed to process plan carry-forward")
      return response
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: planItemKeys.all })
      qc.invalidateQueries({ queryKey: CANDIDATES_KEY })
      toast.success("Plan carry-forward processed")
    },
    onError: (e: Error) => toast.error(e.message || "Failed to process plan carry-forward"),
  })
}

/** One plan item's outcome in a bulk carry run. */
export interface BulkPlanCarryOutcome {
  planItemId: number
  /** Human label for the row — product code, then a described fallback. Never a raw id. */
  label: string
  ok: boolean
  /** Present only when ok === false. */
  error?: string
}

export interface BulkPlanCarryInput {
  items: { planItemId: number; label: string }[]
  targetMonth: string
  /** Called after each item settles so the caller can show progress. */
  onProgress?: (done: number, total: number) => void
}

export interface BulkPlanCarryResult {
  outcomes: BulkPlanCarryOutcome[]
  succeeded: number
  failed: number
}

/**
 * Carry every listed plan item as-is, one call at a time.
 *
 * There is no bulk RPC, so this loops client-side, with the same two
 * consequences the demand equivalent owns rather than hides:
 *   - It is NOT atomic. A failure part-way leaves the earlier items already
 *     carried, so the result is per-item and the caller names every row.
 *   - It runs sequentially. Concurrent writes against one month buy little and
 *     make a partial failure harder to describe.
 *
 * It deliberately does not toast: a batch has no single outcome to announce.
 */
export function useBulkPlanCarryForwardAsIs() {
  const qc = useQueryClient()
  return useMutation<BulkPlanCarryResult, Error, BulkPlanCarryInput>({
    mutationFn: async ({ items, targetMonth, onProgress }) => {
      const outcomes: BulkPlanCarryOutcome[] = []
      for (const [index, item] of items.entries()) {
        try {
          const req: ProcessPlanCarryForwardRequest = {
            sourcePlanItemId: item.planItemId,
            action: PlanCarryAction.PLAN_CARRY_ACTION_CARRY_AS_IS,
            targetMonth,
          }
          const raw = await apiClient.post<unknown>("/api/v1/ppc/plan-items/carry-forward", req)
          const response = ProcessPlanCarryForwardResponseParser.fromJSON(raw)
          // Without this a backend rejection (already carried, nothing left to
          // carry) would be counted as a success and reported as one.
          assertOk(response.base, "Failed to carry this plan item")
          outcomes.push({ planItemId: item.planItemId, label: item.label, ok: true })
        } catch (e) {
          outcomes.push({
            planItemId: item.planItemId,
            label: item.label,
            ok: false,
            error: e instanceof Error ? e.message : "Unknown error",
          })
        }
        onProgress?.(index + 1, items.length)
      }
      return {
        outcomes,
        succeeded: outcomes.filter((o) => o.ok).length,
        failed: outcomes.filter((o) => !o.ok).length,
      }
    },
    // Always invalidate: even an all-failed run may have mutated server state
    // before erroring, and a stale list is worse than a refetch.
    onSettled: () => {
      qc.invalidateQueries({ queryKey: planItemKeys.all })
      qc.invalidateQueries({ queryKey: CANDIDATES_KEY })
    },
  })
}
