"use client"

// MB Dozing (LDR) hooks — the calculator is a POST-driven, stateless
// computation, so these are `useMutation` and NOT `useQuery`. Nothing is
// persisted (K-18), so there is no cache to invalidate.

import { useMutation } from "@tanstack/react-query"

import { calculateDozing, previewDozingImpact } from "@/services/finance/mb-dozing-api"
import type {
  CalculateDozingPayload,
  PreviewDozingImpactPayload,
} from "@/types/finance/mb-dozing"

export const mbDozingKeys = {
  all: ["finance", "mb-dozing"] as const,
  calculate: () => [...mbDozingKeys.all, "calculate"] as const,
  impactPreview: () => [...mbDozingKeys.all, "impact-preview"] as const,
}

/**
 * Runs the dozing calculator. `factorAvailable === false` resolves normally —
 * it is a valid answer ("no factor for this pair"), not a failure, so it must
 * not be routed through onError or surfaced as a toast.
 */
export function useCalculateDozing() {
  return useMutation({
    mutationKey: mbDozingKeys.calculate(),
    mutationFn: (payload: CalculateDozingPayload) => calculateDozing(payload),
  })
}

export function usePreviewDozingImpact() {
  return useMutation({
    mutationKey: mbDozingKeys.impactPreview(),
    mutationFn: (payload: PreviewDozingImpactPayload) => previewDozingImpact(payload),
  })
}
