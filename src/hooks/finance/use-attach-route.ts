"use client"

// useAttachRoute — F3: attach an existing route (from a different product)
// onto a target product. See design.md §3.
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export interface AttachRouteInput {
  sourceHeadId: number
  targetProductSysId: number
  linkedRequestId?: number
}

export interface AttachRouteResult {
  newHeadId: number
}

/**
 * Thrown when the backend rejects the attach because the target product
 * already has a live (non-LOCKED) route (costroute.ErrTargetProductHasActiveRoute,
 * surfaced as Base{isSuccess:false, statusCode:"409"} with a nil gRPC error —
 * never a thrown gRPC error). Callers should catch this specifically and
 * render an inline "already has a route" notice instead of a raw error toast.
 */
export class AttachRouteConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AttachRouteConflictError"
  }
}

export function useAttachRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: AttachRouteInput): Promise<AttachRouteResult> => {
      const res = await fetch(`/api/v1/finance/routes/attach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceHeadId: input.sourceHeadId,
          targetProductSysId: input.targetProductSysId,
          linkedRequestId: input.linkedRequestId ?? 0,
        }),
      })
      const json = await res.json()
      if (!json.base?.isSuccess) {
        const message = json.base?.message || "Attach route failed"
        if (String(json.base?.statusCode) === "409") {
          throw new AttachRouteConflictError(message)
        }
        throw new Error(message)
      }
      return { newHeadId: Number(json.newHeadId ?? 0) }
    },
    onSuccess: (res) => {
      toast.success(`Route attached → #${res.newHeadId}`)
      qc.invalidateQueries({ queryKey: ["finance", "cost-route"] })
      qc.invalidateQueries({ queryKey: ["finance", "cost-product-request"] })
    },
    onError: (err: Error) => {
      // Conflict case gets an inline notice in the dialog, not a duplicate toast.
      if (err instanceof AttachRouteConflictError) return
      toast.error(err.message)
    },
  })
}
