// Parameter Types - Re-export from proto-generated types with UI helpers

// ============================================================================
// Re-export proto-generated types
// ============================================================================

// Enums
export {
  DataType,
  ParamCategory,
  dataTypeFromJSON,
  dataTypeToJSON,
  paramCategoryFromJSON,
  paramCategoryToJSON,
} from "@/types/generated/finance/v1/parameter"

// Entity and Request/Response types (as type-only exports)
export type {
  Parameter,
  CreateParameterRequest,
  CreateParameterResponse,
  GetParameterRequest,
  GetParameterResponse,
  UpdateParameterRequest,
  UpdateParameterResponse,
  DeleteParameterRequest,
  DeleteParameterResponse,
  ListParametersRequest,
  ListParametersResponse,
  ExportParametersRequest,
  ExportParametersResponse,
  ImportParametersRequest,
  ImportParametersResponse,
  DownloadParameterTemplateRequest,
  DownloadParameterTemplateResponse,
} from "@/types/generated/finance/v1/parameter"

// Message functions for parsing (named exports as Parsers)
export {
  Parameter as ParameterParser,
  CreateParameterResponse as CreateParameterResponseParser,
  GetParameterResponse as GetParameterResponseParser,
  UpdateParameterResponse as UpdateParameterResponseParser,
  DeleteParameterResponse as DeleteParameterResponseParser,
  ListParametersResponse as ListParametersResponseParser,
  ExportParametersResponse as ExportParametersResponseParser,
  ImportParametersResponse as ImportParametersResponseParser,
  DownloadParameterTemplateResponse as DownloadParameterTemplateResponseParser,
} from "@/types/generated/finance/v1/parameter"

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
import { DataType, ParamCategory } from "@/types/generated/finance/v1/parameter"

// ============================================================================
// UI Display Labels
// ============================================================================

/**
 * Data type display labels for UI
 */
export const DATA_TYPE_LABELS: Record<DataType, string> = {
  [DataType.DATA_TYPE_UNSPECIFIED]: "All Data Types",
  [DataType.DATA_TYPE_NUMBER]: "Number",
  [DataType.DATA_TYPE_TEXT]: "Text",
  [DataType.DATA_TYPE_BOOLEAN]: "Boolean",
  [DataType.UNRECOGNIZED]: "Unknown",
}

/**
 * Param category display labels for UI
 */
export const PARAM_CATEGORY_LABELS: Record<ParamCategory, string> = {
  [ParamCategory.PARAM_CATEGORY_UNSPECIFIED]: "All Categories",
  [ParamCategory.PARAM_CATEGORY_INPUT]: "Input",
  [ParamCategory.PARAM_CATEGORY_RATE]: "Rate",
  [ParamCategory.PARAM_CATEGORY_CALCULATED]: "Calculated",
  [ParamCategory.PARAM_CATEGORY_MASTER_LOOKUP]: "Master Lookup",
  [ParamCategory.UNRECOGNIZED]: "Unknown",
}

/**
 * Data type options for filter select inputs
 */
export const DATA_TYPE_OPTIONS = [
  { value: DataType.DATA_TYPE_UNSPECIFIED, label: "All Data Types" },
  { value: DataType.DATA_TYPE_NUMBER, label: "Number" },
  { value: DataType.DATA_TYPE_TEXT, label: "Text" },
  { value: DataType.DATA_TYPE_BOOLEAN, label: "Boolean" },
]

/**
 * Data type options for create/edit forms (excludes UNSPECIFIED)
 */
export const DATA_TYPE_FORM_OPTIONS = DATA_TYPE_OPTIONS.filter(
  (opt) => opt.value !== DataType.DATA_TYPE_UNSPECIFIED
)

/**
 * Param category options for filter select inputs
 */
export const PARAM_CATEGORY_OPTIONS = [
  { value: ParamCategory.PARAM_CATEGORY_UNSPECIFIED, label: "All Categories" },
  { value: ParamCategory.PARAM_CATEGORY_INPUT, label: "Input" },
  { value: ParamCategory.PARAM_CATEGORY_RATE, label: "Rate" },
  { value: ParamCategory.PARAM_CATEGORY_CALCULATED, label: "Calculated" },
  { value: ParamCategory.PARAM_CATEGORY_MASTER_LOOKUP, label: "Master Lookup" },
]

/**
 * Param category options for create/edit forms (excludes UNSPECIFIED)
 */
export const PARAM_CATEGORY_FORM_OPTIONS = PARAM_CATEGORY_OPTIONS.filter(
  (opt) => opt.value !== ParamCategory.PARAM_CATEGORY_UNSPECIFIED
)

// ============================================================================
// Simplified Params Types for Hooks
// ============================================================================

/**
 * Simplified list params for hooks (uses numeric enums from proto)
 */
export interface ListParametersParams {
  page?: number
  pageSize?: number
  search?: string
  dataType?: DataType
  paramCategory?: ParamCategory
  activeFilter?: ActiveFilter
  sortBy?: string
  sortOrder?: string
}

/**
 * Simplified export params for hooks
 */
export interface ExportParametersParams {
  dataType?: DataType
  paramCategory?: ParamCategory
  activeFilter?: ActiveFilter
}


// ============================================================================
// Form Types
// ============================================================================

/**
 * Form data for Parameter create/edit forms
 */
export interface ParameterFormData {
  paramCode: string
  paramName: string
  paramShortName: string
  dataType: DataType
  paramCategory: ParamCategory
  uomId: string
  defaultValue: string
  minValue: string
  maxValue: string
  isActive: boolean
  // Phase B costing metadata
  ownerDepartment: string
  isRequiredForCosting: boolean
  isPeriodDependent: boolean
  lookupMasterCode: string
  displayOrder: number
  displayGroup: string
  notes: string
  // Approval review drawer visibility (edit-only; UpdateParameterRequest field)
  isApprovalVisible: boolean
  approvalDisplayOrder: number
}

/**
 * Default form values for creating a new Parameter
 */
export const DEFAULT_PARAMETER_FORM_VALUES: ParameterFormData = {
  paramCode: "",
  paramName: "",
  paramShortName: "",
  dataType: DataType.DATA_TYPE_NUMBER,
  paramCategory: ParamCategory.PARAM_CATEGORY_INPUT,
  uomId: "",
  defaultValue: "",
  minValue: "",
  maxValue: "",
  isActive: true,
  ownerDepartment: "",
  isRequiredForCosting: false,
  isPeriodDependent: false,
  lookupMasterCode: "",
  displayOrder: 0,
  displayGroup: "",
  notes: "",
  isApprovalVisible: false,
  approvalDisplayOrder: 0,
}

/**
 * Owner department options.
 */
export const OWNER_DEPARTMENT_OPTIONS = [
  { value: "", label: "—" },
  { value: "Engineering", label: "Engineering" },
  { value: "Production", label: "Production" },
  { value: "Finance", label: "Finance" },
  { value: "RND", label: "R&D" },
]
