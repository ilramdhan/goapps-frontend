// Cost Product Param Bulk Types - Re-export from proto-generated types with UI helpers
// F4 (product-route-fork-attach-bulk): bulk edit applicable params / param
// values across many products at once, mirroring mb-head.ts's Bulk* job types.

// ============================================================================
// Re-export proto-generated types
// ============================================================================

export type {
  AddApplicableParamOp,
  RemoveApplicableParamOp,
  UpsertParamValueOp,
  BulkParamOperation,
  BulkEditProductParamsRequest,
  BulkEditProductParamsResponse,
  BulkParamJobInfo,
  GetBulkProductParamJobStatusResponse,
  ListBulkProductParamJobFailuresResponse,
  BulkProductParamJobFailure,
} from "@/types/generated/finance/v1/cost_product_param_bulk"

export {
  BulkParamJobInfo as BulkParamJobInfoParser,
  GetBulkProductParamJobStatusResponse as GetBulkProductParamJobStatusResponseParser,
  ListBulkProductParamJobFailuresResponse as ListBulkProductParamJobFailuresResponseParser,
} from "@/types/generated/finance/v1/cost_product_param_bulk"

// ============================================================================
// Bulk Product Param Job Status — mirrors mb-head.ts's BulkMBHeadJobStatus
// ============================================================================

export type BulkProductParamJobStatus = "QUEUED" | "PROCESSING" | "DONE" | "FAILED" | "PARTIAL"

/** Terminal statuses — once reached, the job's polling hook stops refetching. */
export const BULK_PRODUCT_PARAM_JOB_TERMINAL_STATUSES: readonly BulkProductParamJobStatus[] = [
  "DONE",
  "FAILED",
  "PARTIAL",
]

