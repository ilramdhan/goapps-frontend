"use client"

// MB Composition Hooks - TanStack Query hooks for MB composition line + version operations

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  listMbCompositions,
  listMbCompositionVersions,
  createMbComposition,
  updateMbComposition,
  deleteMbComposition,
} from "@/services/finance/mb-composition-api"
import type { MbCompositionFormData } from "@/types/finance/mb-composition"

const mbCompositionKeys = {
  all: ["finance", "mb-composition"] as const,
  list: (mbhId: string) => [...mbCompositionKeys.all, "list", mbhId] as const,
  versions: (mbhId: string, version?: number) =>
    [...mbCompositionKeys.all, "versions", mbhId, version ?? 0] as const,
}

export function useMbCompositions(mbhId: string) {
  return useQuery({
    queryKey: mbCompositionKeys.list(mbhId),
    queryFn: () => listMbCompositions({ mbhId }),
    enabled: !!mbhId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

export function useMbCompositionVersions(mbhId: string, version?: number) {
  return useQuery({
    queryKey: mbCompositionKeys.versions(mbhId, version),
    queryFn: () => listMbCompositionVersions({ mbhId, version }),
    enabled: !!mbhId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

export function useCreateMbComposition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: MbCompositionFormData) => createMbComposition(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: mbCompositionKeys.list(variables.mbhId) })
      toast.success("Composition line created successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create composition line")
    },
  })
}

export function useUpdateMbComposition(mbhId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      mbcmId,
      data,
    }: {
      mbcmId: string
      data: Omit<MbCompositionFormData, "mbhId" | "seqNo">
    }) => updateMbComposition(mbcmId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mbCompositionKeys.list(mbhId) })
      toast.success("Composition line updated successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update composition line")
    },
  })
}

export function useDeleteMbComposition(mbhId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (mbcmId: string) => deleteMbComposition(mbcmId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mbCompositionKeys.list(mbhId) })
      toast.success("Composition line deleted successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete composition line")
    },
  })
}
