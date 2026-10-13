// Enum converters for CostCalc BFF routes.
// UI uses short forms ("ACTUAL", "SINGLE_PRODUCT"); the gRPC client encodes
// enums as numeric on the wire, so we map short form -> numeric enum value
// before invoking the gRPC method.

import {
  CalculationType,
  CalcJobScope,
  CalcJobStatus,
  ChunkStatus,
  CostResultStatus,
  CostSheetExportLayout,
  JobProductStatus,
} from "@/types/generated/finance/v1/cost_calc"

export function toCostResultStatus(s: string | undefined | null): CostResultStatus {
  switch ((s || "").toUpperCase()) {
    case "CALCULATED":
      return CostResultStatus.COST_RESULT_STATUS_CALCULATED
    case "VERIFIED":
      return CostResultStatus.COST_RESULT_STATUS_VERIFIED
    case "APPROVED":
      return CostResultStatus.COST_RESULT_STATUS_APPROVED
    case "SUPERSEDED":
      return CostResultStatus.COST_RESULT_STATUS_SUPERSEDED
    default:
      return CostResultStatus.COST_RESULT_STATUS_UNSPECIFIED
  }
}

export function toCalcType(s: string | undefined | null): CalculationType {
  switch ((s || "").toUpperCase()) {
    case "ACTUAL":
      return CalculationType.CALCULATION_TYPE_ACTUAL
    case "FORECAST":
      return CalculationType.CALCULATION_TYPE_FORECAST
    case "SELLING":
      return CalculationType.CALCULATION_TYPE_SELLING
    default:
      return CalculationType.CALCULATION_TYPE_UNSPECIFIED
  }
}

export function toScope(s: string | undefined | null): CalcJobScope {
  switch ((s || "").toUpperCase()) {
    case "ALL":
      return CalcJobScope.CALC_JOB_SCOPE_ALL
    case "FILTERED":
      return CalcJobScope.CALC_JOB_SCOPE_FILTERED
    case "SINGLE_PRODUCT":
      return CalcJobScope.CALC_JOB_SCOPE_SINGLE_PRODUCT
    case "SINGLE_ROUTE":
      return CalcJobScope.CALC_JOB_SCOPE_SINGLE_ROUTE
    default:
      return CalcJobScope.CALC_JOB_SCOPE_UNSPECIFIED
  }
}

export function toJobStatus(s: string | undefined | null): CalcJobStatus {
  switch ((s || "").toUpperCase()) {
    case "QUEUED":
      return CalcJobStatus.CALC_JOB_STATUS_QUEUED
    case "PLANNING":
      return CalcJobStatus.CALC_JOB_STATUS_PLANNING
    case "PROCESSING":
      return CalcJobStatus.CALC_JOB_STATUS_PROCESSING
    case "SUCCESS":
      return CalcJobStatus.CALC_JOB_STATUS_SUCCESS
    case "PARTIAL_FAILED":
      return CalcJobStatus.CALC_JOB_STATUS_PARTIAL_FAILED
    case "FAILED":
      return CalcJobStatus.CALC_JOB_STATUS_FAILED
    case "CANCELLED":
      return CalcJobStatus.CALC_JOB_STATUS_CANCELLED
    default:
      return CalcJobStatus.CALC_JOB_STATUS_UNSPECIFIED
  }
}

export function toChunkStatus(s: string | undefined | null): ChunkStatus {
  switch ((s || "").toUpperCase()) {
    case "QUEUED":
      return ChunkStatus.CHUNK_STATUS_QUEUED
    case "DISPATCHED":
      return ChunkStatus.CHUNK_STATUS_DISPATCHED
    case "PROCESSING":
      return ChunkStatus.CHUNK_STATUS_PROCESSING
    case "SUCCESS":
      return ChunkStatus.CHUNK_STATUS_SUCCESS
    case "PARTIAL_FAILED":
      return ChunkStatus.CHUNK_STATUS_PARTIAL_FAILED
    case "FAILED":
      return ChunkStatus.CHUNK_STATUS_FAILED
    default:
      return ChunkStatus.CHUNK_STATUS_UNSPECIFIED
  }
}

export function toJobProductStatus(s: string | undefined | null): JobProductStatus {
  switch ((s || "").toUpperCase()) {
    case "PENDING":
      return JobProductStatus.JOB_PRODUCT_STATUS_PENDING
    case "READY":
      return JobProductStatus.JOB_PRODUCT_STATUS_READY
    case "CALCULATING":
      return JobProductStatus.JOB_PRODUCT_STATUS_CALCULATING
    case "SUCCESS":
      return JobProductStatus.JOB_PRODUCT_STATUS_SUCCESS
    case "FAILED":
      return JobProductStatus.JOB_PRODUCT_STATUS_FAILED
    case "BLOCKED":
      return JobProductStatus.JOB_PRODUCT_STATUS_BLOCKED
    case "SKIPPED":
      return JobProductStatus.JOB_PRODUCT_STATUS_SKIPPED
    default:
      return JobProductStatus.JOB_PRODUCT_STATUS_UNSPECIFIED
  }
}

// ---------- cost sheet export layout ----------

// toExportLayout maps the UI short form to the proto enum. Absent/unknown ->
// UNSPECIFIED, which the backend treats as COMBINED.
export function toExportLayout(s: string | undefined | null): CostSheetExportLayout {
  switch ((s || "").toUpperCase()) {
    case "COMBINED":
      return CostSheetExportLayout.COST_SHEET_EXPORT_LAYOUT_COMBINED
    case "HORIZONTAL":
      return CostSheetExportLayout.COST_SHEET_EXPORT_LAYOUT_HORIZONTAL
    case "VERTICAL":
      return CostSheetExportLayout.COST_SHEET_EXPORT_LAYOUT_VERTICAL
    default:
      return CostSheetExportLayout.COST_SHEET_EXPORT_LAYOUT_UNSPECIFIED
  }
}
