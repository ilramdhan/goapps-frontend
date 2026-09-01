// MB Head API service — workflow transition actions (submit/approve/validate/unapprove/revoke/reject/return-to-draft)

import type {
  MBHead,
  BulkMBHeadJobInfo,
  GetBulkMBHeadJobStatusResponse,
  BulkMBHeadJobFailure,
} from "@/types/finance/mb-head"

interface BFFEnvelope<T> {
  base?: { isSuccess?: boolean; message?: string }
  data?: T
}

async function postTransition(path: string, body?: Record<string, unknown>): Promise<MBHead> {
  const res = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  })
  const json = (await res.json()) as BFFEnvelope<MBHead>
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "MB Head transition failed")
  }
  return json.data as MBHead
}

export async function submitMBHead(mbhId: string): Promise<MBHead> {
  return postTransition(`/api/v1/finance/mb-heads/${mbhId}/submit`)
}

export async function approveMBHead(mbhId: string): Promise<MBHead> {
  return postTransition(`/api/v1/finance/mb-heads/${mbhId}/approve`)
}

export async function validateMBHead(mbhId: string): Promise<MBHead> {
  return postTransition(`/api/v1/finance/mb-heads/${mbhId}/validate`)
}

export async function unApproveMBHead(mbhId: string, reason: string): Promise<MBHead> {
  return postTransition(`/api/v1/finance/mb-heads/${mbhId}/unapprove`, { reason })
}

export async function revokeMBHead(mbhId: string, reason: string): Promise<MBHead> {
  return postTransition(`/api/v1/finance/mb-heads/${mbhId}/revoke`, { reason })
}

export async function rejectMBHead(mbhId: string, reason: string): Promise<MBHead> {
  return postTransition(`/api/v1/finance/mb-heads/${mbhId}/reject`, { reason })
}

// K-29: REJECTED → DRAFT. The reason is OPTIONAL here, so an empty string is a
// legitimate payload — postTransition JSON.stringify's `{ reason }` verbatim, so
// "" is transmitted as "" (never dropped/undefined); the backend keeps the prior
// stateReason when it receives an empty reason.
export async function returnMBHeadToDraft(mbhId: string, reason: string): Promise<MBHead> {
  return postTransition(`/api/v1/finance/mb-heads/${mbhId}/return-to-draft`, { reason })
}

// 2026-08-31: REVOKED → DRAFT, gated by the dedicated finance.mb.head.unrevoke
// permission (Super Admin only). Reason is OPTIONAL, same semantics as
// returnMBHeadToDraft above — an empty reason preserves the prior stateReason.
export async function unrevokeMBHead(mbhId: string, reason: string): Promise<MBHead> {
  return postTransition(`/api/v1/finance/mb-heads/${mbhId}/unrevoke`, { reason })
}

// ============================================================================
// P10 lock/unlock (RequestUnlock / GrantUnlock / RejectUnlock)
// ============================================================================

// Reason is MANDATORY: the domain returns ErrReasonRequired for an empty or
// whitespace-only value (mbhead/lock.go RequestUnlock), and the proto carries
// min_len = 1. ⛔ Callers must not pass "".
export async function requestUnlockMBHead(mbhId: string, reason: string): Promise<MBHead> {
  return postTransition(`/api/v1/finance/mb-heads/${mbhId}/request-unlock`, { reason })
}

// ⛔ No reason parameter — GrantUnlockMBHeadRequest has none. Granting is an assent,
// not a refusal, and the original request reason stays on record.
export async function grantUnlockMBHead(mbhId: string): Promise<MBHead> {
  return postTransition(`/api/v1/finance/mb-heads/${mbhId}/grant-unlock`)
}

// Reason is MANDATORY here too (K-52) — consistent with every other refusing transition.
export async function rejectUnlockMBHead(mbhId: string, reason: string): Promise<MBHead> {
  return postTransition(`/api/v1/finance/mb-heads/${mbhId}/reject-unlock`, { reason })
}

// ============================================================================
// Bulk MB Head lifecycle regenerate (Super Admin) — Unvalidate → Submit →
// Validate, re-triggered in bulk so downstream cost_product_master/CAPP/CPP/
// MB Spin data regenerates for records stuck in VALIDATED. Each bulk mutation
// queues an async job and returns immediately; poll getBulkMBHeadJobStatus for
// progress and listBulkMBHeadJobFailures for per-item errors.
// ============================================================================

async function postBulkJob(path: string, body?: Record<string, unknown>): Promise<BulkMBHeadJobInfo> {
  const res = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  })
  const json = (await res.json()) as BFFEnvelope<BulkMBHeadJobInfo>
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Bulk MB Head job failed to queue")
  }
  return json.data as BulkMBHeadJobInfo
}

// Force-transitions up to 500 MB Heads from VALIDATED directly back to DRAFT,
// bypassing the normal RequestUnlockMBHead/GrantUnlockMBHead two-step flow.
// `reason` is optional (proto default "").
export async function bulkForceUnvalidateMBHeads(
  mbhIds: string[],
  reason?: string,
): Promise<BulkMBHeadJobInfo> {
  return postBulkJob("/api/v1/finance/mb-heads/bulk-unvalidate", { mbhIds, reason: reason ?? "" })
}

export async function bulkSubmitMBHeads(mbhIds: string[]): Promise<BulkMBHeadJobInfo> {
  return postBulkJob("/api/v1/finance/mb-heads/bulk-submit", { mbhIds })
}

export async function bulkValidateMBHeads(mbhIds: string[]): Promise<BulkMBHeadJobInfo> {
  return postBulkJob("/api/v1/finance/mb-heads/bulk-validate", { mbhIds })
}

// GetBulkMBHeadJobStatusResponse carries its fields (jobId/jobCode/status/...)
// directly on the response — NOT nested under `data` — so the BFF route mirrors
// that shape and this function returns the envelope as-is (minus `base`).
export async function getBulkMBHeadJobStatus(jobId: string): Promise<GetBulkMBHeadJobStatusResponse> {
  const res = await fetch(`/api/v1/finance/mb-heads/bulk-jobs/${jobId}/status`, {
    method: "GET",
    credentials: "include",
  })
  const json = (await res.json()) as GetBulkMBHeadJobStatusResponse
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Failed to get bulk MB Head job status")
  }
  return json
}

interface ListBulkMBHeadJobFailuresEnvelope {
  base?: { isSuccess?: boolean; message?: string }
  failures?: BulkMBHeadJobFailure[]
}

export async function listBulkMBHeadJobFailures(jobId: string): Promise<BulkMBHeadJobFailure[]> {
  const res = await fetch(`/api/v1/finance/mb-heads/bulk-jobs/${jobId}/failures`, {
    method: "GET",
    credentials: "include",
  })
  const json = (await res.json()) as ListBulkMBHeadJobFailuresEnvelope
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Failed to list bulk MB Head job failures")
  }
  return json.failures ?? []
}
