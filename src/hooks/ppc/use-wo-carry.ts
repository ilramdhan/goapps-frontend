"use client"

// PPC work-order carry-forward hooks. Mirrors the plan-item pair in
// use-plan-item-carry.ts.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { apiClient } from "@/lib/api"
import {
  ListWorkOrderCarryForwardCandidatesResponse as ListWorkOrderCarryForwardCandidatesResponseParser,
  ProcessWorkOrderCarryForwardResponse as ProcessWorkOrderCarryForwardResponseParser,
} from "@/types/generated/ppc/v1/work_order"
import { workOrderKeys } from "./use-work-order"

// ── Query keys ───────────────────────────────────────────────────────────────

const woCarryKeys = {
  all: ["ppc", "wo-carry-candidates"] as const,
  candidates: (sourceMonth: string, targetMonth: string) =>
    ["ppc", "wo-carry-candidates", sourceMonth, targetMonth] as const,
}

/**
 * assertOk throws when a PPC gRPC call reported a domain failure.
 *
 * The PPC BFF proxies the gRPC response verbatim with HTTP 200 and the backend
 * maps every domain error to `base.isSuccess = false` rather than a gRPC status
 * (`domainErrorToBaseResponse`, delivery/grpc/master_shared.go). `apiClient`
 * only throws on a non-OK HTTP status, so without this a rejected carry — "is
 * still a draft", "nothing left to carry" — resolves as a success and renders
 * as an empty, apparently-fine list.
 */
function assertOk(base: { isSuccess: boolean; message: string } | undefined, fallback: string): void {
  if (base && !base.isSuccess) {
    throw new Error(base.message || fallback)
  }
}

// ── Candidates ───────────────────────────────────────────────────────────────

/**
 * Candidates are scoped to BOTH months: the backend needs the target month to
 * answer whether each candidate has already been carried into it, so changing
 * the target month is a different query, not the same one re-rendered.
 */
export function useWOCarryCandidates(sourceMonth: string, targetMonth: string) {
  return useQuery({
    queryKey: woCarryKeys.candidates(sourceMonth, targetMonth),
    queryFn: async () => {
      const raw = await apiClient.get<unknown>(
        `/api/v1/ppc/work-orders/carry-forward-candidates?source_month=${sourceMonth}&target_month=${targetMonth}`
      )
      const response = ListWorkOrderCarryForwardCandidatesResponseParser.fromJSON(raw)
      assertOk(response.base, "Failed to load work order carry-forward candidates")
      return response.data || []
    },
    enabled: sourceMonth.length === 7 && targetMonth.length === 7,
    staleTime: 15_000,
  })
}

// ── Process one ──────────────────────────────────────────────────────────────

export function useProcessWOCarryForward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (req: { sourceWoId: number; targetMonth: string; lotNo?: string; carryQty?: string }) => {
      const raw = await apiClient.post<unknown>(
        `/api/v1/ppc/work-orders/${req.sourceWoId}/carry-forward`,
        { target_month: req.targetMonth, lot_no: req.lotNo ?? "", carry_qty: req.carryQty ?? "" }
      )
      const response = ProcessWorkOrderCarryForwardResponseParser.fromJSON(raw)
      assertOk(response.base, "Failed to carry work order forward")
      return response
    },
    // A carry both creates a WO in the target month and changes what the source
    // month still has left to carry, so the candidate list is as stale as the
    // WO list — without this the row stays clickable and a second click fails.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workOrderKeys.all })
      qc.invalidateQueries({ queryKey: woCarryKeys.all })
    },
  })
}
