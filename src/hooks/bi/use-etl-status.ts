"use client"

// ETL_HR_* last-run status for the Workforce banner. Gated by finance.bi.etlstatus.view (HD-27), so roles
// without finance.bi.job.view (e.g. HR) can read it without opening the full job list or logs.

import { useQuery } from "@tanstack/react-query"

import { apiClient, ApiError } from "@/lib/api"
import type { EtlJobStatus, GetEtlStatusResponse } from "@/types/bi"
import { GetEtlStatusResponseParser } from "@/types/bi"

export const etlStatusKeys = {
  all: ["finance", "bi-etl-status"] as const,
}

export function useEtlStatus() {
  return useQuery<EtlJobStatus[]>({
    queryKey: etlStatusKeys.all,
    queryFn: async () => {
      const raw = await apiClient.get<unknown>("/api/v1/finance/bi/etl-status")
      const parsed: GetEtlStatusResponse = GetEtlStatusResponseParser.fromJSON(raw)
      if (!parsed.base?.isSuccess) throw new Error(parsed.base?.message ?? "Failed to get ETL status")
      return parsed.data
    },
    staleTime: 30_000,
    // A 4xx (e.g. 403 for roles without finance.bi.etlstatus.view) will not heal on retry.
    retry: (count, err) => !(err instanceof ApiError && err.statusCode >= 400 && err.statusCode < 500) && count < 2,
  })
}
