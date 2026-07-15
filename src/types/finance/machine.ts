// Machine Types - Re-export from proto-generated types with UI helpers

// ============================================================================
// Re-export proto-generated types
// ============================================================================

// Entity and Request/Response types (as type-only exports)
export type {
  Machine,
  CreateMachineRequest,
  CreateMachineResponse,
  GetMachineRequest,
  GetMachineResponse,
  UpdateMachineRequest,
  UpdateMachineResponse,
  DeleteMachineRequest,
  DeleteMachineResponse,
  ListMachinesRequest,
  ListMachinesResponse,
  ExportMachinesRequest,
  ExportMachinesResponse,
  ImportMachinesRequest,
  ImportMachinesResponse,
  DownloadMachineTemplateRequest,
  DownloadMachineTemplateResponse,
} from "@/types/generated/finance/v1/yarn_master"

// Message functions for parsing (named exports as Parsers)
export {
  Machine as MachineParser,
  CreateMachineResponse as CreateMachineResponseParser,
  GetMachineResponse as GetMachineResponseParser,
  UpdateMachineResponse as UpdateMachineResponseParser,
  DeleteMachineResponse as DeleteMachineResponseParser,
  ListMachinesResponse as ListMachinesResponseParser,
  ExportMachinesResponse as ExportMachinesResponseParser,
  ImportMachinesResponse as ImportMachinesResponseParser,
  DownloadMachineTemplateResponse as DownloadMachineTemplateResponseParser,
} from "@/types/generated/finance/v1/yarn_master"

// Re-export shared enums/types from UOM (same package)
export {
  ActiveFilter,
  activeFilterFromJSON,
  activeFilterToJSON,
} from "@/types/generated/finance/v1/uom"

// Re-export shared import types
export type {
  ImportError,
} from "@/types/generated/finance/v1/uom"

// Re-export DuplicateAction from uom types
export type { DuplicateAction } from "@/types/finance/uom"

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

export interface ListMachinesParams {
  page?: number
  pageSize?: number
  search?: string
  activeFilter?: ActiveFilter
  sortBy?: string
  sortOrder?: string
  mcTypeFilter?: string
}

export interface ExportMachinesParams {
  activeFilter?: ActiveFilter
}

// ============================================================================
// Active Filter Options
// ============================================================================

export const ACTIVE_FILTER_OPTIONS = [
  { value: ActiveFilter.ACTIVE_FILTER_UNSPECIFIED, label: "All Status" },
  { value: ActiveFilter.ACTIVE_FILTER_ACTIVE, label: "Active" },
  { value: ActiveFilter.ACTIVE_FILTER_INACTIVE, label: "Inactive" },
]

// ============================================================================
// Form Types
// ============================================================================

export interface MachineFormData {
  machineCode: string
  machineName: string
  description: string
  isActive: boolean
}

export const DEFAULT_MACHINE_FORM_VALUES: MachineFormData = {
  machineCode: "",
  machineName: "",
  description: "",
  isActive: true,
}
