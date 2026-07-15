// MB Batch API service — trigger the MB_BATCH cost compute engine for a period

import type { MbBatchError } from "@/types/finance/mb-batch"

interface BFFEnvelope<T> {
  base?: { isSuccess?: boolean; message?: string }
  data?: T
}

export interface TriggerMbBatchResult {
  jobId: number
  period: string
  successCount: number
  failedCount: number
  rowsInserted: number
  durationMs: number
  errors: MbBatchError[]
}

export async function triggerMbBatch(period: string): Promise<TriggerMbBatchResult> {
  const res = await fetch("/api/v1/finance/mb-batch/trigger", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ period }),
  })
  const json = (await res.json()) as BFFEnvelope<TriggerMbBatchResult>
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Failed to trigger MB batch")
  }
  return json.data as TriggerMbBatchResult
}
