// MB Head API service — workflow transition actions (submit/approve/validate/unapprove/revoke/reject/return-to-draft)

import type { MBHead } from "@/types/finance/mb-head"

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
