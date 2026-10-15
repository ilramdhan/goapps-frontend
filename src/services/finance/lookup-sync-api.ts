// Lookup Sync API - calls the /api/v1/finance/lookup-sync BFF routes.

import {
  type LookupSyncApplyResult,
  type LookupSyncJobFailure,
  type LookupSyncJobStatus,
  type LookupSyncPreview,
  type LookupSyncScope,
  type LookupSyncSummary,
  normalizeLookupSyncFailure,
  normalizeLookupSyncJobInfo,
  normalizeLookupSyncJobStatus,
  normalizeLookupSyncPreview,
  normalizeLookupSyncSummary,
} from "@/types/finance/lookup-sync"

interface Base {
  isSuccess?: boolean
  message?: string
  statusCode?: string
}

async function call<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init })
  return (await res.json()) as T
}

function assertOk(base: Base | undefined, fallback: string) {
  if (base?.isSuccess === false) throw new Error(base.message || fallback)
}

export async function fetchLookupUsage(lookupMasterCode: string, masterKey: string): Promise<LookupSyncSummary> {
  const qs = new URLSearchParams({ lookupMasterCode, masterKey })
  const json = await call<{ base?: Base; data?: Record<string, unknown> }>(
    `/api/v1/finance/lookup-sync/usage?${qs}`,
    { method: "GET" },
  )
  assertOk(json.base, "Failed to load lookup usage")
  return normalizeLookupSyncSummary(json.data)
}

export async function fetchLookupSyncPreview(
  scope: LookupSyncScope,
  page: number,
  pageSize: number,
  onlyActionable: boolean,
): Promise<LookupSyncPreview> {
  const json = await call<{ base?: Base } & Record<string, unknown>>("/api/v1/finance/lookup-sync/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope, pagination: { page, pageSize }, onlyActionable }),
  })
  assertOk(json.base, "Failed to preview lookup sync")
  return normalizeLookupSyncPreview(json)
}

export async function applyLookupSync(scope: LookupSyncScope, planFingerprint: string): Promise<LookupSyncApplyResult> {
  const json = await call<{ base?: Base; data?: Record<string, unknown>; summary?: Record<string, unknown> }>(
    "/api/v1/finance/lookup-sync/apply",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, planFingerprint }),
    },
  )
  if (json.base?.statusCode === "409") {
    return { drifted: true, summary: json.summary ? normalizeLookupSyncSummary(json.summary) : undefined }
  }
  assertOk(json.base, "Failed to apply lookup sync")
  return {
    drifted: false,
    job: normalizeLookupSyncJobInfo(json.data),
    summary: json.summary ? normalizeLookupSyncSummary(json.summary) : undefined,
  }
}

export async function fetchLookupSyncJobStatus(jobId: string): Promise<LookupSyncJobStatus> {
  const json = await call<{ base?: Base } & Record<string, unknown>>(
    `/api/v1/finance/lookup-sync/jobs/${jobId}/status`,
    { method: "GET" },
  )
  assertOk(json.base, "Failed to get lookup sync job status")
  return normalizeLookupSyncJobStatus(json)
}

export async function fetchLookupSyncJobFailures(jobId: string): Promise<LookupSyncJobFailure[]> {
  const json = await call<{ base?: Base; failures?: Record<string, unknown>[] }>(
    `/api/v1/finance/lookup-sync/jobs/${jobId}/failures`,
    { method: "GET" },
  )
  assertOk(json.base, "Failed to list lookup sync job failures")
  return (json.failures ?? []).map(normalizeLookupSyncFailure)
}
