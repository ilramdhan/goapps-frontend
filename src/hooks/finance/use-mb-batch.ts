"use client"

// MB Batch Hooks - TanStack Query hooks for the MB_BATCH cost compute trigger

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { triggerMbBatch } from "@/services/finance/mb-batch-api"

export function useTriggerMbBatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (period: string) => triggerMbBatch(period),
    onSuccess: (data, period) => {
      queryClient.invalidateQueries({ queryKey: ["finance", "mb-push", "preview", period] })
      if (data.failedCount > 0) {
        toast.warning(`MB batch completed: ${data.successCount} succeeded, ${data.failedCount} failed`)
      } else {
        toast.success(`MB batch completed: ${data.successCount} MB head(s) computed`)
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to trigger MB batch")
    },
  })
}
