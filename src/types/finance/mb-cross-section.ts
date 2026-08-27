// MB Cross Section Types — master lookup (mst_mb_cross_section) plus the
// ORDERED (from_code -> to_code) conversion factor table
// (mst_mb_cross_section_factor).
//
// NOTE: the six valid cross-section codes are RND, TBL, OTL, SPC, PLUS and RSD.
// RSD is a legitimate sixth value — it is NEVER normalised away, remapped or
// dropped. Its long-form label has not been decided by Finance, so the UI shows
// the raw code as-is rather than inventing a descriptive name.

// ============================================================================
// Re-export proto-generated types
// ============================================================================

export type {
  MbCrossSection,
  MbCrossSectionFactor,
  CreateMbCrossSectionRequest,
  CreateMbCrossSectionResponse,
  GetMbCrossSectionRequest,
  GetMbCrossSectionResponse,
  ListMbCrossSectionRequest,
  ListMbCrossSectionResponse,
  UpdateMbCrossSectionRequest,
  UpdateMbCrossSectionResponse,
  DeleteMbCrossSectionRequest,
  DeleteMbCrossSectionResponse,
  CreateMbCrossSectionFactorRequest,
  CreateMbCrossSectionFactorResponse,
  GetMbCrossSectionFactorRequest,
  GetMbCrossSectionFactorResponse,
  ListMbCrossSectionFactorRequest,
  ListMbCrossSectionFactorResponse,
  UpdateMbCrossSectionFactorRequest,
  UpdateMbCrossSectionFactorResponse,
  DeleteMbCrossSectionFactorRequest,
  DeleteMbCrossSectionFactorResponse,
} from "@/types/generated/finance/v1/yarn_master"

export {
  MbCrossSection as MbCrossSectionParser,
  MbCrossSectionFactor as MbCrossSectionFactorParser,
  CreateMbCrossSectionResponse as CreateMbCrossSectionResponseParser,
  GetMbCrossSectionResponse as GetMbCrossSectionResponseParser,
  ListMbCrossSectionResponse as ListMbCrossSectionResponseParser,
  UpdateMbCrossSectionResponse as UpdateMbCrossSectionResponseParser,
  DeleteMbCrossSectionResponse as DeleteMbCrossSectionResponseParser,
  CreateMbCrossSectionFactorResponse as CreateMbCrossSectionFactorResponseParser,
  GetMbCrossSectionFactorResponse as GetMbCrossSectionFactorResponseParser,
  ListMbCrossSectionFactorResponse as ListMbCrossSectionFactorResponseParser,
  UpdateMbCrossSectionFactorResponse as UpdateMbCrossSectionFactorResponseParser,
  DeleteMbCrossSectionFactorResponse as DeleteMbCrossSectionFactorResponseParser,
} from "@/types/generated/finance/v1/yarn_master"

import { ActiveFilter } from "@/types/generated/finance/v1/uom"
export { ActiveFilter, activeFilterFromJSON, activeFilterToJSON } from "@/types/generated/finance/v1/uom"

export type { BaseResponse, PaginationResponse } from "@/types/generated/common/v1/common"

// ============================================================================
// Normalized (UI-facing) shapes
// ============================================================================

/** UI-facing MB cross-section master row. */
export interface NormalizedMbCrossSection {
  mbcsId: string
  code: string
  displayName: string
  description: string
  isActive: boolean
  displayOrder: number
  createdAt?: string
  updatedAt?: string
}

/** UI-facing ORDERED (from -> to) conversion factor row. */
export interface NormalizedMbCrossSectionFactor {
  mbcfId: string
  fromCode: string
  toCode: string
  factor: number
  /** MULTIPLY | DIVIDE — direction of the arithmetic, not derivable from factor. */
  operation: string
  note: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

// ============================================================================
// Raw wire shapes — the BFF may hand back camelCase (grpc-js/ts-proto) or
// snake_case (grpc-gateway JSON), so both spellings are accepted.
// ============================================================================

type RawAudit = {
  createdAt?: string
  created_at?: string
  updatedAt?: string
  updated_at?: string
}

export type RawMbCrossSection = {
  mbcsId?: string
  mbcs_id?: string
  code?: string
  displayName?: string
  display_name?: string
  description?: string
  isActive?: boolean
  is_active?: boolean
  displayOrder?: number | string
  display_order?: number | string
  audit?: RawAudit
}

export type RawMbCrossSectionFactor = {
  mbcfId?: string
  mbcf_id?: string
  fromCode?: string
  from_code?: string
  toCode?: string
  to_code?: string
  factor?: number | string
  operation?: string
  note?: string
  isActive?: boolean
  is_active?: boolean
  audit?: RawAudit
}

// ============================================================================
// Normalizers
// ============================================================================

export function normalizeMbCrossSection(raw: RawMbCrossSection): NormalizedMbCrossSection {
  return {
    mbcsId: raw.mbcsId ?? raw.mbcs_id ?? "",
    // Codes pass through verbatim — RSD included.
    code: raw.code ?? "",
    displayName: raw.displayName ?? raw.display_name ?? "",
    description: raw.description ?? "",
    isActive: raw.isActive ?? raw.is_active ?? true,
    displayOrder: Number(raw.displayOrder ?? raw.display_order ?? 0),
    createdAt: raw.audit?.createdAt ?? raw.audit?.created_at,
    updatedAt: raw.audit?.updatedAt ?? raw.audit?.updated_at,
  }
}

export function normalizeMbCrossSectionFactor(
  raw: RawMbCrossSectionFactor
): NormalizedMbCrossSectionFactor {
  return {
    mbcfId: raw.mbcfId ?? raw.mbcf_id ?? "",
    fromCode: raw.fromCode ?? raw.from_code ?? "",
    toCode: raw.toCode ?? raw.to_code ?? "",
    factor: Number(raw.factor ?? 0),
    operation: raw.operation ?? "",
    note: raw.note ?? "",
    isActive: raw.isActive ?? raw.is_active ?? true,
    createdAt: raw.audit?.createdAt ?? raw.audit?.created_at,
    updatedAt: raw.audit?.updatedAt ?? raw.audit?.updated_at,
  }
}

// ============================================================================
// List params
// ============================================================================

export interface ListMbCrossSectionParams {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: string
  sortDir?: string
  activeFilter?: ActiveFilter
}

export interface ListMbCrossSectionFactorParams extends ListMbCrossSectionParams {
  /** Optional exact filter on the source cross-section code. */
  fromCode?: string
  /** Optional exact filter on the target cross-section code. */
  toCode?: string
}

// ============================================================================
// UI Option Lists
// ============================================================================

export const ACTIVE_FILTER_OPTIONS = [
  { value: ActiveFilter.ACTIVE_FILTER_UNSPECIFIED, label: "All Status" },
  { value: ActiveFilter.ACTIVE_FILTER_ACTIVE, label: "Active" },
  { value: ActiveFilter.ACTIVE_FILTER_INACTIVE, label: "Inactive" },
]

export const MB_CROSS_SECTION_OPERATION_OPTIONS = [
  { value: "MULTIPLY", label: "Multiply" },
  { value: "DIVIDE", label: "Divide" },
]

/**
 * The six cross-section codes currently recognised by Finance.
 * Offered as combobox suggestions only — the master table remains the source of
 * truth and free-text entry is still allowed. RSD has no agreed long name yet,
 * so no descriptive label is invented for any entry here.
 */
export const MB_CROSS_SECTION_KNOWN_CODES = ["RND", "TBL", "OTL", "SPC", "PLUS", "RSD"] as const

// ============================================================================
// Form Types
// ============================================================================

export interface MbCrossSectionFormData {
  code: string
  displayName: string
  description: string
  isActive: boolean
  displayOrder: number
}

export const DEFAULT_MB_CROSS_SECTION_FORM_VALUES: MbCrossSectionFormData = {
  code: "",
  displayName: "",
  description: "",
  isActive: true,
  displayOrder: 0,
}

export interface MbCrossSectionFactorFormData {
  fromCode: string
  toCode: string
  factor: number
  operation: string
  note: string
  isActive: boolean
}

export const DEFAULT_MB_CROSS_SECTION_FACTOR_FORM_VALUES: MbCrossSectionFactorFormData = {
  fromCode: "",
  toCode: "",
  factor: 1,
  operation: "MULTIPLY",
  note: "",
  isActive: true,
}
