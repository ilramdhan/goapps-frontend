// PPC work-order types (v1.2 — param-per-row, route snapshot, dual approval).

export type {
  WorkOrder,
  WOParameter,
  WORmAllocation,
  WOExecution,
  WOProductionActual,
  WOPlanItemLink,
  WOParamValueInput,
  WORmAllocationInput,
  ResolvedParam,
  CreateWorkOrderRequest,
  UpdateWorkOrderRequest,
  CreateWorkOrderResponse,
  GetWorkOrderResponse,
  UpdateWorkOrderResponse,
  DeleteWorkOrderResponse,
  ListWorkOrdersResponse,
  ResolveWOParametersRequest,
  ResolveWOParametersResponse,
  SaveWOParametersRequest,
  SaveWOParametersResponse,
  SaveWORmAllocationsRequest,
  SaveWORmAllocationsResponse,
  SaveWOExecutionRequest,
  SaveWOExecutionResponse,
  ListWOExecutionsRequest,
  ListWOExecutionsResponse,
  SubmitWORequest,
  SubmitWOResponse,
  ApproveWOParameterRequest,
  ApproveWOParameterResponse,
  ApproveWORequest,
  ApproveWOResponse,
  RejectWORequest,
  RejectWOResponse,
  CreateWOReferenceRequest,
  CreateWOReferenceResponse,
  GetWOProductionActualResponse,
  AdjustWOActualRequest,
  AdjustWOActualResponse,
  SuggestWOActualRequest,
  SuggestWOActualResponse,
  ListMergeCandidatesRequest,
  ListMergeCandidatesResponse,
} from "@/types/generated/ppc/v1/work_order"

export {
  CreateWorkOrderResponse as CreateWorkOrderResponseParser,
  GetWorkOrderResponse as GetWorkOrderResponseParser,
  UpdateWorkOrderResponse as UpdateWorkOrderResponseParser,
  DeleteWorkOrderResponse as DeleteWorkOrderResponseParser,
  ListWorkOrdersResponse as ListWorkOrdersResponseParser,
  ResolveWOParametersResponse as ResolveWOParametersResponseParser,
  SaveWOParametersResponse as SaveWOParametersResponseParser,
  SaveWORmAllocationsResponse as SaveWORmAllocationsResponseParser,
  SaveWOExecutionResponse as SaveWOExecutionResponseParser,
  ListWOExecutionsResponse as ListWOExecutionsResponseParser,
  SubmitWOResponse as SubmitWOResponseParser,
  ApproveWOParameterResponse as ApproveWOParameterResponseParser,
  ApproveWOResponse as ApproveWOResponseParser,
  RejectWOResponse as RejectWOResponseParser,
  CreateWOReferenceResponse as CreateWOReferenceResponseParser,
  GetWOProductionActualResponse as GetWOProductionActualResponseParser,
  AdjustWOActualResponse as AdjustWOActualResponseParser,
  SuggestWOActualResponse as SuggestWOActualResponseParser,
  ListMergeCandidatesResponse as ListMergeCandidatesResponseParser,
} from "@/types/generated/ppc/v1/work_order"

import type { AreaCode, WOStatus } from "@/types/generated/ppc/v1/common"

export interface ListWorkOrdersParams {
  page?: number
  pageSize?: number
  search?: string
  area?: AreaCode
  status?: WOStatus
  machineId?: number
  planItemId?: number
  demandId?: number
  lotNo?: string
  sortBy?: string
  sortOrder?: string
}
