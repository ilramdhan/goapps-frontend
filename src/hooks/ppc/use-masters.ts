"use client"

// PPC master-data CRUD hooks (machine-group, lot, product-ppc-config,
// product-machine-capacity, product-machine-parameter, overrun-threshold,
// downtime-reason, waste-category). Machine + SO-staging are read-shaped and
// live in use-machine.ts / use-sales-order-staging.ts.

import { createCrudHooks } from "@/lib/hooks"
import type {
  MachineGroup,
  CreateMachineGroupRequest,
  UpdateMachineGroupRequest,
  ListMachineGroupsParams,
  LotMaster,
  CreateLotMasterRequest,
  UpdateLotMasterRequest,
  ListLotMastersParams,
  ProductPPCConfig,
  CreateProductPPCConfigRequest,
  UpdateProductPPCConfigRequest,
  ListProductPPCConfigsParams,
  ProductMachineCapacity,
  CreateProductMachineCapacityRequest,
  UpdateProductMachineCapacityRequest,
  ListProductMachineCapacitiesParams,
  ProductMachineParameter,
  CreateProductMachineParameterRequest,
  UpdateProductMachineParameterRequest,
  ListProductMachineParametersParams,
  OverrunThresholdConfig,
  CreateOverrunThresholdConfigRequest,
  UpdateOverrunThresholdConfigRequest,
  ListOverrunThresholdConfigsParams,
  DowntimeReasonMaster,
  CreateDowntimeReasonMasterRequest,
  UpdateDowntimeReasonMasterRequest,
  ListDowntimeReasonMastersParams,
  WasteCategoryMaster,
  CreateWasteCategoryMasterRequest,
  UpdateWasteCategoryMasterRequest,
  ListWasteCategoryMastersParams,
} from "@/types/ppc/master"
import {
  ListMachineGroupsResponseParser,
  CreateMachineGroupResponseParser,
  UpdateMachineGroupResponseParser,
  DeleteMachineGroupResponseParser,
  GetMachineGroupResponseParser,
  ListLotMastersResponseParser,
  CreateLotMasterResponseParser,
  UpdateLotMasterResponseParser,
  DeleteLotMasterResponseParser,
  GetLotMasterResponseParser,
  ListProductPPCConfigsResponseParser,
  CreateProductPPCConfigResponseParser,
  UpdateProductPPCConfigResponseParser,
  DeleteProductPPCConfigResponseParser,
  GetProductPPCConfigResponseParser,
  ListProductMachineCapacitiesResponseParser,
  CreateProductMachineCapacityResponseParser,
  UpdateProductMachineCapacityResponseParser,
  DeleteProductMachineCapacityResponseParser,
  GetProductMachineCapacityResponseParser,
  ListProductMachineParametersResponseParser,
  CreateProductMachineParameterResponseParser,
  UpdateProductMachineParameterResponseParser,
  DeleteProductMachineParameterResponseParser,
  GetProductMachineParameterResponseParser,
  ListOverrunThresholdConfigsResponseParser,
  CreateOverrunThresholdConfigResponseParser,
  UpdateOverrunThresholdConfigResponseParser,
  DeleteOverrunThresholdConfigResponseParser,
  GetOverrunThresholdConfigResponseParser,
  ListDowntimeReasonMastersResponseParser,
  CreateDowntimeReasonMasterResponseParser,
  UpdateDowntimeReasonMasterResponseParser,
  DeleteDowntimeReasonMasterResponseParser,
  GetDowntimeReasonMasterResponseParser,
  ListWasteCategoryMastersResponseParser,
  CreateWasteCategoryMasterResponseParser,
  UpdateWasteCategoryMasterResponseParser,
  DeleteWasteCategoryMasterResponseParser,
  GetWasteCategoryMasterResponseParser,
} from "@/types/ppc/master"

// ---------------------------------------------------------------------------
// Machine Group
// ---------------------------------------------------------------------------
export const {
  useList: useMachineGroups,
  useGet: useMachineGroup,
  useCreate: useCreateMachineGroup,
  useUpdate: useUpdateMachineGroup,
  useDelete: useDeleteMachineGroup,
  queryKeys: machineGroupKeys,
} = createCrudHooks<MachineGroup, ListMachineGroupsParams, CreateMachineGroupRequest, UpdateMachineGroupRequest>({
  serviceScope: "ppc",
  resourceName: "machine-group",
  apiBasePath: "/api/v1/ppc/machine-groups",
  parsers: {
    listResponse: (d) => ListMachineGroupsResponseParser.fromJSON(d),
    createResponse: (d) => CreateMachineGroupResponseParser.fromJSON(d),
    updateResponse: (d) => UpdateMachineGroupResponseParser.fromJSON(d),
    deleteResponse: (d) => DeleteMachineGroupResponseParser.fromJSON(d),
    getResponse: (d) => GetMachineGroupResponseParser.fromJSON(d),
  },
  getEntityId: (g) => String(g.groupId),
  messages: {
    createSuccess: "Machine group created",
    updateSuccess: "Machine group updated",
    deleteSuccess: "Machine group deleted",
  },
})

// ---------------------------------------------------------------------------
// Lot Master
// ---------------------------------------------------------------------------
export const {
  useList: useLotMasters,
  useGet: useLotMaster,
  useCreate: useCreateLotMaster,
  useUpdate: useUpdateLotMaster,
  useDelete: useDeleteLotMaster,
  queryKeys: lotMasterKeys,
} = createCrudHooks<LotMaster, ListLotMastersParams, CreateLotMasterRequest, UpdateLotMasterRequest>({
  serviceScope: "ppc",
  resourceName: "lot-master",
  apiBasePath: "/api/v1/ppc/lots",
  parsers: {
    listResponse: (d) => ListLotMastersResponseParser.fromJSON(d),
    createResponse: (d) => CreateLotMasterResponseParser.fromJSON(d),
    updateResponse: (d) => UpdateLotMasterResponseParser.fromJSON(d),
    deleteResponse: (d) => DeleteLotMasterResponseParser.fromJSON(d),
    getResponse: (d) => GetLotMasterResponseParser.fromJSON(d),
  },
  getEntityId: (l) => l.lotNo,
  messages: {
    createSuccess: "Lot created",
    updateSuccess: "Lot updated",
    deleteSuccess: "Lot deleted",
  },
})

// ---------------------------------------------------------------------------
// Product PPC Config
// ---------------------------------------------------------------------------
export const {
  useList: useProductPPCConfigs,
  useGet: useProductPPCConfig,
  useCreate: useCreateProductPPCConfig,
  useUpdate: useUpdateProductPPCConfig,
  useDelete: useDeleteProductPPCConfig,
  queryKeys: productPPCConfigKeys,
} = createCrudHooks<
  ProductPPCConfig,
  ListProductPPCConfigsParams,
  CreateProductPPCConfigRequest,
  UpdateProductPPCConfigRequest
>({
  serviceScope: "ppc",
  resourceName: "product-ppc-config",
  apiBasePath: "/api/v1/ppc/product-configs",
  parsers: {
    listResponse: (d) => ListProductPPCConfigsResponseParser.fromJSON(d),
    createResponse: (d) => CreateProductPPCConfigResponseParser.fromJSON(d),
    updateResponse: (d) => UpdateProductPPCConfigResponseParser.fromJSON(d),
    deleteResponse: (d) => DeleteProductPPCConfigResponseParser.fromJSON(d),
    getResponse: (d) => GetProductPPCConfigResponseParser.fromJSON(d),
  },
  getEntityId: (c) => String(c.configId),
  messages: {
    createSuccess: "Product config created",
    updateSuccess: "Product config updated",
    deleteSuccess: "Product config deleted",
  },
})

// ---------------------------------------------------------------------------
// Product Machine Capacity
// ---------------------------------------------------------------------------
export const {
  useList: useProductMachineCapacities,
  useGet: useProductMachineCapacity,
  useCreate: useCreateProductMachineCapacity,
  useUpdate: useUpdateProductMachineCapacity,
  useDelete: useDeleteProductMachineCapacity,
  queryKeys: productMachineCapacityKeys,
} = createCrudHooks<
  ProductMachineCapacity,
  ListProductMachineCapacitiesParams,
  CreateProductMachineCapacityRequest,
  UpdateProductMachineCapacityRequest
>({
  serviceScope: "ppc",
  resourceName: "product-machine-capacity",
  apiBasePath: "/api/v1/ppc/product-machine-capacities",
  parsers: {
    listResponse: (d) => ListProductMachineCapacitiesResponseParser.fromJSON(d),
    createResponse: (d) => CreateProductMachineCapacityResponseParser.fromJSON(d),
    updateResponse: (d) => UpdateProductMachineCapacityResponseParser.fromJSON(d),
    deleteResponse: (d) => DeleteProductMachineCapacityResponseParser.fromJSON(d),
    getResponse: (d) => GetProductMachineCapacityResponseParser.fromJSON(d),
  },
  getEntityId: (c) => String(c.capacityId),
  messages: {
    createSuccess: "Capacity created",
    updateSuccess: "Capacity updated",
    deleteSuccess: "Capacity deleted",
  },
})

// ---------------------------------------------------------------------------
// Product Machine Parameter
// ---------------------------------------------------------------------------
export const {
  useList: useProductMachineParameters,
  useGet: useProductMachineParameter,
  useCreate: useCreateProductMachineParameter,
  useUpdate: useUpdateProductMachineParameter,
  useDelete: useDeleteProductMachineParameter,
  queryKeys: productMachineParameterKeys,
} = createCrudHooks<
  ProductMachineParameter,
  ListProductMachineParametersParams,
  CreateProductMachineParameterRequest,
  UpdateProductMachineParameterRequest
>({
  serviceScope: "ppc",
  resourceName: "product-machine-parameter",
  apiBasePath: "/api/v1/ppc/product-machine-parameters",
  parsers: {
    listResponse: (d) => ListProductMachineParametersResponseParser.fromJSON(d),
    createResponse: (d) => CreateProductMachineParameterResponseParser.fromJSON(d),
    updateResponse: (d) => UpdateProductMachineParameterResponseParser.fromJSON(d),
    deleteResponse: (d) => DeleteProductMachineParameterResponseParser.fromJSON(d),
    getResponse: (d) => GetProductMachineParameterResponseParser.fromJSON(d),
  },
  getEntityId: (p) => String(p.pmpId),
  messages: {
    createSuccess: "Parameter created",
    updateSuccess: "Parameter updated",
    deleteSuccess: "Parameter deleted",
  },
})

// ---------------------------------------------------------------------------
// Overrun Threshold Config
// ---------------------------------------------------------------------------
export const {
  useList: useOverrunThresholds,
  useGet: useOverrunThreshold,
  useCreate: useCreateOverrunThreshold,
  useUpdate: useUpdateOverrunThreshold,
  useDelete: useDeleteOverrunThreshold,
  queryKeys: overrunThresholdKeys,
} = createCrudHooks<
  OverrunThresholdConfig,
  ListOverrunThresholdConfigsParams,
  CreateOverrunThresholdConfigRequest,
  UpdateOverrunThresholdConfigRequest
>({
  serviceScope: "ppc",
  resourceName: "overrun-threshold",
  apiBasePath: "/api/v1/ppc/overrun-thresholds",
  parsers: {
    listResponse: (d) => ListOverrunThresholdConfigsResponseParser.fromJSON(d),
    createResponse: (d) => CreateOverrunThresholdConfigResponseParser.fromJSON(d),
    updateResponse: (d) => UpdateOverrunThresholdConfigResponseParser.fromJSON(d),
    deleteResponse: (d) => DeleteOverrunThresholdConfigResponseParser.fromJSON(d),
    getResponse: (d) => GetOverrunThresholdConfigResponseParser.fromJSON(d),
  },
  getEntityId: (t) => String(t.thresholdId),
  messages: {
    createSuccess: "Threshold created",
    updateSuccess: "Threshold updated",
    deleteSuccess: "Threshold deleted",
  },
})

// ---------------------------------------------------------------------------
// Downtime Reason Master
// ---------------------------------------------------------------------------
export const {
  useList: useDowntimeReasons,
  useGet: useDowntimeReason,
  useCreate: useCreateDowntimeReason,
  useUpdate: useUpdateDowntimeReason,
  useDelete: useDeleteDowntimeReason,
  queryKeys: downtimeReasonKeys,
} = createCrudHooks<
  DowntimeReasonMaster,
  ListDowntimeReasonMastersParams,
  CreateDowntimeReasonMasterRequest,
  UpdateDowntimeReasonMasterRequest
>({
  serviceScope: "ppc",
  resourceName: "downtime-reason",
  apiBasePath: "/api/v1/ppc/downtime-reasons",
  parsers: {
    listResponse: (d) => ListDowntimeReasonMastersResponseParser.fromJSON(d),
    createResponse: (d) => CreateDowntimeReasonMasterResponseParser.fromJSON(d),
    updateResponse: (d) => UpdateDowntimeReasonMasterResponseParser.fromJSON(d),
    deleteResponse: (d) => DeleteDowntimeReasonMasterResponseParser.fromJSON(d),
    getResponse: (d) => GetDowntimeReasonMasterResponseParser.fromJSON(d),
  },
  getEntityId: (r) => String(r.reasonId),
  messages: {
    createSuccess: "Downtime reason created",
    updateSuccess: "Downtime reason updated",
    deleteSuccess: "Downtime reason deleted",
  },
})

// ---------------------------------------------------------------------------
// Waste Category Master
// ---------------------------------------------------------------------------
export const {
  useList: useWasteCategories,
  useGet: useWasteCategory,
  useCreate: useCreateWasteCategory,
  useUpdate: useUpdateWasteCategory,
  useDelete: useDeleteWasteCategory,
  queryKeys: wasteCategoryKeys,
} = createCrudHooks<
  WasteCategoryMaster,
  ListWasteCategoryMastersParams,
  CreateWasteCategoryMasterRequest,
  UpdateWasteCategoryMasterRequest
>({
  serviceScope: "ppc",
  resourceName: "waste-category",
  apiBasePath: "/api/v1/ppc/waste-categories",
  parsers: {
    listResponse: (d) => ListWasteCategoryMastersResponseParser.fromJSON(d),
    createResponse: (d) => CreateWasteCategoryMasterResponseParser.fromJSON(d),
    updateResponse: (d) => UpdateWasteCategoryMasterResponseParser.fromJSON(d),
    deleteResponse: (d) => DeleteWasteCategoryMasterResponseParser.fromJSON(d),
    getResponse: (d) => GetWasteCategoryMasterResponseParser.fromJSON(d),
  },
  getEntityId: (w) => String(w.categoryId),
  messages: {
    createSuccess: "Waste category created",
    updateSuccess: "Waste category updated",
    deleteSuccess: "Waste category deleted",
  },
})
