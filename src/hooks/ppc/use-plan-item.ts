"use client"

// PPC plan-item hooks — CRUD via factory + Gantt view query.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { createCrudHooks } from "@/lib/hooks"
import { apiClient, buildQueryString, ApiError } from "@/lib/api"
import type {
  PlanItem,
  CreatePlanItemRequest,
  UpdatePlanItemRequest,
} from "@/types/ppc/plan-item"
import type { ListPlanItemsParams, GanttViewParams } from "@/types/ppc/plan-item"
import { PlanItemStatus } from "@/types/ppc/common"
import {
  ListPlanItemsResponseParser,
  CreatePlanItemResponseParser,
  UpdatePlanItemResponseParser,
  DeletePlanItemResponseParser,
  GetPlanItemResponseParser,
  GetGanttViewResponseParser,
} from "@/types/ppc/plan-item"

export const {
  useList: usePlanItems,
  useGet: usePlanItem,
  useUpdate: useUpdatePlanItem,
  useDelete: useDeletePlanItem,
  queryKeys: planItemKeys,
} = createCrudHooks<PlanItem, ListPlanItemsParams, CreatePlanItemRequest, UpdatePlanItemRequest>({
  serviceScope: "ppc",
  resourceName: "plan-item",
  apiBasePath: "/api/v1/ppc/plan-items",
  parsers: {
    listResponse: (d) => ListPlanItemsResponseParser.fromJSON(d),
    createResponse: (d) => CreatePlanItemResponseParser.fromJSON(d),
    updateResponse: (d) => UpdatePlanItemResponseParser.fromJSON(d),
    deleteResponse: (d) => DeletePlanItemResponseParser.fromJSON(d),
    getResponse: (d) => GetPlanItemResponseParser.fromJSON(d),
  },
  getEntityId: (p) => String(p.planItemId),
  messages: {
    createSuccess: "Plan item created",
    updateSuccess: "Plan item updated",
    deleteSuccess: "Plan item deleted",
  },
})

function isSuccess(base?: { isSuccess?: boolean }): boolean {
  return !!base?.isSuccess
}

export function useCreatePlanItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreatePlanItemRequest) => {
      const raw = await apiClient.post<unknown>("/api/v1/ppc/plan-items", data)
      const response = CreatePlanItemResponseParser.fromJSON(raw)

      if (!isSuccess(response.base)) {
        throw new ApiError(
          response.base?.message || "Failed to create plan item",
          parseInt(response.base?.statusCode || "400", 10),
          response.base?.validationErrors || []
        )
      }

      return response
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: planItemKeys.lists() })
      toast.success("Plan item created")
      // The backend cascades the product's route upstream, so one create can
      // yield a whole chain.
      const cascaded = response.children?.length ?? 0
      if (cascaded > 0) {
        toast.success(
          cascaded === 1
            ? "1 upstream intermediate plan item was also created automatically."
            : `${cascaded} upstream intermediate plan items were also created automatically.`
        )
      }
      // A cascade that legitimately generated nothing (most often a product
      // whose route is still DRAFT) explains itself in a dedicated field, so
      // the planner never reads a bare success where several items were
      // expected. Warning, not info: this is an outcome they must act on.
      if (response.cascadeWarning) {
        toast.warning(response.cascadeWarning, { duration: 10_000 })
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create plan item")
    },
  })
}

/**
 * Confirms a DRAFT plan item, i.e. moves it into the living monthly plan.
 *
 * The transition rides on the ordinary Update RPC (there is no dedicated
 * Confirm RPC for plan items, unlike demands). Note the naming trap: the proto
 * value is PLAN_ITEM_STATUS_ACTIVE, which the backend maps to the domain string
 * "CONFIRMED" (services/ppc/internal/delivery/grpc/planning_shared.go).
 */
export function useConfirmPlanItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (planItem: PlanItem) => {
      const raw = await apiClient.put<unknown>(`/api/v1/ppc/plan-items/${planItem.planItemId}`, {
        planItemId: planItem.planItemId,
        status: PlanItemStatus.PLAN_ITEM_STATUS_ACTIVE,
        changeReason: "Confirmed from the plan list",
      } satisfies UpdatePlanItemRequest)
      const response = UpdatePlanItemResponseParser.fromJSON(raw)

      if (!isSuccess(response.base)) {
        throw new ApiError(
          response.base?.message || "Failed to confirm plan item",
          parseInt(response.base?.statusCode || "400", 10),
          response.base?.validationErrors || []
        )
      }

      return response
    },
    onSuccess: (_, planItem) => {
      queryClient.invalidateQueries({ queryKey: planItemKeys.all })
      queryClient.invalidateQueries({
        queryKey: planItemKeys.detail(String(planItem.planItemId)),
      })
      toast.success("Plan item confirmed")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to confirm plan item")
    },
  })
}

export function useGanttView(params: GanttViewParams) {
  return useQuery({
    queryKey: ["ppc", "plan-item", "gantt", JSON.stringify(params)],
    queryFn: async () => {
      const qs = buildQueryString(params as unknown as Record<string, unknown>)
      const raw = await apiClient.get<unknown>(`/api/v1/ppc/plan-items/gantt${qs}`)
      return GetGanttViewResponseParser.fromJSON(raw).data || []
    },
    enabled: !!params.month,
    staleTime: 15_000,
  })
}
