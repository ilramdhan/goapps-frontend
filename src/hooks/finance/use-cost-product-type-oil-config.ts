"use client"

// Oil config for a cost_product_type: oil class (PTY/POY/SUPERBA, or "" for
// non-oil) + the set of RM groups (is_oil_group=true) allowed as OIL_NAME
// values for products of this type, with exactly one marked default (D10).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export interface CostProductTypeOilGroupRow {
  groupCode: string
  groupName: string
  isDefault: boolean
}

export interface CostProductTypeOilConfig {
  typeId: number
  oilClass: string
  groups: CostProductTypeOilGroupRow[]
}

const KEYS = {
  detail: (typeId: number) => ["finance", "cost-product-types", "oil-config", typeId] as const,
}

export function useCostProductTypeOilConfig(typeId: number | undefined) {
  return useQuery({
    queryKey: KEYS.detail(typeId ?? 0),
    queryFn: async (): Promise<CostProductTypeOilConfig | null> => {
      if (!typeId) return null
      const res = await fetch(`/api/v1/finance/cost-product-types/${typeId}/oil-config`)
      const json = await res.json()
      if (!json.base?.isSuccess) throw new Error(json.base?.message || "Failed to load oil config")
      return {
        typeId: json.data?.typeId ?? typeId,
        oilClass: json.data?.oilClass ?? "",
        groups: (json.data?.groups ?? []) as CostProductTypeOilGroupRow[],
      }
    },
    enabled: !!typeId,
  })
}

export function useSetCostProductTypeOilConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CostProductTypeOilConfig) => {
      const res = await fetch(`/api/v1/finance/cost-product-types/${payload.typeId}/oil-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oilClass: payload.oilClass, groups: payload.groups }),
      })
      const json = await res.json()
      if (!json.base?.isSuccess) throw new Error(json.base?.message || "Failed to save oil config")
      return json.data as CostProductTypeOilConfig
    },
    onSuccess: (_data, vars) => {
      toast.success("Oil config saved")
      qc.invalidateQueries({ queryKey: KEYS.detail(vars.typeId) })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export const costProductTypeOilConfigKeys = KEYS
