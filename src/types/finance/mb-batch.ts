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
