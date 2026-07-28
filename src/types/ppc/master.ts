// PPC master-data types — re-export generated types + parsers + UI params/forms.

export type {
  MachineGroup,
  CreateMachineGroupRequest,
  UpdateMachineGroupRequest,
  CreateMachineGroupResponse,
  GetMachineGroupResponse,
  UpdateMachineGroupResponse,
  DeleteMachineGroupResponse,
  ListMachineGroupsResponse,
  Machine,
  UpdateMachineRequest,
  GetMachineResponse,
  UpdateMachineResponse,
  ListMachinesResponse,
  SyncMachinesResponse,
  LotMaster,
  LotSpec,
  CreateLotMasterRequest,
  UpdateLotMasterRequest,
  CreateLotMasterResponse,
  GetLotMasterResponse,
  UpdateLotMasterResponse,
  DeleteLotMasterResponse,
  ListLotMastersResponse,
  SyncLotsResponse,
  ProductPPCConfig,
  CreateProductPPCConfigRequest,
  UpdateProductPPCConfigRequest,
  CreateProductPPCConfigResponse,
  GetProductPPCConfigResponse,
  UpdateProductPPCConfigResponse,
  DeleteProductPPCConfigResponse,
  ListProductPPCConfigsResponse,
  ProductMachineCapacity,
  CreateProductMachineCapacityRequest,
  UpdateProductMachineCapacityRequest,
  CreateProductMachineCapacityResponse,
  GetProductMachineCapacityResponse,
  UpdateProductMachineCapacityResponse,
  DeleteProductMachineCapacityResponse,
  ListProductMachineCapacitiesResponse,
  ProductMachineParameter,
  CreateProductMachineParameterRequest,
  UpdateProductMachineParameterRequest,
  CreateProductMachineParameterResponse,
  GetProductMachineParameterResponse,
  UpdateProductMachineParameterResponse,
  DeleteProductMachineParameterResponse,
  ListProductMachineParametersResponse,
  OverrunThresholdConfig,
  CreateOverrunThresholdConfigRequest,
  UpdateOverrunThresholdConfigRequest,
  CreateOverrunThresholdConfigResponse,
  GetOverrunThresholdConfigResponse,
  UpdateOverrunThresholdConfigResponse,
  DeleteOverrunThresholdConfigResponse,
  ListOverrunThresholdConfigsResponse,
  DowntimeReasonMaster,
  CreateDowntimeReasonMasterRequest,
  UpdateDowntimeReasonMasterRequest,
  CreateDowntimeReasonMasterResponse,
  GetDowntimeReasonMasterResponse,
  UpdateDowntimeReasonMasterResponse,
  DeleteDowntimeReasonMasterResponse,
  ListDowntimeReasonMastersResponse,
  WasteCategoryMaster,
  CreateWasteCategoryMasterRequest,
  UpdateWasteCategoryMasterRequest,
  CreateWasteCategoryMasterResponse,
  GetWasteCategoryMasterResponse,
  UpdateWasteCategoryMasterResponse,
  DeleteWasteCategoryMasterResponse,
  ListWasteCategoryMastersResponse,
} from "@/types/generated/ppc/v1/master"

// SalesOrderStaging is generated in the demand proto file.
export type {
  SalesOrderStaging,
  ListSalesOrderStagingResponse,
  ListSalesOrderStagingIdsResponse,
} from "@/types/generated/ppc/v1/demand"

export {
  CreateMachineGroupResponse as CreateMachineGroupResponseParser,
  GetMachineGroupResponse as GetMachineGroupResponseParser,
  UpdateMachineGroupResponse as UpdateMachineGroupResponseParser,
  DeleteMachineGroupResponse as DeleteMachineGroupResponseParser,
  ListMachineGroupsResponse as ListMachineGroupsResponseParser,
  GetMachineResponse as GetMachineResponseParser,
  UpdateMachineResponse as UpdateMachineResponseParser,
  ListMachinesResponse as ListMachinesResponseParser,
  SyncMachinesResponse as SyncMachinesResponseParser,
  CreateLotMasterResponse as CreateLotMasterResponseParser,
  GetLotMasterResponse as GetLotMasterResponseParser,
  UpdateLotMasterResponse as UpdateLotMasterResponseParser,
  DeleteLotMasterResponse as DeleteLotMasterResponseParser,
  ListLotMastersResponse as ListLotMastersResponseParser,
  SyncLotsResponse as SyncLotsResponseParser,
  CreateProductPPCConfigResponse as CreateProductPPCConfigResponseParser,
  GetProductPPCConfigResponse as GetProductPPCConfigResponseParser,
  UpdateProductPPCConfigResponse as UpdateProductPPCConfigResponseParser,
  DeleteProductPPCConfigResponse as DeleteProductPPCConfigResponseParser,
  ListProductPPCConfigsResponse as ListProductPPCConfigsResponseParser,
  CreateProductMachineCapacityResponse as CreateProductMachineCapacityResponseParser,
  GetProductMachineCapacityResponse as GetProductMachineCapacityResponseParser,
  UpdateProductMachineCapacityResponse as UpdateProductMachineCapacityResponseParser,
  DeleteProductMachineCapacityResponse as DeleteProductMachineCapacityResponseParser,
  ListProductMachineCapacitiesResponse as ListProductMachineCapacitiesResponseParser,
  CreateProductMachineParameterResponse as CreateProductMachineParameterResponseParser,
  GetProductMachineParameterResponse as GetProductMachineParameterResponseParser,
  UpdateProductMachineParameterResponse as UpdateProductMachineParameterResponseParser,
  DeleteProductMachineParameterResponse as DeleteProductMachineParameterResponseParser,
  ListProductMachineParametersResponse as ListProductMachineParametersResponseParser,
  CreateOverrunThresholdConfigResponse as CreateOverrunThresholdConfigResponseParser,
  GetOverrunThresholdConfigResponse as GetOverrunThresholdConfigResponseParser,
  UpdateOverrunThresholdConfigResponse as UpdateOverrunThresholdConfigResponseParser,
  DeleteOverrunThresholdConfigResponse as DeleteOverrunThresholdConfigResponseParser,
  ListOverrunThresholdConfigsResponse as ListOverrunThresholdConfigsResponseParser,
  CreateDowntimeReasonMasterResponse as CreateDowntimeReasonMasterResponseParser,
  GetDowntimeReasonMasterResponse as GetDowntimeReasonMasterResponseParser,
  UpdateDowntimeReasonMasterResponse as UpdateDowntimeReasonMasterResponseParser,
  DeleteDowntimeReasonMasterResponse as DeleteDowntimeReasonMasterResponseParser,
  ListDowntimeReasonMastersResponse as ListDowntimeReasonMastersResponseParser,
  CreateWasteCategoryMasterResponse as CreateWasteCategoryMasterResponseParser,
  GetWasteCategoryMasterResponse as GetWasteCategoryMasterResponseParser,
  UpdateWasteCategoryMasterResponse as UpdateWasteCategoryMasterResponseParser,
  DeleteWasteCategoryMasterResponse as DeleteWasteCategoryMasterResponseParser,
  ListWasteCategoryMastersResponse as ListWasteCategoryMastersResponseParser,
} from "@/types/generated/ppc/v1/master"

export {
  ListSalesOrderStagingResponse as ListSalesOrderStagingResponseParser,
  ListSalesOrderStagingIdsResponse as ListSalesOrderStagingIdsResponseParser,
} from "@/types/generated/ppc/v1/demand"

// PPC lookup + shift masters (feed the generic LookupCombobox and ShiftCombobox).
export type { PpcLookup, ListPpcLookupsResponse, PpcShift, ListPpcShiftsResponse } from "@/types/generated/ppc/v1/master"
export {
  ListPpcLookupsResponse as ListPpcLookupsResponseParser,
  ListPpcShiftsResponse as ListPpcShiftsResponseParser,
} from "@/types/generated/ppc/v1/master"

import type { AreaCode, ActiveFilter, ThresholdLevel } from "@/types/generated/ppc/v1/common"

// ============================================================================
// Hook list-param types (superset of proto request minus paging noise)
// ============================================================================

export interface ListMachineGroupsParams {
  page?: number
  pageSize?: number
  search?: string
  area?: AreaCode
  sortBy?: string
  sortOrder?: string
}

export interface ListMachinesParams {
  page?: number
  pageSize?: number
  search?: string
  area?: AreaCode
  machineGroupId?: number
  activeFilter?: ActiveFilter
  sortBy?: string
  sortOrder?: string
}

/** Lot provenance markers, mirroring the chk_lot_master_source constraint. */
export const LOT_SOURCE_PPC = "PPC"
export const LOT_SOURCE_MMSMERGE = "MMSMERGE"

/** Source filter options for the lot list (empty value = no filter). */
export const LOT_SOURCE_OPTIONS = [
  { value: "", label: "All Sources" },
  { value: LOT_SOURCE_PPC, label: "PPC" },
  { value: LOT_SOURCE_MMSMERGE, label: "Oracle (MMSMERGE)" },
] as const

/**
 * Product-type filter options. The set is closed by the legacy master rather
 * than by a proto enum — MERGE_PROD_TYPE is a VARCHAR2 — so it is declared here
 * as the values PPC actually plans against, plus an "all" sentinel.
 */
export const LOT_PROD_TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "PTY", label: "PTY" },
  { value: "POY", label: "POY" },
  { value: "FOY", label: "FOY" },
] as const

export interface ListLotMastersParams {
  page?: number
  pageSize?: number
  search?: string
  itemCode?: string
  shadeCode?: string
  /** Provenance filter: LOT_SOURCE_PPC / LOT_SOURCE_MMSMERGE; empty = all. */
  source?: string
  /** MMSMERGE product type filter (PTY/POY/FOY); empty = all. */
  prodType?: string
  sortBy?: string
  sortOrder?: string
}

export interface ListProductPPCConfigsParams {
  page?: number
  pageSize?: number
  search?: string
  commodityWatchOnly?: boolean
  sortBy?: string
  sortOrder?: string
}

export interface ListProductMachineCapacitiesParams {
  page?: number
  pageSize?: number
  cpmProductSysId?: number
  machineId?: number
  sortBy?: string
  sortOrder?: string
}

export interface ListProductMachineParametersParams {
  page?: number
  pageSize?: number
  cpmProductSysId?: number
  machineId?: number
  paramId?: string
  sortBy?: string
  sortOrder?: string
}

export interface ListOverrunThresholdConfigsParams {
  page?: number
  pageSize?: number
  level?: ThresholdLevel
  activeFilter?: ActiveFilter
  sortBy?: string
  sortOrder?: string
}

export interface ListDowntimeReasonMastersParams {
  page?: number
  pageSize?: number
  search?: string
  area?: AreaCode
  activeFilter?: ActiveFilter
  sortBy?: string
  sortOrder?: string
}

export interface ListWasteCategoryMastersParams {
  page?: number
  pageSize?: number
  search?: string
  area?: AreaCode
  type?: string
  activeFilter?: ActiveFilter
  sortBy?: string
  sortOrder?: string
}

export interface ListSalesOrderStagingParams {
  page?: number
  pageSize?: number
  search?: string
  customerCode?: string
  itemCode?: string
  unpulledOnly?: boolean
  sortBy?: string
  sortOrder?: string
}

/**
 * Row-selection half of ListSalesOrderStagingParams — no paging, no sort.
 * Used by "select all matching", which wants the whole matching set.
 */
export interface ListSalesOrderStagingIdsParams {
  search?: string
  customerCode?: string
  itemCode?: string
  unpulledOnly?: boolean
}
