// MB Batch Types - Re-export from proto-generated types with UI helpers

// ============================================================================
// Re-export proto-generated types
// ============================================================================

export type {
  TriggerMbBatchRequest,
  TriggerMbBatchResponse,
  MbBatchError,
} from "@/types/generated/finance/v1/yarn_master"

export {
  TriggerMbBatchResponse as TriggerMbBatchResponseParser,
} from "@/types/generated/finance/v1/yarn_master"

// ============================================================================
// Simplified Params Types for Hooks
// ============================================================================

export interface TriggerMbBatchParams {
  period: string
}

// ============================================================================
// Error normalization (BFF may return camelCase or snake_case)
// ============================================================================

export function normalizeMbBatchErrors(raw: unknown): { mbhId: string; error: string }[] {
  if (!Array.isArray(raw)) return []
  return raw.map((e) => {
    const r = (e ?? {}) as Record<string, unknown>
    return { mbhId: String(r.mbhId ?? r.mbh_id ?? ""), error: String(r.error ?? r.message ?? "") }
  })
}
