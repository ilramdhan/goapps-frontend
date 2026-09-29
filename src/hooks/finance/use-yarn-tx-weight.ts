"use client"

// Yarn TX Weight Hooks - TanStack Query hooks for TX weight master CRUD

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  listYarnTxWeights,
  getYarnTxWeight,
  createYarnTxWeight,
  updateYarnTxWeight,
  deleteYarnTxWeight,
} from "@/services/finance/yarn-tx-weight-api"
import type { ListYarnTxWeightParams, YarnTxWeightFormData } from "@/types/finance/yarn-tx-weight"

export const yarnTxWeightKeys = {
  all: ["finance", "yarn-tx-weight"] as const,
  lists: () => [...yarnTxWeightKeys.all, "list"] as const,
  list: (params: ListYarnTxWeightParams) => [...yarnTxWeightKeys.lists(), JSON.stringify(params)] as const,
  details: () => [...yarnTxWeightKeys.all, "detail"] as const,
  detail: (id: string) => [...yarnTxWeightKeys.details(), id] as const,
}

export function useYarnTxWeights(params: ListYarnTxWeightParams = {}) {
  return useQuery({
    queryKey: yarnTxWeightKeys.list(params),
    queryFn: () => listYarnTxWeights(params),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

export function useYarnTxWeight(id: string | undefined) {
  return useQuery({
    queryKey: yarnTxWeightKeys.detail(id ?? ""),
    queryFn: () => getYarnTxWeight(id as string),
    enabled: !!id,
  })
}

export function useCreateYarnTxWeight() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: YarnTxWeightFormData) => createYarnTxWeight(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: yarnTxWeightKeys.all })
      toast.success("TX weight rule created successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create TX weight rule")
    },
  })
}

export function useUpdateYarnTxWeight() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Pick<YarnTxWeightFormData, "mode" | "value" | "description"> }) =>
      updateYarnTxWeight(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: yarnTxWeightKeys.all })
      toast.success("TX weight rule updated successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update TX weight rule")
    },
  })
}

export function useDeleteYarnTxWeight() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteYarnTxWeight(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: yarnTxWeightKeys.all })
      toast.success("TX weight rule deleted successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete TX weight rule")
    },
  })
}
