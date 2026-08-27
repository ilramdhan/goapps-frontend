// Shade Types - Re-export from proto-generated types with UI helpers
//
// Shade (cost_erp_shade) is normally sync-sourced from Oracle
// (MGTDAT.OM_GRADE_CODE_2 via SyncShades) but also supports a manual-CRUD
// escape hatch (shadeSource === "MANUAL") for shades Orion doesn't carry yet.
// There is no hard-delete RPC — DeactivateShade only flips isActive to false.

// ============================================================================
// Re-export proto-generated types
// ============================================================================

// Enums (shared with UOM — same finance.v1 package)
export {
  ActiveFilter,
  activeFilterFromJSON,
  activeFilterToJSON,
} from "@/types/generated/finance/v1/uom"

// Entity and Request/Response types (as type-only exports)
export type {
  Shade,
  CreateShadeRequest,
  CreateShadeResponse,
  GetShadeRequest,
  GetShadeResponse,
  UpdateShadeRequest,
  UpdateShadeResponse,
  DeactivateShadeRequest,
  DeactivateShadeResponse,
  ListShadesRequest,
  ListShadesResponse,
  SyncShadesRequest,
  SyncShadesResponse,
} from "@/types/generated/finance/v1/shade"

// Message functions for parsing (named exports as Parsers)
export {
  Shade as ShadeParser,
  CreateShadeResponse as CreateShadeResponseParser,
  GetShadeResponse as GetShadeResponseParser,
  UpdateShadeResponse as UpdateShadeResponseParser,
  DeactivateShadeResponse as DeactivateShadeResponseParser,
  ListShadesResponse as ListShadesResponseParser,
  SyncShadesResponse as SyncShadesResponseParser,
} from "@/types/generated/finance/v1/shade"

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

/**
 * Simplified list params for hooks (uses numeric enums from proto)
 */
export interface ListShadesParams {
  page?: number
  pageSize?: number
  search?: string
  activeFilter?: ActiveFilter
  /** Provenance filter: "" (both) | "ORACLE" | "MANUAL" */
  sourceFilter?: string
  sortBy?: string
  sortOrder?: string
}

// ============================================================================
// UI Display Labels
// ============================================================================

/**
 * Active filter options for select inputs
 */
export const ACTIVE_FILTER_OPTIONS = [
  { value: ActiveFilter.ACTIVE_FILTER_UNSPECIFIED, label: "All Status" },
  { value: ActiveFilter.ACTIVE_FILTER_ACTIVE, label: "Active" },
  { value: ActiveFilter.ACTIVE_FILTER_INACTIVE, label: "Inactive" },
]

/**
 * Provenance filter options for select inputs — matches ListShadesRequest.source_filter's
 * allowed string enum ("", "ORACLE", "MANUAL") from shade.proto.
 */
export const SOURCE_FILTER_OPTIONS = [
  { value: "", label: "All Sources" },
  { value: "ORACLE", label: "Oracle (Synced)" },
  { value: "MANUAL", label: "Manual" },
]

/**
 * Sort field options — matches ListShadesRequest.sort_by's allowed string enum
 * from shade.proto.
 */
export const SORT_BY_OPTIONS = [
  { value: "code", label: "Code" },
  { value: "name", label: "Name" },
  { value: "short_name", label: "Short Name" },
  { value: "is_active", label: "Status" },
  { value: "source", label: "Source" },
  { value: "synced_at", label: "Last Synced" },
  { value: "created_at", label: "Created At" },
]

// ============================================================================
// Form Types
// ============================================================================

/**
 * Form data for Shade create/edit forms.
 * shadeCode is immutable after creation (natural key used by Oracle sync upsert).
 */
export interface ShadeFormData {
  shadeCode: string
  shadeName: string
  shadeShortName: string
  isActive: boolean
}

/**
 * Default form values for creating a new Shade
 */
export const DEFAULT_SHADE_FORM_VALUES: ShadeFormData = {
  shadeCode: "",
  shadeName: "",
  shadeShortName: "",
  isActive: true,
}
