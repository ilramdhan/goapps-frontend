"use client"

// MB Push Hooks - TanStack Query hooks for the MB cost push-to-head workflow

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  previewPushToHead,
  executePushToHead,
  listMbPushLogs,
} from "@/services/finance/mb-push-api"
import type { ListMbPushLogsParams } from "@/types/finance/mb-push-log"
import { mbHeadKeys } from "@/hooks/finance/use-mb-head"

const mbPushLogKeys = {
  all: ["finance", "mb-push-log"] as const,
  lists: () => [...mbPushLogKeys.all, "list"] as const,
  list: (params: ListMbPushLogsParams) => [...mbPushLogKeys.lists(), JSON.stringify(params)] as const,
}

export function usePreviewPushToHead(period: string) {
  return useQuery({
    queryKey: ["finance", "mb-push", "preview", period],
    queryFn: () => previewPushToHead(period),
    enabled: !!period,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  })
}

export function useExecutePushToHead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ period, mbHeadIds }: { period: string; mbHeadIds: string[] }) =>
      executePushToHead(period, mbHeadIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mbPushLogKeys.lists() })
      queryClient.invalidateQueries({ queryKey: mbHeadKeys.lists() })
      toast.success("Push to head completed successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to execute push to head")
    },
  })
}

export function useMbPushLogs(params: ListMbPushLogsParams = {}) {
  return useQuery({
    queryKey: mbPushLogKeys.list(params),
    queryFn: () => listMbPushLogs(params),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}
