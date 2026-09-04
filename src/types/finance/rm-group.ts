// RM Group Types - Re-export from proto-generated types with UI helpers

export type {
  RMGroupHead,
  RMGroupDetail,
  RMGroupHeadWithDetails,
  UngroupedItem,
  SkippedItem,
  CreateRMGroupRequest,
  CreateRMGroupResponse,
  GetRMGroupRequest,
  GetRMGroupResponse,
  UpdateRMGroupRequest,
  UpdateRMGroupResponse,
  DeleteRMGroupRequest,
  DeleteRMGroupResponse,
  ListRMGroupsRequest,
  ListRMGroupsResponse,
  AddItemsRequest,
  AddItemsResponse,
  RemoveItemsRequest,
  RemoveItemsResponse,
  ListUngroupedItemsRequest,
  ListUngroupedItemsResponse,
  RMGroupItemRates,
  GetRMGroupItemRatesRequest,
  GetRMGroupItemRatesResponse,
  ExportRMGroupsRequest,
  ExportRMGroupsResponse,
  ExportUngroupedItemsRequest,
  ExportUngroupedItemsResponse,
  ImportGroupItemsRequest,
  ImportGroupItemsResponse,
  DownloadGroupItemsTemplateRequest,
  DownloadGroupItemsTemplateResponse,
  ImportRMGroupsRequest,
  ImportRMGroupsResponse,
  DownloadRMGroupTemplateRequest,
  DownloadRMGroupTemplateResponse,
  AddItemSelection,
  UpdateGroupItemRequest,
  UpdateGroupItemResponse,
} from "@/types/generated/finance/v1/rm_group"

export {
  RMGroupHead as RMGroupHeadParser,
  RMGroupDetail as RMGroupDetailParser,
  RMGroupHeadWithDetails as RMGroupHeadWithDetailsParser,
  CreateRMGroupResponse as CreateRMGroupResponseParser,
  GetRMGroupResponse as GetRMGroupResponseParser,
  UpdateRMGroupResponse as UpdateRMGroupResponseParser,
  DeleteRMGroupResponse as DeleteRMGroupResponseParser,
  ListRMGroupsResponse as ListRMGroupsResponseParser,
  AddItemsResponse as AddItemsResponseParser,
  RemoveItemsResponse as RemoveItemsResponseParser,
  ListUngroupedItemsResponse as ListUngroupedItemsResponseParser,
  GetRMGroupItemRatesResponse as GetRMGroupItemRatesResponseParser,
  ExportRMGroupsResponse as ExportRMGroupsResponseParser,
  ExportUngroupedItemsResponse as ExportUngroupedItemsResponseParser,
  ImportGroupItemsResponse as ImportGroupItemsResponseParser,
  DownloadGroupItemsTemplateResponse as DownloadGroupItemsTemplateResponseParser,
  ImportRMGroupsResponse as ImportRMGroupsResponseParser,
  DownloadRMGroupTemplateResponse as DownloadRMGroupTemplateResponseParser,
  RMGroupFlag,
  rMGroupFlagFromJSON,
  rMGroupFlagToJSON,
  RMValuationFlag,
  rMValuationFlagFromJSON,
  rMValuationFlagToJSON,
  RMMarketingFlag,
  rMMarketingFlagFromJSON,
  rMMarketingFlagToJSON,
  UpdateGroupItemResponse as UpdateGroupItemResponseParser,
} from "@/types/generated/finance/v1/rm_group"

export {
  ActiveFilter,
  activeFilterFromJSON,
  activeFilterToJSON,
} from "@/types/generated/finance/v1/uom"

export type {
  BaseResponse,
  PaginationResponse,
} from "@/types/generated/common/v1/common"

import { ActiveFilter } from "@/types/generated/finance/v1/uom"
import {
  RMGroupFlag,
  RMValuationFlag,
  RMMarketingFlag,
} from "@/types/generated/finance/v1/rm_group"

// UI Labels for flags
export const RM_GROUP_FLAG_LABELS: Record<RMGroupFlag, string> = {
  [RMGroupFlag.RM_GROUP_FLAG_UNSPECIFIED]: "—",
  [RMGroupFlag.RM_GROUP_FLAG_INIT]: "INIT",
  [RMGroupFlag.RM_GROUP_FLAG_CONS]: "CONS",
  [RMGroupFlag.RM_GROUP_FLAG_STORES]: "STORES",
  [RMGroupFlag.RM_GROUP_FLAG_DEPT]: "DEPT",
  [RMGroupFlag.RM_GROUP_FLAG_PO_1]: "PO_1",
  [RMGroupFlag.RM_GROUP_FLAG_PO_2]: "PO_2",
  [RMGroupFlag.RM_GROUP_FLAG_PO_3]: "PO_3",
  [RMGroupFlag.UNRECOGNIZED]: "—",
}

export const RM_GROUP_FLAG_OPTIONS: Array<{ value: RMGroupFlag; label: string }> = [
  { value: RMGroupFlag.RM_GROUP_FLAG_CONS, label: "CONS" },
  { value: RMGroupFlag.RM_GROUP_FLAG_STORES, label: "STORES" },
  { value: RMGroupFlag.RM_GROUP_FLAG_DEPT, label: "DEPT" },
  { value: RMGroupFlag.RM_GROUP_FLAG_PO_1, label: "PO_1" },
  { value: RMGroupFlag.RM_GROUP_FLAG_PO_2, label: "PO_2" },
  { value: RMGroupFlag.RM_GROUP_FLAG_PO_3, label: "PO_3" },
  { value: RMGroupFlag.RM_GROUP_FLAG_INIT, label: "INIT" },
]

// Simplified list params
export interface ListRMGroupsParams {
  page?: number
  pageSize?: number
  search?: string
  activeFilter?: ActiveFilter
  sortBy?: string
  sortOrder?: string
}

/** Grouping monitor scope. UNGROUPED = items not in any active group;
 *  GROUPED = items currently assigned to an active group. */
export type GroupingScope = "ungrouped" | "grouped"

/** Allowed sort columns for the grouping monitor. group_*, sort_order and
 *  assigned_at apply only to scope=grouped. */
export type GroupingSortBy =
  | "item_code"
  | "item_name"
  | "grade_code"
  | "item_grade"
  | "uom_code"
  | "group_code"
  | "group_name"
  | "sort_order"
  | "assigned_at"

export interface ListUngroupedItemsParams {
  page?: number
  pageSize?: number
  search?: string
  scope?: GroupingScope
  sortBy?: GroupingSortBy | string
  sortOrder?: "asc" | "desc" | string
}

export interface ExportUngroupedItemsParams {
  search?: string
  scope?: GroupingScope
  sortBy?: GroupingSortBy | string
  sortOrder?: "asc" | "desc" | string
}

export interface ExportRMGroupsParams {
  activeFilter?: ActiveFilter
  /** Free-text search across code/name/description (Filtered mode). */
  search?: string
  /** Explicit group_head_id list (Selected mode). When non-empty overrides
   *  activeFilter and search at the backend. Sent as `group_head_ids` query
   *  param (comma-separated UUIDs). */
  groupHeadIds?: string[]
}

// Form data for group head create/edit
export interface RMGroupFormData {
  groupCode: string
  groupName: string
  description: string
  colourant: string
  ciName: string
  costPercentage: number
  costPerKg: number
  flagValuation: RMGroupFlag
  flagMarketing: RMGroupFlag
  flagSimulation: RMGroupFlag
  initValValuation: number | null
  initValMarketing: number | null
  initValSimulation: number | null
  isActive: boolean
}

export const DEFAULT_RM_GROUP_FORM_VALUES: RMGroupFormData = {
  groupCode: "",
  groupName: "",
  description: "",
  colourant: "",
  ciName: "",
  costPercentage: 0,
  costPerKg: 0,
  flagValuation: RMGroupFlag.RM_GROUP_FLAG_CONS,
  flagMarketing: RMGroupFlag.RM_GROUP_FLAG_CONS,
  flagSimulation: RMGroupFlag.RM_GROUP_FLAG_CONS,
  initValValuation: null,
  initValMarketing: null,
  initValSimulation: null,
  isActive: true,
}

// =============================================================================
// V2 helpers — Marketing flag, Valuation flag, V2 form data
// =============================================================================

export const RM_VALUATION_FLAG_LABELS: Record<RMValuationFlag, string> = {
  [RMValuationFlag.RM_VALUATION_FLAG_UNSPECIFIED]: "AUTO",
  [RMValuationFlag.RM_VALUATION_FLAG_CR]: "CR (Consumption Rate)",
  [RMValuationFlag.RM_VALUATION_FLAG_SR]: "SR (Stock Rate)",
  [RMValuationFlag.RM_VALUATION_FLAG_PR]: "PR (PO Rate)",
  [RMValuationFlag.RM_VALUATION_FLAG_CL]: "CL (Consumption Landed)",
  [RMValuationFlag.RM_VALUATION_FLAG_SL]: "SL (Stock Landed)",
  [RMValuationFlag.RM_VALUATION_FLAG_FL]: "FL (Fix Landed)",
  [RMValuationFlag.RM_VALUATION_FLAG_NONE]: "NONE (no source)",
  [RMValuationFlag.UNRECOGNIZED]: "AUTO",
}

// RM_VALUATION_FLAG_NONE is engine-written only (AUTO cascade found no price
// source) — it is never a user-selectable option, so it is intentionally
// excluded from this dropdown list.
export const RM_VALUATION_FLAG_OPTIONS: Array<{ value: RMValuationFlag; label: string }> = [
  { value: RMValuationFlag.RM_VALUATION_FLAG_UNSPECIFIED, label: "AUTO (CL → SL → FL → PR)" },
  { value: RMValuationFlag.RM_VALUATION_FLAG_CR, label: "CR (Consumption Rate)" },
  { value: RMValuationFlag.RM_VALUATION_FLAG_SR, label: "SR (Stock Rate)" },
  { value: RMValuationFlag.RM_VALUATION_FLAG_PR, label: "PR (PO Rate)" },
  { value: RMValuationFlag.RM_VALUATION_FLAG_CL, label: "CL (Consumption Landed)" },
  { value: RMValuationFlag.RM_VALUATION_FLAG_SL, label: "SL (Stock Landed)" },
  { value: RMValuationFlag.RM_VALUATION_FLAG_FL, label: "FL (Fix Landed)" },
]

export const RM_MARKETING_FLAG_LABELS: Record<RMMarketingFlag, string> = {
  [RMMarketingFlag.RM_MARKETING_FLAG_UNSPECIFIED]: "AUTO",
  [RMMarketingFlag.RM_MARKETING_FLAG_SP]: "SP (Projection Stock)",
  [RMMarketingFlag.RM_MARKETING_FLAG_PP]: "PP (Projection PO)",
  [RMMarketingFlag.RM_MARKETING_FLAG_FP]: "FP (Projection Fix)",
  [RMMarketingFlag.RM_MARKETING_FLAG_NONE]: "NONE (no projection)",
  [RMMarketingFlag.UNRECOGNIZED]: "AUTO",
}

// RM_MARKETING_FLAG_NONE is engine-written only (AUTO cascade found no
// marketing projection source) — it is never a user-selectable option, so it
// is intentionally excluded from this dropdown list.
export const RM_MARKETING_FLAG_OPTIONS: Array<{ value: RMMarketingFlag; label: string }> = [
  { value: RMMarketingFlag.RM_MARKETING_FLAG_UNSPECIFIED, label: "AUTO (SP → PP → FP)" },
  { value: RMMarketingFlag.RM_MARKETING_FLAG_SP, label: "SP (Projection Stock)" },
  { value: RMMarketingFlag.RM_MARKETING_FLAG_PP, label: "PP (Projection PO)" },
  { value: RMMarketingFlag.RM_MARKETING_FLAG_FP, label: "FP (Projection Fix)" },
]

// V2 form fields for the group head form (alongside V1 form data above).
export interface RMGroupV2FormData {
  marketingFreightRate: number | null
  marketingAntiDumpingPct: number | null
  marketingDefaultValue: number | null
  valuationFlag: RMValuationFlag
  marketingFlag: RMMarketingFlag
}

export const DEFAULT_RM_GROUP_V2_FORM_VALUES: RMGroupV2FormData = {
  marketingFreightRate: null,
  marketingAntiDumpingPct: null,
  marketingDefaultValue: null,
  valuationFlag: RMValuationFlag.RM_VALUATION_FLAG_UNSPECIFIED,
  marketingFlag: RMMarketingFlag.RM_MARKETING_FLAG_UNSPECIFIED,
}

// V2 valuation inputs at the per-detail level (one bag per item-grade).
export interface RMGroupDetailV2FormData {
  valuationFreightRate: number | null
  valuationAntiDumpingPct: number | null
  valuationDutyPct: number | null
  valuationTransportRate: number | null
  valuationDefaultValue: number | null
}

export const DEFAULT_RM_GROUP_DETAIL_V2_FORM_VALUES: RMGroupDetailV2FormData = {
  valuationFreightRate: null,
  valuationAntiDumpingPct: null,
  valuationDutyPct: null,
  valuationTransportRate: null,
  valuationDefaultValue: null,
}
