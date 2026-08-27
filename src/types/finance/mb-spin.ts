// MBSpin Types - Re-export from proto-generated types with UI helpers

// ============================================================================
// Re-export proto-generated types
// ============================================================================

// Entity and Request/Response types (as type-only exports)
export type {
  MBSpin,
  CreateMBSpinRequest,
  CreateMBSpinResponse,
  GetMBSpinRequest,
  GetMBSpinResponse,
  UpdateMBSpinRequest,
  UpdateMBSpinResponse,
  DeleteMBSpinRequest,
  DeleteMBSpinResponse,
  ListMBSpinsRequest,
  ListMBSpinsResponse,
  ExportMBSpinsRequest,
  ExportMBSpinsResponse,
  ImportMBSpinsRequest,
  ImportMBSpinsResponse,
  DownloadMBSpinTemplateRequest,
  DownloadMBSpinTemplateResponse,
} from "@/types/generated/finance/v1/yarn_master"

// Message functions for parsing (named exports as Parsers)
export {
  MBSpin as MBSpinParser,
  CreateMBSpinResponse as CreateMBSpinResponseParser,
  GetMBSpinResponse as GetMBSpinResponseParser,
  UpdateMBSpinResponse as UpdateMBSpinResponseParser,
  DeleteMBSpinResponse as DeleteMBSpinResponseParser,
  ListMBSpinsResponse as ListMBSpinsResponseParser,
  ExportMBSpinsResponse as ExportMBSpinsResponseParser,
  ImportMBSpinsResponse as ImportMBSpinsResponseParser,
  DownloadMBSpinTemplateResponse as DownloadMBSpinTemplateResponseParser,
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

export interface ListMBSpinsParams {
  page?: number
  pageSize?: number
  search?: string
  // ⭐ DIPERBARUI 2026-08-22 (P11 E1) — widened from `number` to `string | number`.
  // mbh_id is a UUID; the BFF route already reads this param as a string
  // (`searchParams.get("mbhId") || ""`), so `number` was never the wire shape.
  // Widening, not replacing — existing numeric callers still type-check.
  mbhId?: string | number
  activeFilter?: ActiveFilter
  sortBy?: string
  sortOrder?: string
}

export interface ExportMBSpinsParams {
  mbhId?: number
  activeFilter?: ActiveFilter
}

// ============================================================================
// Form Types
// ============================================================================

export interface MBSpinFormData {
  mbhId: number
  mbsCode: string
  mbsName: string
  description: string
  isActive: boolean
}

export const DEFAULT_MB_SPIN_FORM_VALUES: MBSpinFormData = {
  mbhId: 0,
  mbsCode: "",
  mbsName: "",
  description: "",
  isActive: true,
}

// ============================================================================
// UI Options
// ============================================================================

export const ACTIVE_FILTER_OPTIONS = [
  { value: ActiveFilter.ACTIVE_FILTER_UNSPECIFIED, label: "All Status" },
  { value: ActiveFilter.ACTIVE_FILTER_ACTIVE, label: "Active" },
  { value: ActiveFilter.ACTIVE_FILTER_INACTIVE, label: "Inactive" },
]
