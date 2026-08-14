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
} from "@/types/generated/finance/v1/yarn_master"

// Child shade types (header shade is #1; children are seq 2 and 3)
export type {
  MBHeadShade,
  MBHeadShadeInput,
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
  ImportMBHeadsResponse as ImportMBHeadsResponseParser,
  DownloadMBHeadTemplateResponse as DownloadMBHeadTemplateResponseParser,
  SubmitMBHeadResponse as SubmitMBHeadResponseParser,
  ApproveMBHeadResponse as ApproveMBHeadResponseParser,
  ValidateMBHeadResponse as ValidateMBHeadResponseParser,
  UnApproveMBHeadResponse as UnApproveMBHeadResponseParser,
  RevokeMBHeadResponse as RevokeMBHeadResponseParser,
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
}

export interface ExportMBHeadsParams {
  activeFilter?: ActiveFilter
}

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

// ============================================================================
// Raw / Normalized Types + Normalizers
// ============================================================================
//
// The API is not guaranteed to return a single casing consistently, so the raw
// shapes below tolerate BOTH camelCase and snake_case keys.

/** Raw child shade row as it may arrive from the API. */
export interface RawMBHeadShade {
  mbhsId?: string
  mbhs_id?: string
  mbhsSeqNo?: number | string
  mbhs_seq_no?: number | string
  mbhsShadeCode?: string
  mbhs_shade_code?: string
  mbhsShadeName?: string
  mbhs_shade_name?: string
}

/** Raw MB Head subset covering the fields added by this feature. */
export interface RawMBHeadExtras {
  mbhVsNumber?: string
  mbh_vs_number?: string
  mbhNoOfProcess?: string
  mbh_no_of_process?: string
  shades?: RawMBHeadShade[]
}

/** Normalized child shade. `seqNo` is 2 or 3 — the header shade is #1. */
export interface NormalizedMBHeadShade {
  id: string
  seqNo: number
  shadeCode: string
  shadeName: string
}

/** Normalized MB Head fields added by this feature. */
export interface NormalizedMBHeadExtras {
  mbhVsNumber: string
  mbhNoOfProcess: string
  shades: NormalizedMBHeadShade[]
}

/** Maximum number of child shades beyond the header shade. */
export const MAX_MB_HEAD_CHILD_SHADES = 2

export function normalizeMBHeadShade(raw: RawMBHeadShade): NormalizedMBHeadShade {
  return {
    id: raw.mbhsId ?? raw.mbhs_id ?? "",
    seqNo: Number(raw.mbhsSeqNo ?? raw.mbhs_seq_no ?? 0),
    shadeCode: raw.mbhsShadeCode ?? raw.mbhs_shade_code ?? "",
    shadeName: raw.mbhsShadeName ?? raw.mbhs_shade_name ?? "",
  }
}

export function normalizeMBHeadShades(raw: RawMBHeadShade[] | undefined): NormalizedMBHeadShade[] {
  return (raw ?? []).map(normalizeMBHeadShade).sort((a, b) => a.seqNo - b.seqNo)
}

export function normalizeMBHeadExtras(raw: RawMBHeadExtras): NormalizedMBHeadExtras {
  return {
    mbhVsNumber: raw.mbhVsNumber ?? raw.mbh_vs_number ?? "",
    mbhNoOfProcess: raw.mbhNoOfProcess ?? raw.mbh_no_of_process ?? "",
    shades: normalizeMBHeadShades(raw.shades),
  }
}

// ============================================================================
// Form Types
// ============================================================================

// Create-only field — immutable after creation, so it is excluded from
// UpdateMBHeadRequest and must not appear in an edit form.
/** One editable child shade row in the form (seqNo 2 or 3). */
export interface MBHeadShadeFormData {
  mbhsSeqNo: number
  mbhsShadeCode: string
  mbhsShadeName: string
}

export interface MBHeadFormData {
  mbhMbCosting: string
  mbhOracleSysId: string
  mbhMgtName: string
  mbhDenier: number | null
  mbhFilament: number | null
  mbhDozing: number | null
  mbhCheckStatus: string
  mbhStatus: string
  mbhLdrPrsn: number | null
  mbhFinalProduct: string
  mbhCode: string
  mbhIsBoughtout: boolean
  mbhDevCode: string
  mbhShadeCode: string
  mbhShadeName: string
  mbhCrossSection: string
  mbhLustureCode: string
  mbhMachineId: string
  mbhVsNumber: string
  mbhNoOfProcess: string
  shades: MBHeadShadeFormData[]
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
  mbhFinalProduct: "",
  mbhCode: "",
  mbhIsBoughtout: false,
  mbhDevCode: "",
  mbhShadeCode: "",
  mbhShadeName: "",
  mbhCrossSection: "",
  mbhLustureCode: "",
  mbhMachineId: "",
  mbhVsNumber: "",
  mbhNoOfProcess: "",
  shades: [],
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
