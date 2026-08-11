"use client"

// Spin Fixed Cost Hooks - TanStack Query hooks for Spin Fixed Cost operations

import { createCrudHooks } from "@/lib/hooks"
import {
  type SpinFixedCost,
  type CreateSpinFixedCostRequest,
  type UpdateSpinFixedCostRequest,
  type ListSpinFixedCostsParams,
  type ListSpinFixedCostsResponse,
  type CreateSpinFixedCostResponse,
  type UpdateSpinFixedCostResponse,
  type DeleteSpinFixedCostResponse,
  type GetSpinFixedCostResponse,
  ListSpinFixedCostsResponseParser,
  CreateSpinFixedCostResponseParser,
  UpdateSpinFixedCostResponseParser,
  DeleteSpinFixedCostResponseParser,
  GetSpinFixedCostResponseParser,
} from "@/types/finance/spin-fixed-cost"

// ============================================================================
// Create CRUD hooks using factory
// ============================================================================
//
// Note: backend error messages (e.g. "period already exists", or the refusal to
// delete/deactivate the last pool row) are surfaced verbatim - createCrudHooks
// throws an ApiError carrying base.message and toasts error.message.

const {
  useList: useSpinFixedCosts,
  useGet: useSpinFixedCost,
  useCreate: useCreateSpinFixedCost,
  useUpdate: useUpdateSpinFixedCost,
  useDelete: useDeleteSpinFixedCost,
  queryKeys: spinFixedCostKeys,
} = createCrudHooks<
  SpinFixedCost,
  ListSpinFixedCostsParams,
  CreateSpinFixedCostRequest,
  UpdateSpinFixedCostRequest,
  ListSpinFixedCostsResponse,
  CreateSpinFixedCostResponse,
  UpdateSpinFixedCostResponse,
  DeleteSpinFixedCostResponse,
  GetSpinFixedCostResponse
>({
  serviceScope: "finance",
  resourceName: "spin-fixed-cost",
  apiBasePath: "/api/v1/finance/spin-fixed-costs",
  parsers: {
    listResponse: (data) => ListSpinFixedCostsResponseParser.fromJSON(data),
    createResponse: (data) => CreateSpinFixedCostResponseParser.fromJSON(data),
    updateResponse: (data) => UpdateSpinFixedCostResponseParser.fromJSON(data),
    deleteResponse: (data) => DeleteSpinFixedCostResponseParser.fromJSON(data),
    getResponse: (data) => GetSpinFixedCostResponseParser.fromJSON(data),
  },
  getEntityId: (spinFixedCost) => spinFixedCost.id,
  messages: {
    createSuccess: "Spin Fixed Cost created successfully",
    updateSuccess: "Spin Fixed Cost updated successfully",
    deleteSuccess: "Spin Fixed Cost deleted successfully",
  },
})

export {
  useSpinFixedCosts,
  useSpinFixedCost,
  useCreateSpinFixedCost,
  useUpdateSpinFixedCost,
  useDeleteSpinFixedCost,
  spinFixedCostKeys,
}
