// MB Composition Types - Re-export from proto-generated types with UI helpers

// ============================================================================
// Re-export proto-generated types
// ============================================================================

// Entity and Request/Response types (as type-only exports)
export type {
  MbComposition,
  MbCompositionVersion,
  CreateMbCompositionRequest,
  CreateMbCompositionResponse,
  UpdateMbCompositionRequest,
  UpdateMbCompositionResponse,
  DeleteMbCompositionRequest,
  DeleteMbCompositionResponse,
  ListMbCompositionsRequest,
  ListMbCompositionsResponse,
  ListMbCompositionVersionsRequest,
  ListMbCompositionVersionsResponse,
} from "@/types/generated/finance/v1/yarn_master"

// Message functions for parsing (named exports as Parsers)
export {
  MbComposition as MbCompositionParser,
  MbCompositionVersion as MbCompositionVersionParser,
  CreateMbCompositionResponse as CreateMbCompositionResponseParser,
  UpdateMbCompositionResponse as UpdateMbCompositionResponseParser,
  DeleteMbCompositionResponse as DeleteMbCompositionResponseParser,
  ListMbCompositionsResponse as ListMbCompositionsResponseParser,
  ListMbCompositionVersionsResponse as ListMbCompositionVersionsResponseParser,
} from "@/types/generated/finance/v1/yarn_master"

// Re-export common types from proto
export type {
  BaseResponse,
} from "@/types/generated/common/v1/common"

// ============================================================================
// Simplified Params Types for Hooks
// ============================================================================

export interface ListMbCompositionsParams {
  mbhId: string
}

export interface ListMbCompositionVersionsParams {
  mbhId: string
  version?: number
}

// ============================================================================
// UI Option Lists
// ============================================================================

export const MB_COMPOSITION_SOURCE_TYPE_OPTIONS = [
  { value: "GROUP", label: "RM Group" },
  { value: "MB", label: "MB Reference" },
  { value: "CARRIER", label: "Carrier" },
]

// ============================================================================
// Form Types
// ============================================================================

export interface MbCompositionFormData {
  mbhId: string
  seqNo: number
  groupHeadId: string
  compositionPct: string
  sourceType: string
  mbRefMbhId: string
  isCarrier: boolean
}

export const DEFAULT_MB_COMPOSITION_FORM_VALUES: MbCompositionFormData = {
  mbhId: "",
  seqNo: 0,
  groupHeadId: "",
  compositionPct: "",
  sourceType: "GROUP",
  mbRefMbhId: "",
  isCarrier: false,
}
