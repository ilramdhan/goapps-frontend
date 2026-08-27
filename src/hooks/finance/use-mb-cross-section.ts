"use client"

// MB Cross Section Hooks — TanStack Query hooks for the cross-section master
// and its ORDERED (from -> to) conversion factor table.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  listMbCrossSections,
  createMbCrossSection,
  updateMbCrossSection,
  deleteMbCrossSection,
  listMbCrossSectionFactors,
  createMbCrossSectionFactor,
  updateMbCrossSectionFactor,
  deleteMbCrossSectionFactor,
} from "@/services/finance/mb-cross-section-api"
import type {
  ListMbCrossSectionParams,
  ListMbCrossSectionFactorParams,
  MbCrossSectionFormData,
  MbCrossSectionFactorFormData,
} from "@/types/finance/mb-cross-section"

const mbCrossSectionKeys = {
  all: ["finance", "mb-cross-section"] as const,
  lists: () => [...mbCrossSectionKeys.all, "list"] as const,
  list: (params: ListMbCrossSectionParams) =>
    [...mbCrossSectionKeys.lists(), JSON.stringify(params)] as const,
}

const mbCrossSectionFactorKeys = {
  all: ["finance", "mb-cross-section-factor"] as const,
  lists: () => [...mbCrossSectionFactorKeys.all, "list"] as const,
  list: (params: ListMbCrossSectionFactorParams) =>
    [...mbCrossSectionFactorKeys.lists(), JSON.stringify(params)] as const,
}

export { mbCrossSectionKeys, mbCrossSectionFactorKeys }

// ============================================================================
// MB Cross Section (master)
// ============================================================================

export function useMbCrossSections(params: ListMbCrossSectionParams = {}) {
  return useQuery({
    queryKey: mbCrossSectionKeys.list(params),
    queryFn: () => listMbCrossSections(params),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

export function useCreateMbCrossSection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: MbCrossSectionFormData) => createMbCrossSection(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mbCrossSectionKeys.lists() })
      toast.success("MB Cross Section created successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create MB cross section")
    },
  })
}

export function useUpdateMbCrossSection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ mbcsId, data }: { mbcsId: string; data: MbCrossSectionFormData }) =>
      updateMbCrossSection(mbcsId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mbCrossSectionKeys.lists() })
      toast.success("MB Cross Section updated successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update MB cross section")
    },
  })
}

export function useDeleteMbCrossSection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (mbcsId: string) => deleteMbCrossSection(mbcsId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mbCrossSectionKeys.lists() })
      toast.success("MB Cross Section deleted successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete MB cross section")
    },
  })
}

// ============================================================================
// MB Cross Section Factor (directed pairs)
// ============================================================================

export function useMbCrossSectionFactors(params: ListMbCrossSectionFactorParams = {}) {
  return useQuery({
    queryKey: mbCrossSectionFactorKeys.list(params),
    queryFn: () => listMbCrossSectionFactors(params),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

export function useCreateMbCrossSectionFactor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: MbCrossSectionFactorFormData) => createMbCrossSectionFactor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mbCrossSectionFactorKeys.lists() })
      toast.success("Conversion factor created successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create conversion factor")
    },
  })
}

export function useUpdateMbCrossSectionFactor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ mbcfId, data }: { mbcfId: string; data: MbCrossSectionFactorFormData }) =>
      updateMbCrossSectionFactor(mbcfId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mbCrossSectionFactorKeys.lists() })
      toast.success("Conversion factor updated successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update conversion factor")
    },
  })
}

export function useDeleteMbCrossSectionFactor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (mbcfId: string) => deleteMbCrossSectionFactor(mbcfId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mbCrossSectionFactorKeys.lists() })
      toast.success("Conversion factor deleted successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete conversion factor")
    },
  })
}
