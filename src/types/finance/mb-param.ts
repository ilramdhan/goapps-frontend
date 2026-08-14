// MB Param Types - Re-export from proto-generated types with UI helpers

// ============================================================================
// Re-export proto-generated types
// ============================================================================

// Entity and Request/Response types (as type-only exports)
export type {
  MbParam,
  MbParamOption,
  CreateMbParamRequest,
  CreateMbParamResponse,
  UpdateMbParamRequest,
  UpdateMbParamResponse,
  DeleteMbParamRequest,
  DeleteMbParamResponse,
  ListMbParamsRequest,
  ListMbParamsResponse,
  CreateMbParamOptionRequest,
  CreateMbParamOptionResponse,
  UpdateMbParamOptionRequest,
  UpdateMbParamOptionResponse,
  DeleteMbParamOptionRequest,
  DeleteMbParamOptionResponse,
  ExportMbParamsRequest,
  ExportMbParamsResponse,
  ImportMbParamsRequest,
  ImportMbParamsResponse,
  DownloadMbParamTemplateRequest,
  DownloadMbParamTemplateResponse,
} from "@/types/generated/finance/v1/yarn_master"

// Message functions for parsing (named exports as Parsers)
export {
  MbParam as MbParamParser,
  MbParamOption as MbParamOptionParser,
  CreateMbParamResponse as CreateMbParamResponseParser,
  UpdateMbParamResponse as UpdateMbParamResponseParser,
  DeleteMbParamResponse as DeleteMbParamResponseParser,
  ListMbParamsResponse as ListMbParamsResponseParser,
  CreateMbParamOptionResponse as CreateMbParamOptionResponseParser,
  UpdateMbParamOptionResponse as UpdateMbParamOptionResponseParser,
  DeleteMbParamOptionResponse as DeleteMbParamOptionResponseParser,
  ExportMbParamsResponse as ExportMbParamsResponseParser,
  ImportMbParamsResponse as ImportMbParamsResponseParser,
  DownloadMbParamTemplateResponse as DownloadMbParamTemplateResponseParser,
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

export interface ListMbParamsParams {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: string
  sortDir?: string
  activeFilter?: ActiveFilter
}

export interface ExportMbParamParams {
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
// UI Option Lists
// ============================================================================

/** `mst_mb_param.code` of the picklist backing the MB Head "No of Process" dropdown. */
export const MB_PARAM_CODE_NO_OF_PROCESS = "NO_OF_PROCESS"

export const MB_PARAM_TYPE_OPTIONS = [
  { value: "SCALAR", label: "Scalar" },
  { value: "PICKLIST", label: "Picklist" },
]

// ============================================================================
// Form Types
// ============================================================================

export interface MbParamFormData {
  code: string
  name: string
  description: string
  type: string
  defaultValue: string
  defaultOption: string
  unit: string
  displayOrder: number
  isActive: boolean
}

export const DEFAULT_MB_PARAM_FORM_VALUES: MbParamFormData = {
  code: "",
  name: "",
  description: "",
  type: "SCALAR",
  defaultValue: "",
  defaultOption: "",
  unit: "",
  displayOrder: 0,
  isActive: true,
}

export interface MbParamOptionFormData {
  mbpCode: string
  code: string
  numericValue: string
  description: string
  displayOrder: number
  isActive: boolean
}

export const DEFAULT_MB_PARAM_OPTION_FORM_VALUES: MbParamOptionFormData = {
  mbpCode: "",
  code: "",
  numericValue: "",
  description: "",
  displayOrder: 0,
  isActive: true,
}
