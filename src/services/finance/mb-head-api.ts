// MB Head API service — workflow transition actions (submit/approve/validate/unapprove/revoke)

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
