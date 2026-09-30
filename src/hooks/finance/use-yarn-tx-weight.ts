"use client"

// Yarn TX Weight group hooks - TanStack Query hooks for the shared TX weight config CRUD

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  listYarnTxWeightGroups,
  getYarnTxWeightGroup,
  createYarnTxWeightGroup,
  updateYarnTxWeightGroup,
  deleteYarnTxWeightGroup,
} from "@/services/finance/yarn-tx-weight-api"
import type { ListYarnTxWeightGroupsParams, YarnTxWeightGroupFormData } from "@/types/finance/yarn-tx-weight"

export const yarnTxWeightGroupKeys = {
  all: ["finance", "yarn-tx-weight-group"] as const,
  lists: () => [...yarnTxWeightGroupKeys.all, "list"] as const,
  list: (params: ListYarnTxWeightGroupsParams) => [...yarnTxWeightGroupKeys.lists(), params] as const,
  details: () => [...yarnTxWeightGroupKeys.all, "detail"] as const,
  detail: (id: string) => [...yarnTxWeightGroupKeys.details(), id] as const,
}

export function useYarnTxWeightGroups(params: ListYarnTxWeightGroupsParams = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: yarnTxWeightGroupKeys.list(params),
    queryFn: () => listYarnTxWeightGroups(params),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: options.enabled ?? true,
  })
}

export function useYarnTxWeightGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: yarnTxWeightGroupKeys.detail(groupId ?? ""),
    queryFn: () => getYarnTxWeightGroup(groupId as string),
    enabled: !!groupId,
  })
}

export function useCreateYarnTxWeightGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: YarnTxWeightGroupFormData) => createYarnTxWeightGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: yarnTxWeightGroupKeys.all })
      toast.success("TX weight config created successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create TX weight config")
    },
  })
}

export function useUpdateYarnTxWeightGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, data }: { groupId: string; data: YarnTxWeightGroupFormData }) =>
      updateYarnTxWeightGroup(groupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: yarnTxWeightGroupKeys.all })
      toast.success("TX weight config updated successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update TX weight config")
    },
  })
}

export function useDeleteYarnTxWeightGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (groupId: string) => deleteYarnTxWeightGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: yarnTxWeightGroupKeys.all })
      toast.success("TX weight config deleted successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete TX weight config")
    },
  })
}
