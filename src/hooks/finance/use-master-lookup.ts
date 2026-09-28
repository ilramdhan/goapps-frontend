import { useQuery } from "@tanstack/react-query"
import type { MasterOption } from "@/types/finance/lookup-master"
import { useDebounce } from "@/lib/hooks/use-debounce"

// ⭐ DIPERBARUI 2026-08-26 (perf: SP Code dropdown lag) — added an optional
// `enabled` param (default true, so every existing call site keeps its old
// eager-fetch behavior unless it opts in). `master-lookup-field.tsx` now
// passes the popover's open state so the ~2700-row MB_SPIN option list is
// only ever fetched once the user actually opens that specific row's
// dropdown, instead of once per parameter row eagerly on page mount.
//
// ⭐ DIPERBARUI 2026-08-26 (perf: SP Code dropdown lag, server-side search) —
// added an optional `search` param, debounced 300ms before it's sent (and
// included in the query key so each distinct keyword gets its own cache
// entry) and forwarded to the backend, which now does the filtering/paging
// itself (see lookup_master_repository.go ListMasterOptions) instead of the
// full table being pulled and filtered client-side.
// `limit` is forwarded to the backend as-is (undefined = server default, see
// ListMasterOptions). Callers that want to detect "more results exist than
// shown" without a separate COUNT(*) can request one extra row over their
// display cap (e.g. displayCap + 1) and compare the returned length —
// `master-lookup-field.tsx` does this.
// ⭐ DIPERBARUI 2026-09-24 (oil-cost-rm-group, D11) — added an optional
// `productSysId` param, forwarded to the backend so it can restrict a
// lookup master's options to what's allowed for that product (currently
// only honored server-side for RM_GROUP_OIL, following the MB_SPIN
// precedent). Included in the query key so different products' option
// lists get their own cache entry.
export function useMasterLookupOptions(
  lookupMasterCode: string | undefined,
  enabled = true,
  search = "",
  limit?: number,
  productSysId?: number
) {
  const debouncedSearch = useDebounce(search, 300)

  return useQuery<MasterOption[]>({
    queryKey: ["finance", "master-lookup", "options", lookupMasterCode, debouncedSearch, limit, productSysId],
    queryFn: async () => {
      const params = new URLSearchParams({ masterCode: lookupMasterCode! })
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim())
      if (limit) params.set("limit", String(limit))
      if (productSysId !== undefined) params.set("productSysId", String(productSysId))
      const res = await fetch(`/api/v1/finance/lookup-master-options?${params.toString()}`)
      if (!res.ok) throw new Error(`Failed to fetch ${lookupMasterCode} options: ${res.status}`)
      const json = (await res.json()) as { data?: MasterOption[] }
      return json.data ?? []
    },
    enabled: !!lookupMasterCode && enabled,
    staleTime: 60_000,
  })
}

// ⭐ ADDED (2026-09-28, MB_SPIN large-master label fix) — the default/top-N
// fetch above is capped (`limit`, e.g. DISPLAY_LIMIT) and ordered by label, so
// a saved value whose row falls outside that top-N window (common for large
// masters like MB_SPIN's ~2700 rows) never resolves to a label there, no
// matter how big we make the default fetch. Rather than bulk-loading the
// whole master, this does one small targeted fetch scoped to just that one
// value: it reuses `ListMasterOptions`' existing `search` param (ILIKE against
// both the code and label columns — see lookup_master_repository.go) with the
// exact stored value/code as the search term and a tiny `limit`. Because the
// search is a substring ILIKE (not a strict equality match), the caller MUST
// still filter the response for an exact `value` match before trusting it —
// this hook intentionally returns the raw (possibly fuzzy) rows and leaves
// that filtering to the caller, same as `master-lookup-field.tsx` does.
export function useMasterLookupResolveValue(
  lookupMasterCode: string | undefined,
  value: string,
  enabled: boolean,
  productSysId?: number
) {
  return useQuery<MasterOption[]>({
    queryKey: ["finance", "master-lookup", "resolve", lookupMasterCode, value, productSysId],
    queryFn: async () => {
      const params = new URLSearchParams({ masterCode: lookupMasterCode!, search: value, limit: "5" })
      if (productSysId !== undefined) params.set("productSysId", String(productSysId))
      const res = await fetch(`/api/v1/finance/lookup-master-options?${params.toString()}`)
      if (!res.ok) throw new Error(`Failed to resolve ${lookupMasterCode} value: ${res.status}`)
      const json = (await res.json()) as { data?: MasterOption[] }
      return json.data ?? []
    },
    enabled: !!lookupMasterCode && !!value && enabled,
    staleTime: 60_000,
  })
}
