"use client"

// PPC parameter picker hook — debounced search over the finance mst_parameter
// projection (CostMasterProductParameterDef). Read-only; submits param_id but
// only ever displays param_code / param_name (never the raw UUID).

import { useQuery } from "@tanstack/react-query"

import { apiClient, buildQueryString } from "@/lib/api"
import { useDebounce } from "@/lib/hooks"
import type { CostMasterProductParameterDef } from "@/types/generated/finance/v1/cost_master_lookup"
import { ListProductParametersForPPCResponse } from "@/types/generated/finance/v1/cost_master_lookup"

export type { CostMasterProductParameterDef }

export interface ParametersSearchParams {
  search?: string
  displayGroup?: string
  pageSize?: number
  activeFilter?: "" | "active" | "inactive"
}

const parameterKeys = {
  all: ["ppc", "parameter-search"] as const,
  list: (params: ParametersSearchParams) => [...parameterKeys.all, JSON.stringify(params)] as const,
}

export { parameterKeys }

/**
 * useParametersSearch fetches mst_parameter definitions filtered by a search
 * term (debounced 300ms). displayGroup narrows to a parameter set (e.g. Machine).
 */
export function useParametersSearch(params: ParametersSearchParams = {}) {
  const debouncedSearch = useDebounce(params.search ?? "", 300)
  return useQuery({
    queryKey: parameterKeys.list({ ...params, search: debouncedSearch }),
    queryFn: async (): Promise<CostMasterProductParameterDef[]> => {
      const qs = buildQueryString({
        search: debouncedSearch,
        displayGroup: params.displayGroup,
        pageSize: params.pageSize ?? 100,
        activeFilter: params.activeFilter ?? "active",
      })
      const raw = await apiClient.get<unknown>(`/api/v1/ppc/parameters${qs}`)
      const res = ListProductParametersForPPCResponse.fromJSON(raw)
      return res.data
    },
    staleTime: 60_000,
  })
}
