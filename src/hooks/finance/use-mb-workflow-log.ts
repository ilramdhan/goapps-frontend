"use client"

// MB Workflow Log Hooks - TanStack Query hook for the MB Head status transition audit trail

import { useQuery } from "@tanstack/react-query"

import { listMbWorkflowLogs } from "@/services/finance/mb-workflow-log-api"

export function useMbWorkflowLogs(mbhId: string) {
  return useQuery({
    queryKey: ["finance", "mb-workflow-log", "list", mbhId],
    queryFn: () => listMbWorkflowLogs({ mbhId }),
    enabled: !!mbhId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}
