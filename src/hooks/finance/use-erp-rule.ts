"use client"

// ERP Rule Hooks - TanStack Query hooks for ERP valuation-loss, sell price and grade-group rules

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import * as api from "@/services/finance/erp-rule-api"
import { downloadBlob } from "@/hooks/finance/use-erp-integration"

type Params = Record<string, string | number | boolean | undefined>

export const erpRuleKeys = {
  all: ["finance", "erp-rule"] as const,
  valloss: () => [...erpRuleKeys.all, "valloss"] as const,
  vallossList: (params?: Params) => [...erpRuleKeys.valloss(), "list", params ?? {}] as const,
  sellPrices: () => [...erpRuleKeys.all, "sell-price"] as const,
  sellPriceList: (params?: Params) => [...erpRuleKeys.sellPrices(), "list", params ?? {}] as const,
  gradeGroups: () => [...erpRuleKeys.all, "grade-group"] as const,
  gradeGroupList: (params?: Params) => [...erpRuleKeys.gradeGroups(), "list", params ?? {}] as const,
  snapshotDiff: (params?: Params) => [...erpRuleKeys.all, "snapshot-diff", params ?? {}] as const,
}

export function useValLossRules(params?: Params) {
  return useQuery({
    queryKey: erpRuleKeys.vallossList(params),
    queryFn: () => api.listValLossRules(params),
    staleTime: 30_000,
  })
}

export function useSellPrices(params?: Params) {
  return useQuery({
    queryKey: erpRuleKeys.sellPriceList(params),
    queryFn: () => api.listSellPrices(params),
    staleTime: 30_000,
  })
}

export function useGradeGroups(params?: Params) {
  return useQuery({
    queryKey: erpRuleKeys.gradeGroupList(params),
    queryFn: () => api.listGradeGroups(params),
    staleTime: 30_000,
  })
}

export function useRuleSnapshotDiff(params?: Params) {
  return useQuery({
    queryKey: erpRuleKeys.snapshotDiff(params),
    queryFn: () => api.getRuleSnapshotDiff(params),
    staleTime: 30_000,
  })
}

export function useCreateValLossRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: Parameters<typeof api.createValLossRule>[0]) => api.createValLossRule(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: erpRuleKeys.valloss() })
      toast.success("Valuation loss rule created")
    },
    onError: (error: Error) => toast.error(error.message || "Failed to create rule"),
  })
}

export function useUpdateValLossRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Parameters<typeof api.updateValLossRule>[1] }) =>
      api.updateValLossRule(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: erpRuleKeys.valloss() })
      toast.success("Valuation loss rule updated")
    },
    onError: (error: Error) => toast.error(error.message || "Failed to update rule"),
  })
}

export function useDeleteValLossRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.deleteValLossRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: erpRuleKeys.valloss() })
      toast.success("Valuation loss rule deleted")
    },
    onError: (error: Error) => toast.error(error.message || "Failed to delete rule"),
  })
}

export function useUpsertSellPrice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ basis, body }: { basis: string; body: Parameters<typeof api.upsertSellPrice>[1] }) =>
      api.upsertSellPrice(basis, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: erpRuleKeys.sellPrices() })
      toast.success("Sell price saved")
    },
    onError: (error: Error) => toast.error(error.message || "Failed to save sell price"),
  })
}

export function useAssignGradeGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ gradeCode, gradeGroup }: { gradeCode: string; gradeGroup: string }) =>
      api.assignGradeGroup(gradeCode, { gradeGroup }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: erpRuleKeys.gradeGroups() })
      toast.success("Grade group updated")
    },
    onError: (error: Error) => toast.error(error.message || "Failed to update grade group"),
  })
}

export function useExportErpRules() {
  return useMutation({
    mutationFn: async (params?: Params) => {
      downloadBlob(await api.exportErpRules(params), "erp_rules.xlsx")
    },
    onError: (error: Error) => toast.error(error.message || "Export failed"),
  })
}
