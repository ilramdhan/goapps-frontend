// Helpers mapping product-master list state to a LookupSyncScope.
import type { LookupSyncScope } from "@/types/finance/lookup-sync"
import type { ListCostProductMastersParams } from "@/types/finance/cost-product-master"

/** Scope for syncing an explicit set of products. */
export function productIdsScope(productSysIds: number[]): LookupSyncScope {
  return { productIds: { productSysIds } }
}

/**
 * Scope matching the current product-master list filters (same semantics as the list
 * query: productTypeIds is the union of productTypeId + productTypeIds; empty values omitted).
 */
export function filterToSyncScope(f: ListCostProductMastersParams): LookupSyncScope {
  const types = new Set<number>(f.productTypeIds ?? [])
  if (f.productTypeId) types.add(f.productTypeId)
  const filter: { search?: string; productTypeIds?: number[]; shadeCode?: string; activeFilter?: string } = {}
  const search = f.search?.trim()
  if (search) filter.search = search
  if (types.size > 0) filter.productTypeIds = [...types]
  if (f.shadeCode) filter.shadeCode = f.shadeCode
  if (f.activeFilter) filter.activeFilter = f.activeFilter
  return { filter }
}
