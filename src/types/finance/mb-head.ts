// MB Head Types - Re-export from proto-generated types with UI helpers

// ============================================================================
// Re-export proto-generated types
// ============================================================================

// Entity and Request/Response types (as type-only exports)
export type {
  MBHead,
  CreateMBHeadRequest,
  CreateMBHeadResponse,
  GetMBHeadRequest,
  GetMBHeadResponse,
  UpdateMBHeadRequest,
  UpdateMBHeadResponse,
  DeleteMBHeadRequest,
  DeleteMBHeadResponse,
  ListMBHeadsRequest,
  ListMBHeadsResponse,
  ExportMBHeadsRequest,
  ExportMBHeadsResponse,
  ExportMBRecipeFullResponse,
  ImportMBHeadsRequest,
  ImportMBHeadsResponse,
  DownloadMBHeadTemplateRequest,
  DownloadMBHeadTemplateResponse,
  SubmitMBHeadRequest,
  SubmitMBHeadResponse,
  ApproveMBHeadRequest,
  ApproveMBHeadResponse,
  ValidateMBHeadRequest,
  ValidateMBHeadResponse,
  UnApproveMBHeadRequest,
  UnApproveMBHeadResponse,
  RevokeMBHeadRequest,
  RevokeMBHeadResponse,
  RejectMBHeadRequest,
  RejectMBHeadResponse,
} from "@/types/generated/finance/v1/yarn_master"

// Message functions for parsing (named exports as Parsers)
export {
  MBHead as MBHeadParser,
  CreateMBHeadResponse as CreateMBHeadResponseParser,
  GetMBHeadResponse as GetMBHeadResponseParser,
  UpdateMBHeadResponse as UpdateMBHeadResponseParser,
  DeleteMBHeadResponse as DeleteMBHeadResponseParser,
  ListMBHeadsResponse as ListMBHeadsResponseParser,
  ExportMBHeadsResponse as ExportMBHeadsResponseParser,
  ExportMBRecipeFullResponse as ExportMBRecipeFullResponseParser,
  ImportMBHeadsResponse as ImportMBHeadsResponseParser,
  DownloadMBHeadTemplateResponse as DownloadMBHeadTemplateResponseParser,
  SubmitMBHeadResponse as SubmitMBHeadResponseParser,
  ApproveMBHeadResponse as ApproveMBHeadResponseParser,
  ValidateMBHeadResponse as ValidateMBHeadResponseParser,
  UnApproveMBHeadResponse as UnApproveMBHeadResponseParser,
  RevokeMBHeadResponse as RevokeMBHeadResponseParser,
  RejectMBHeadResponse as RejectMBHeadResponseParser,
} from "@/types/generated/finance/v1/yarn_master"

// Re-export shared enums/types from UOM (same package)
export {
  ActiveFilter,
  activeFilterFromJSON,
  activeFilterToJSON,
} from "@/types/generated/finance/v1/uom"

// Re-export common types from proto
export type {
  BaseResponse,
  PaginationResponse,
} from "@/types/generated/common/v1/common"

// ============================================================================
// Import for local use
// ============================================================================

import { ActiveFilter } from "@/types/generated/finance/v1/uom"

// ============================================================================
// Simplified Params Types for Hooks
// ============================================================================

export interface ListMBHeadsParams {
  page?: number
  pageSize?: number
  search?: string
  activeFilter?: ActiveFilter
  sortBy?: string
  sortOrder?: string
  /**
   * ⭐ DIPERBARUI 2026-08-26 (R16) — filters to the head(s) linked to one cost product
   * (mst_mb_head.mbh_cost_product_id). Undefined/0 means no filter. NOTE: this column is
   * only populated once a head reaches VALIDATED, so a still-DRAFT head will not be found
   * by this filter.
   */
  costProductId?: number
}

export interface ExportMBHeadsParams {
  activeFilter?: ActiveFilter
  /**
   * Audit-only opt-in: includes MB Heads whose workflow status is REJECTED in the
   * export. Defaults to false (excluded) both here and on the BFF route/backend —
   * omitting the field must never include rejected documents.
   */
  includeRejected?: boolean
}

/**
 * Params for the P12 denormalized full-recipe export (recipe + composition + MB cost).
 *
 * `period` is YYYYMM; omitting it means "the latest active period per head".
 * `costType` defaults server-side to ACTUAL — pinning ONE cost type is what keeps the
 * row count at n_composition instead of n_composition x n_cost_type.
 *
 * Every field is optional and MUST stay omittable: an absent filter is sent as absent,
 * never coerced to a default on the client (D13).
 */
export interface ExportMBRecipeFullParams {
  activeFilter?: ActiveFilter
  period?: string
  costType?: MBRecipeFullCostType
  /**
   * Filter on the DERIVED check status (mst_mb_head.mbh_check_status_calc, P10).
   *
   * Omitted / empty means ALL ROWS, including heads whose derived status is still
   * NULL and therefore render as "Belum dihitung" — i.e. leaving it out reproduces
   * the export exactly as it behaved before this filter existed. A concrete value
   * necessarily EXCLUDES those NULL heads, since SQL equality never matches NULL.
   */
  checkStatusCalc?: MBRecipeFullCheckStatusCalc
  /**
   * Audit-only opt-in: includes MB Heads whose workflow status is REJECTED in the
   * export. Defaults to false (excluded) both here and on the BFF route/backend —
   * omitting the field must never include rejected documents.
   */
  includeRejected?: boolean
}

/** The cost types cst_mb_cost accepts. Mirrors the proto's validate `in` list. */
export type MBRecipeFullCostType = "ACTUAL" | "SELLING" | "FORECAST"

/**
 * The derived check-status values accepted by the full-recipe export filter. Mirrors
 * the proto's validate `in` list, which in turn mirrors the six values allowed by the
 * CHECK constraint chk_mbh_check_status_calc (migration 000487).
 *
 * ⛔ NOT an enum and NOT a shared status list — it is a union scoped to this one export
 * filter, deliberately kept out of any status-rendering code path.
 *
 * ⚠ Only THREE of these six are produced by the backend's DeriveCheckStatus today:
 * "Boughtout", "Approved", "Waiting". Filtering by "Current", "Outdated" or "Rejected"
 * is VALID but returns ZERO ROWS until the corresponding user gates are decided. ⛔ Not
 * a bug — do not "fix" it by hiding those options.
 */
export type MBRecipeFullCheckStatusCalc =
  | "Waiting"
  | "Current"
  | "Boughtout"
  | "Approved"
  | "Outdated"
  | "Rejected"

// ============================================================================
// Workflow State
// ============================================================================

export type MBHeadEntryStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "VALIDATED"
  | "UN_APPROVED"
  | "REVOKED"
  | "REJECTED"
  // P10 lock/unlock holding state (backend migration 000492). A locked
  // APPROVED/VALIDATED recipe parks here while an unlock request awaits a
  // decision; it exits to DRAFT (granted) or back to APPROVED/VALIDATED
  // (rejected). ⛔ Not reachable from DRAFT.
  | "UNLOCK_REQUESTED"

// ============================================================================
// Form Types
// ============================================================================

// Create-only field — immutable after creation, so it is excluded from
// UpdateMBHeadRequest and must not appear in an edit form.
export interface MBHeadFormData {
  mbhMbCosting: string
  mbhOracleSysId: string
  mbhMgtName: string
  mbhDenier: number | null
  mbhFilament: number | null
  mbhDozing: number | null
  // ⚠ Legacy form field only. It exists because mb-head-form-dialog-legacy.tsx (a
  // FROZEN file) still registers it. ⛔ Nothing new may add a check-status field to
  // a form: `mbh_check_status` is the frozen Oracle trace and `mbh_check_status_calc`
  // is derived by the backend — neither is user input (plan §11 item 42, (iii)).
  mbhCheckStatus: string
  mbhStatus: string
  mbhLdrPrsn: number | null
  mbhRunLdrPct: number | null
  mbhFinalProduct: string
  mbhCode: string
  mbhIsBoughtout: boolean
  mbhDevCode: string
  mbhShadeCode: string
  mbhShadeName: string
  mbhCrossSection: string
  mbhLustureCode: string
  mbhIsActive: boolean
}

export const DEFAULT_MB_HEAD_FORM_VALUES: MBHeadFormData = {
  mbhMbCosting: "",
  mbhOracleSysId: "",
  mbhMgtName: "",
  mbhDenier: null,
  mbhFilament: null,
  mbhDozing: null,
  mbhCheckStatus: "",
  mbhStatus: "",
  mbhLdrPrsn: null,
  mbhRunLdrPct: null,
  mbhFinalProduct: "",
  mbhCode: "",
  mbhIsBoughtout: false,
  mbhDevCode: "",
  mbhShadeCode: "",
  mbhShadeName: "",
  mbhCrossSection: "",
  mbhLustureCode: "",
  mbhIsActive: true,
}

// ============================================================================
// UI Option Lists
// ============================================================================

export const ACTIVE_FILTER_OPTIONS = [
  { value: ActiveFilter.ACTIVE_FILTER_UNSPECIFIED, label: "All Status" },
  { value: ActiveFilter.ACTIVE_FILTER_ACTIVE, label: "Active" },
  { value: ActiveFilter.ACTIVE_FILTER_INACTIVE, label: "Inactive" },
]
