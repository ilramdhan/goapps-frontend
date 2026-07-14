// MB Workflow Log Types - Re-export from proto-generated types with UI helpers

// ============================================================================
// Re-export proto-generated types
// ============================================================================

// Entity and Request/Response types (as type-only exports)
export type {
  MbWorkflowLog,
  ListMbWorkflowLogsRequest,
  ListMbWorkflowLogsResponse,
} from "@/types/generated/finance/v1/yarn_master"

// Message functions for parsing (named exports as Parsers)
export {
  MbWorkflowLog as MbWorkflowLogParser,
  ListMbWorkflowLogsResponse as ListMbWorkflowLogsResponseParser,
} from "@/types/generated/finance/v1/yarn_master"

// Re-export common types from proto
export type {
  BaseResponse,
} from "@/types/generated/common/v1/common"

// ============================================================================
// Simplified Params Types for Hooks
// ============================================================================

export interface ListMbWorkflowLogsParams {
  mbhId: string
}
