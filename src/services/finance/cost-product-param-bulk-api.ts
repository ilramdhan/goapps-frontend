// Cost Product Param Bulk API - bulk edit applicable params / param values
// across many products at once (F4, product-route-fork-attach-bulk). Mirrors
// mb-head-api.ts's bulk job submit/status/failures pattern exactly.

import type {
  BulkParamJobInfo,
  BulkParamOperation,
  BulkProductParamJobFailure,
  GetBulkProductParamJobStatusResponse,
} from "@/types/finance/cost-product-param-bulk"

interface BFFEnvelope<T> {
  base?: { isSuccess?: boolean; message?: string }
  data?: T
}

export interface BulkEditProductParamsPayload {
  productSysIds: number[]
  operations: BulkParamOperation[]
  skipMissingApplicable: boolean
}

// bulkEditProductParams queues an async job and returns immediately; poll
// getBulkProductParamJobStatus for progress and listBulkProductParamJobFailures
// for per-item errors.
export async function bulkEditProductParams(
  payload: BulkEditProductParamsPayload,
): Promise<BulkParamJobInfo> {
  const res = await fetch("/api/v1/finance/cost-product-parameters/bulk-edit", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const json = (await res.json()) as BFFEnvelope<BulkParamJobInfo>
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Bulk product param edit job failed to queue")
  }
  return json.data as BulkParamJobInfo
}

// GetBulkProductParamJobStatusResponse carries its fields (jobId/jobCode/status/...)
// directly on the response — NOT nested under `data` — so the BFF route mirrors
// that shape and this function returns the envelope as-is (minus needing `.data`).
export async function getBulkProductParamJobStatus(
  jobId: string,
): Promise<GetBulkProductParamJobStatusResponse> {
  const res = await fetch(`/api/v1/finance/cost-product-parameters/bulk-jobs/${jobId}/status`, {
    method: "GET",
    credentials: "include",
  })
  const json = (await res.json()) as GetBulkProductParamJobStatusResponse
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Failed to get bulk product param job status")
  }
  return json
}

interface ListBulkProductParamJobFailuresEnvelope {
  base?: { isSuccess?: boolean; message?: string }
  failures?: BulkProductParamJobFailure[]
}

export async function listBulkProductParamJobFailures(
  jobId: string,
): Promise<BulkProductParamJobFailure[]> {
  const res = await fetch(`/api/v1/finance/cost-product-parameters/bulk-jobs/${jobId}/failures`, {
    method: "GET",
    credentials: "include",
  })
  const json = (await res.json()) as ListBulkProductParamJobFailuresEnvelope
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Failed to list bulk product param job failures")
  }
  return json.failures ?? []
}
