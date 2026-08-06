// RM Cost Types - Re-export from proto-generated types with UI helpers

export type {
  RMCost,
  RMCostRates,
  RMCostHistory,
  RMCostDetail,
  TriggerRMCostCalculationRequest,
  TriggerRMCostCalculationResponse,
  GetRMCostRequest,
  GetRMCostResponse,
  ListRMCostsRequest,
  ListRMCostsResponse,
  ListRMCostHistoryRequest,
  ListRMCostHistoryResponse,
  ListRMCostPeriodsRequest,
  ListRMCostPeriodsResponse,
  ExportRMCostsRequest,
  ExportRMCostsResponse,
  ListCostDetailsRequest,
  ListCostDetailsResponse,
  UpdateRMCostInputsRequest,
  UpdateRMCostInputsResponse,
  UpdateCostDetailFixRateRequest,
  UpdateCostDetailFixRateResponse,
} from "@/types/generated/finance/v1/rm_cost"

export {
  RMCost as RMCostParser,
  RMCostHistory as RMCostHistoryParser,
  RMCostDetail as RMCostDetailParser,
  TriggerRMCostCalculationResponse as TriggerRMCostCalculationResponseParser,
  GetRMCostResponse as GetRMCostResponseParser,
  ListRMCostsResponse as ListRMCostsResponseParser,
  ListRMCostHistoryResponse as ListRMCostHistoryResponseParser,
  ListRMCostPeriodsResponse as ListRMCostPeriodsResponseParser,
  ExportRMCostsResponse as ExportRMCostsResponseParser,
  ListCostDetailsResponse as ListCostDetailsResponseParser,
  UpdateRMCostInputsResponse as UpdateRMCostInputsResponseParser,
  UpdateCostDetailFixRateResponse as UpdateCostDetailFixRateResponseParser,
  RMCostType,
  rMCostTypeFromJSON,
  rMCostTypeToJSON,
  RMCostTriggerReason,
  rMCostTriggerReasonFromJSON,
  rMCostTriggerReasonToJSON,
} from "@/types/generated/finance/v1/rm_cost"

export type {
  BaseResponse,
  PaginationResponse,
} from "@/types/generated/common/v1/common"

import { RMCostType, RMCostTriggerReason } from "@/types/generated/finance/v1/rm_cost"

export const RM_COST_TYPE_LABELS: Record<RMCostType, string> = {
  [RMCostType.RM_COST_TYPE_UNSPECIFIED]: "—",
  [RMCostType.RM_COST_TYPE_GROUP]: "Group",
  [RMCostType.RM_COST_TYPE_ITEM]: "Item",
  [RMCostType.UNRECOGNIZED]: "—",
}

export const RM_COST_TRIGGER_REASON_LABELS: Record<RMCostTriggerReason, string> = {
  [RMCostTriggerReason.RM_COST_TRIGGER_REASON_UNSPECIFIED]: "—",
  [RMCostTriggerReason.RM_COST_TRIGGER_REASON_ORACLE_SYNC_CHAIN]: "Oracle sync",
  [RMCostTriggerReason.RM_COST_TRIGGER_REASON_GROUP_UPDATE]: "Group update",
  [RMCostTriggerReason.RM_COST_TRIGGER_REASON_DETAIL_CHANGE]: "Detail change",
  [RMCostTriggerReason.RM_COST_TRIGGER_REASON_MANUAL_UI]: "Manual",
  [RMCostTriggerReason.UNRECOGNIZED]: "—",
}

export interface ListRMCostsParams {
  page?: number
  pageSize?: number
  period?: string
  rmType?: RMCostType
  groupHeadId?: string
  search?: string
  sortBy?: string
  sortOrder?: string
}

export interface ListRMCostHistoryParams {
  page?: number
  pageSize?: number
  period?: string
  rmCode?: string
  groupHeadId?: string
  jobId?: string
}

export interface TriggerRMCostParams {
  period: string
  groupHeadId?: string
  triggerReason: RMCostTriggerReason
}

// V2 inline-edit input bag for RM Cost rows.
export interface UpdateRMCostInputsParams {
  rmCostId: string
  marketingFreightRate?: number | null
  marketingAntiDumpingPct?: number | null
  marketingDutyPct?: number | null
  marketingTransportRate?: number | null
  marketingDefaultValue?: number | null
  simulationRate?: number | null
  valuationFlag?: string // proto enum string form (RM_VALUATION_FLAG_*)
  marketingFlag?: string
  clearMarketingFreightRate?: boolean
  clearMarketingAntiDumpingPct?: boolean
  clearMarketingDutyPct?: boolean
  clearMarketingTransportRate?: boolean
  clearMarketingDefaultValue?: boolean
  clearSimulationRate?: boolean
}

export interface UpdateCostDetailFixRateParams {
  costDetailId: string
  fixRate: number | null
}
