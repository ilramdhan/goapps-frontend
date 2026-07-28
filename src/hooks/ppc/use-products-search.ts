"use client"

// PPC product picker hook — debounced search over the finance CostMasterProduct
// PPC projection (item / grade / shade). Read-only; submits cpm_product_sys_id.

import { useQuery } from "@tanstack/react-query"

import { apiClient, buildQueryString } from "@/lib/api"
import { useDebounce } from "@/lib/hooks"
import type { CostMasterProduct, CostMasterRoute } from "@/types/generated/finance/v1/cost_master_lookup"
import {
  ListCostProductMasterForPPCResponse,
  GetProductRouteForPPCResponse,
} from "@/types/generated/finance/v1/cost_master_lookup"

export type { CostMasterProduct, CostMasterRoute }

export interface ProductsSearchParams {
  search?: string
  productTypeId?: number
  shadeCode?: string
  pageSize?: number
  activeFilter?: "" | "active" | "inactive"
}

const productKeys = {
  all: ["ppc", "product-search"] as const,
  list: (params: ProductsSearchParams) => [...productKeys.all, JSON.stringify(params)] as const,
}

export { productKeys }

/**
 * useProductsSearch fetches PPC product projections filtered by a search term.
 * The term is debounced (300ms) so keystrokes don't fan out to the backend.
 */
export function useProductsSearch(params: ProductsSearchParams = {}) {
  const debouncedSearch = useDebounce(params.search ?? "", 300)
  const effective: ProductsSearchParams = { ...params, search: debouncedSearch }
  return useQuery({
    queryKey: productKeys.list(effective),
    queryFn: async (): Promise<CostMasterProduct[]> => {
      const qs = buildQueryString({
        search: debouncedSearch,
        productTypeId: params.productTypeId,
        shadeCode: params.shadeCode,
        pageSize: params.pageSize ?? 50,
        activeFilter: params.activeFilter ?? "active",
      })
      const raw = await apiClient.get<unknown>(`/api/v1/ppc/products${qs}`)
      return ListCostProductMasterForPPCResponse.fromJSON(raw).data || []
    },
    staleTime: 30_000,
  })
}

/**
 * useProductRoute fetches the single released route projection for a product
 * (finance cost_route_head). Returns null when no product is selected or no
 * released route exists. Feeds the route picker.
 */
export function useProductRoute(productSysId: number | undefined) {
  return useQuery({
    queryKey: ["ppc", "product-route", productSysId ?? 0],
    queryFn: async (): Promise<CostMasterRoute | null> => {
      const qs = buildQueryString({ productSysId })
      const raw = await apiClient.get<unknown>(`/api/v1/ppc/products/route-lookup${qs}`)
      return GetProductRouteForPPCResponse.fromJSON(raw).data ?? null
    },
    enabled: !!productSysId,
    staleTime: 60_000,
  })
}
