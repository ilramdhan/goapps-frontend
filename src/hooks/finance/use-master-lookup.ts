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
export function useMasterLookupOptions(
  lookupMasterCode: string | undefined,
  enabled = true,
  search = "",
  limit?: number
) {
  const debouncedSearch = useDebounce(search, 300)

  return useQuery<MasterOption[]>({
    queryKey: ["finance", "master-lookup", "options", lookupMasterCode, debouncedSearch, limit],
    queryFn: async () => {
      const params = new URLSearchParams({ masterCode: lookupMasterCode! })
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim())
      if (limit) params.set("limit", String(limit))
      const res = await fetch(`/api/v1/finance/lookup-master-options?${params.toString()}`)
      if (!res.ok) throw new Error(`Failed to fetch ${lookupMasterCode} options: ${res.status}`)
      const json = (await res.json()) as { data?: MasterOption[] }
      return json.data ?? []
    },
    enabled: !!lookupMasterCode && enabled,
    staleTime: 60_000,
  })
}
