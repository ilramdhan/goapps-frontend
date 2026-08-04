// PPC plan-item + Gantt types.

export type {
  PlanItem,
  CreatePlanItemRequest,
  UpdatePlanItemRequest,
  CreatePlanItemResponse,
  GetPlanItemResponse,
  UpdatePlanItemResponse,
  DeletePlanItemResponse,
  ListPlanItemsResponse,
  GanttBar,
  GetGanttViewRequest,
  GetGanttViewResponse,
  PlanCarryCandidate,
  ListPlanCarryForwardCandidatesResponse,
  ProcessPlanCarryForwardRequest,
  ProcessPlanCarryForwardResponse,
} from "@/types/generated/ppc/v1/plan_item"

export {
  CreatePlanItemResponse as CreatePlanItemResponseParser,
  GetPlanItemResponse as GetPlanItemResponseParser,
  UpdatePlanItemResponse as UpdatePlanItemResponseParser,
  DeletePlanItemResponse as DeletePlanItemResponseParser,
  ListPlanItemsResponse as ListPlanItemsResponseParser,
  GetGanttViewResponse as GetGanttViewResponseParser,
  ListPlanCarryForwardCandidatesResponse as ListPlanCarryForwardCandidatesResponseParser,
  ProcessPlanCarryForwardResponse as ProcessPlanCarryForwardResponseParser,
} from "@/types/generated/ppc/v1/plan_item"

import type { PlanItemType, PlanItemStatus, AreaCode } from "@/types/generated/ppc/v1/common"

export interface ListPlanItemsParams {
  page?: number
  pageSize?: number
  search?: string
  month?: string
  type?: PlanItemType
  status?: PlanItemStatus
  machineGroupId?: number
  demandId?: number
  sortBy?: string
  sortOrder?: string
}

export interface GanttViewParams {
  month: string
  area?: AreaCode
  machineGroupId?: number
  fromDate?: string
  toDate?: string
}
