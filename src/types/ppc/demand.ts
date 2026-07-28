// PPC demand types.

export type {
  Demand,
  CreateDemandRequest,
  UpdateDemandRequest,
  CreateDemandResponse,
  GetDemandResponse,
  UpdateDemandResponse,
  DeleteDemandResponse,
  ListDemandsResponse,
  ConfirmDemandRequest,
  ConfirmDemandResponse,
  PullFromOrionRequest,
  PullFromOrionResponse,
  ListCarryForwardCandidatesResponse,
  ProcessCarryForwardRequest,
  ProcessCarryForwardResponse,
  CarryForwardSplit,
  ApproveMTSDemandRequest,
  ApproveMTSDemandResponse,
  MapDemandProductRequest,
  MapDemandProductResponse,
  SetStagingProductRequest,
  SetStagingProductResponse,
} from "@/types/generated/ppc/v1/demand"

export {
  CreateDemandResponse as CreateDemandResponseParser,
  GetDemandResponse as GetDemandResponseParser,
  UpdateDemandResponse as UpdateDemandResponseParser,
  DeleteDemandResponse as DeleteDemandResponseParser,
  ListDemandsResponse as ListDemandsResponseParser,
  ConfirmDemandResponse as ConfirmDemandResponseParser,
  PullFromOrionResponse as PullFromOrionResponseParser,
  ListCarryForwardCandidatesResponse as ListCarryForwardCandidatesResponseParser,
  ProcessCarryForwardResponse as ProcessCarryForwardResponseParser,
  ApproveMTSDemandResponse as ApproveMTSDemandResponseParser,
  MapDemandProductResponse as MapDemandProductResponseParser,
  SetStagingProductResponse as SetStagingProductResponseParser,
} from "@/types/generated/ppc/v1/demand"

import type { DemandType, DemandStatus } from "@/types/generated/ppc/v1/common"

export interface ListDemandsParams {
  page?: number
  pageSize?: number
  search?: string
  type?: DemandType
  status?: DemandStatus
  month?: string
  cpmProductSysId?: number
  /**
   * Hides demands that already have a plan item. Filtered server-side (a
   * client-side pass over one page would silently miss rows), and opt-in from
   * the planning context only.
   */
  withoutPlan?: boolean
  sortBy?: string
  sortOrder?: string
}
