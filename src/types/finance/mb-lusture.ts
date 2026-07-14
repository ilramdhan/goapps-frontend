// MB Lusture Types - Re-export from proto-generated types with UI helpers

// ============================================================================
// Re-export proto-generated types
// ============================================================================

// Entity and Request/Response types (as type-only exports)
export type {
  MbLusture,
  CreateMbLustureRequest,
  CreateMbLustureResponse,
  UpdateMbLustureRequest,
  UpdateMbLustureResponse,
  DeleteMbLustureRequest,
  DeleteMbLustureResponse,
  GetMbLustureRequest,
  GetMbLustureResponse,
  ListMbLustureRequest,
  ListMbLustureResponse,
  ExportMbLustureRequest,
  ExportMbLustureResponse,
  ImportMbLustureRequest,
  ImportMbLustureResponse,
  DownloadMbLustureTemplateRequest,
  DownloadMbLustureTemplateResponse,
} from "@/types/generated/finance/v1/yarn_master"

// Message functions for parsing (named exports as Parsers)
export {
  MbLusture as MbLustureParser,
  CreateMbLustureResponse as CreateMbLustureResponseParser,
  UpdateMbLustureResponse as UpdateMbLustureResponseParser,
  DeleteMbLustureResponse as DeleteMbLustureResponseParser,
  GetMbLustureResponse as GetMbLustureResponseParser,
  ListMbLustureResponse as ListMbLustureResponseParser,
  ExportMbLustureResponse as ExportMbLustureResponseParser,
  ImportMbLustureResponse as ImportMbLustureResponseParser,
  DownloadMbLustureTemplateResponse as DownloadMbLustureTemplateResponseParser,
} from "@/types/generated/finance/v1/yarn_master"

import { ActiveFilter } from "@/types/generated/finance/v1/uom"
export { ActiveFilter, activeFilterFromJSON, activeFilterToJSON } from "@/types/generated/finance/v1/uom"

// Re-export common types from proto
export type {
  BaseResponse,
  PaginationResponse,
} from "@/types/generated/common/v1/common"

// ============================================================================
// Simplified Params Types for Hooks
// ============================================================================

export interface ListMbLustureParams {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: string
  sortDir?: string
  activeFilter?: ActiveFilter
}

export interface ExportMbLustureParams {
  activeFilter?: ActiveFilter
}

// ============================================================================
// UI Option Lists
// ============================================================================

export const ACTIVE_FILTER_OPTIONS = [
  { value: ActiveFilter.ACTIVE_FILTER_UNSPECIFIED, label: "All Status" },
  { value: ActiveFilter.ACTIVE_FILTER_ACTIVE, label: "Active" },
  { value: ActiveFilter.ACTIVE_FILTER_INACTIVE, label: "Inactive" },
]

// ============================================================================
// Form Types
// ============================================================================

export interface MbLustureFormData {
  code: string
  displayName: string
  fullDescription: string
  category: string
  isActive: boolean
  displayOrder: number
}

export const DEFAULT_MB_LUSTURE_FORM_VALUES: MbLustureFormData = {
  code: "",
  displayName: "",
  fullDescription: "",
  category: "",
  isActive: true,
  displayOrder: 0,
}
