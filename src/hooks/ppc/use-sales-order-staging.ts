"use client"

// PPC sales-order staging hook — read-only LOV feed for Pull-from-Orion.

import { useMutation, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

import { apiClient, buildQueryString } from "@/lib/api"
import type {
  ListSalesOrderStagingParams,
  ListSalesOrderStagingIdsParams,
} from "@/types/ppc/master"
import {
  ListSalesOrderStagingResponseParser,
  ListSalesOrderStagingIdsResponseParser,
} from "@/types/ppc/master"

export function useSalesOrderStaging(params: ListSalesOrderStagingParams = {}) {
  return useQuery({
    queryKey: ["ppc", "sales-order-staging", "list", JSON.stringify(params)],
    queryFn: async () => {
      const qs = buildQueryString(params as Record<string, unknown>)
      const raw = await apiClient.get<unknown>(`/api/v1/ppc/sales-order-staging${qs}`)
      const res = ListSalesOrderStagingResponseParser.fromJSON(raw)
      return {
        data: res.data || [],
        pagination: {
          currentPage: res.pagination?.currentPage || 1,
          pageSize: res.pagination?.pageSize || 10,
          totalItems: Number(res.pagination?.totalItems ?? 0),
          totalPages: res.pagination?.totalPages || 0,
        },
      }
    },
    staleTime: 15_000,
  })
}

/**
 * Fetch the ids of every staging row matching a filter, for "select all
 * matching". The display list is page-capped at 100 rows server-side, so
 * asking it for the whole set would silently truncate the selection (and, at
 * page_size > 100, fail proto validation outright). This ids-only endpoint has
 * its own cap, reported back as `limit`, and always states the untruncated
 * `totalMatched` so the caller can tell the planner the difference.
 *
 * A mutation rather than a query: it is a user-triggered one-shot, and errors
 * must surface as a toast instead of sitting silently in a cache entry.
 */
export function useSelectAllStagingIds() {
  return useMutation({
    mutationFn: async (params: ListSalesOrderStagingIdsParams) => {
      const qs = buildQueryString(params as Record<string, unknown>)
      const raw = await apiClient.get<unknown>(`/api/v1/ppc/sales-order-staging/ids${qs}`)
      const res = ListSalesOrderStagingIdsResponseParser.fromJSON(raw)
      return {
        sosIds: (res.sosIds ?? []).map(Number),
        totalMatched: Number(res.totalMatched ?? 0),
        limit: Number(res.limit ?? 0),
      }
    },
    onError: (e: Error) => toast.error(e.message || "Failed to select all matching sales orders"),
  })
}
