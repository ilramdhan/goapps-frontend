// MB Dozing (LDR) calculator API service — READ-ONLY (decision K-18). Both
// calls are POSTs because they carry a computation payload, but neither
// persists anything. All calls go through the BFF routes under
// /api/v1/finance/mb-dozing/... — never straight to the backend.

import {
  normalizeDozingCalculation,
  normalizeDozingImpact,
  type CalculateDozingPayload,
  type NormalizedDozingCalculation,
  type NormalizedDozingImpact,
  type PreviewDozingImpactPayload,
  type RawDozingCalculation,
  type RawDozingImpact,
} from "@/types/finance/mb-dozing"

const BASE = "/api/v1/finance/mb-dozing"

function assertOk(base: { isSuccess?: boolean; message?: string } | undefined, fallback: string) {
  if (base?.isSuccess === false) {
    throw new Error(base.message || fallback)
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return (await res.json()) as T
}

/**
 * Computes a target LDR. A response with `factorAvailable === false` is a
 * NORMAL outcome (no conversion factor for the requested pair), not an error —
 * it is returned to the caller untouched so the UI can show the server message
 * and withhold every number. Do not throw on it.
 */
export async function calculateDozing(
  payload: CalculateDozingPayload
): Promise<NormalizedDozingCalculation> {
  const json = await postJson<RawDozingCalculation>("/calculate", payload)
  assertOk(json.base, "Failed to calculate dozing")
  return normalizeDozingCalculation(json)
}

export async function previewDozingImpact(
  payload: PreviewDozingImpactPayload
): Promise<NormalizedDozingImpact> {
  const json = await postJson<RawDozingImpact>("/impact-preview", {
    mbsId: payload.mbsId,
    limit: payload.limit ?? 0,
  })
  assertOk(json.base, "Failed to preview dozing impact")
  return normalizeDozingImpact(json)
}
