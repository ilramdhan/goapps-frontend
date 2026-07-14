// MB Push Log Types - Re-export from proto-generated types with UI helpers

// ============================================================================
// Re-export proto-generated types
// ============================================================================

// Entity and Request/Response types (as type-only exports)
export type {
  MbPushLog,
  PreviewPushToHeadRequest,
  PreviewPushToHeadResponse,
  PushableMbHead,
  SkippedMbHead,
  ExecutePushToHeadRequest,
  ExecutePushToHeadResponse,
  ListMbPushLogsRequest,
  ListMbPushLogsResponse,
} from "@/types/generated/finance/v1/yarn_master"

// Message functions for parsing (named exports as Parsers)
export {
  MbPushLog as MbPushLogParser,
  PreviewPushToHeadResponse as PreviewPushToHeadResponseParser,
  ExecutePushToHeadResponse as ExecutePushToHeadResponseParser,
  ListMbPushLogsResponse as ListMbPushLogsResponseParser,
} from "@/types/generated/finance/v1/yarn_master"

// Re-export common types from proto
export type {
  BaseResponse,
  PaginationResponse,
} from "@/types/generated/common/v1/common"

// ============================================================================
// Simplified Params Types for Hooks
// ============================================================================

export interface PreviewPushToHeadParams {
  period: string
}

export interface ExecutePushToHeadParams {
  period: string
  mbHeadIds: string[]
}

export interface ListMbPushLogsParams {
  page?: number
  pageSize?: number
  period?: string
}
