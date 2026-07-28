"use client"

// PPC dashboard hooks — morning review, balance-for-sale, daily performance.

import { useQuery } from "@tanstack/react-query"

import { apiClient, buildQueryString } from "@/lib/api"
import type {
  MorningReviewParams,
  BalanceForSaleParams,
  DailyPerformanceParams,
} from "@/types/ppc/dashboard"
import {
  GetMorningReviewResponseParser,
  GetBalanceForSaleResponseParser,
  GetDailyPerformanceResponseParser,
} from "@/types/ppc/dashboard"

export function useMorningReview(params: MorningReviewParams) {
  return useQuery({
    queryKey: ["ppc", "dashboard", "morning-review", JSON.stringify(params)],
    queryFn: async () => {
      const qs = buildQueryString(params as unknown as Record<string, unknown>)
      const raw = await apiClient.get<unknown>(`/api/v1/ppc/dashboard/morning-review${qs}`)
      return GetMorningReviewResponseParser.fromJSON(raw)
    },
    enabled: !!params.date,
    staleTime: 30_000,
  })
}

export function useBalanceForSale(params: BalanceForSaleParams = {}) {
  return useQuery({
    queryKey: ["ppc", "dashboard", "balance-for-sale", JSON.stringify(params)],
    queryFn: async () => {
      const qs = buildQueryString(params as unknown as Record<string, unknown>)
      const raw = await apiClient.get<unknown>(`/api/v1/ppc/dashboard/balance-for-sale${qs}`)
      return GetBalanceForSaleResponseParser.fromJSON(raw).data || []
    },
    staleTime: 30_000,
  })
}

export function useDailyPerformance(params: DailyPerformanceParams) {
  return useQuery({
    queryKey: ["ppc", "dashboard", "daily-performance", JSON.stringify(params)],
    queryFn: async () => {
      const qs = buildQueryString(params as unknown as Record<string, unknown>)
      const raw = await apiClient.get<unknown>(`/api/v1/ppc/dashboard/daily-performance${qs}`)
      return GetDailyPerformanceResponseParser.fromJSON(raw)
    },
    enabled: !!params.date,
    staleTime: 30_000,
  })
}
