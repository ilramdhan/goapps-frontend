"use client"

// PPC lookup hooks — one query per lookup category (PPC_AREA, PPC_DEMAND_TYPE,
// PPC_GRADE_REQ, …). Values are {code,label}; comboboxes submit `code`, show `label`.
// Category strings MUST match backend ppc_lookup.pl_category seed values exactly
// (all PPC_-prefixed) or the query returns empty.

import { useQuery } from "@tanstack/react-query"

import { apiClient, buildQueryString } from "@/lib/api"
import type { PpcLookup } from "@/types/ppc/master"
import { ListPpcLookupsResponseParser } from "@/types/ppc/master"

/** Canonical lookup category identifiers (mirror backend ppc_lookup.category). */
export type PpcLookupCategory =
  | "PPC_AREA"
  | "PPC_DEMAND_TYPE"
  | "PPC_DEMAND_SUBTYPE"
  | "PPC_GRADE_REQ"
  | "PPC_PLANITEM_TYPE"
  | "PPC_RM_SOURCE"
  | "PPC_PROD_CATEGORY"
  | "PPC_QTY_SOURCE"
  | "PPC_WO_REF_TYPE"
  | "PPC_THRESHOLD_UNIT"

const lookupKeys = {
  all: ["ppc", "lookup"] as const,
  category: (category: string) => [...lookupKeys.all, category] as const,
}

export { lookupKeys }

/** usePpcLookups fetches the active lookup rows for one category. */
export function usePpcLookups(category: PpcLookupCategory | string | undefined) {
  return useQuery({
    queryKey: lookupKeys.category(category ?? ""),
    queryFn: async (): Promise<PpcLookup[]> => {
      const qs = buildQueryString({ category, pageSize: 200, activeFilter: 1 })
      const raw = await apiClient.get<unknown>(`/api/v1/ppc/lookups${qs}`)
      return ListPpcLookupsResponseParser.fromJSON(raw).data || []
    },
    enabled: !!category,
    staleTime: 5 * 60_000,
  })
}
