// MB Push API service — preview + execute the MB cost push-to-head operation

import type {
  PushableMbHead,
  SkippedMbHead,
  MbPushLog,
  ListMbPushLogsParams,
} from "@/types/finance/mb-push-log"

interface BFFEnvelope<T> {
  base?: { isSuccess?: boolean; message?: string }
  data?: T
  pagination?: { totalItems?: string; totalPages?: number; currentPage?: number; pageSize?: number }
}

export interface PreviewPushToHeadResult {
  pushable: PushableMbHead[]
  skipped: SkippedMbHead[]
  /** Pushable heads whose already-pushed cost went stale after a later MB Batch run. */
  needsRepushCount: number
}

export async function previewPushToHead(period: string): Promise<PreviewPushToHeadResult> {
  const res = await fetch("/api/v1/finance/mb-push/preview", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ period }),
  })
  const json = (await res.json()) as BFFEnvelope<{
    pushable?: PushableMbHead[]
    skipped?: SkippedMbHead[]
    needsRepushCount?: number
  }>
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Failed to preview push-to-head")
  }
  return {
    pushable: json.data?.pushable ?? [],
    skipped: json.data?.skipped ?? [],
    needsRepushCount: Number(json.data?.needsRepushCount ?? 0),
  }
}

export async function executePushToHead(period: string, mbHeadIds: string[]): Promise<MbPushLog> {
  const res = await fetch("/api/v1/finance/mb-push/execute", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ period, mbHeadIds }),
  })
  const json = (await res.json()) as BFFEnvelope<MbPushLog>
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Failed to execute push-to-head")
  }
  return json.data as MbPushLog
}

export interface ListMbPushLogsResult {
  items: MbPushLog[]
  totalItems: number
  totalPages: number
  currentPage: number
  pageSize: number
}

export async function listMbPushLogs(params: ListMbPushLogsParams = {}): Promise<ListMbPushLogsResult> {
  const qs = new URLSearchParams()
  if (params.page) qs.set("page", String(params.page))
  if (params.pageSize) qs.set("pageSize", String(params.pageSize))
  if (params.period) qs.set("period", params.period)
  const res = await fetch(`/api/v1/finance/mb-push-logs?${qs.toString()}`, { credentials: "include" })
  const json = (await res.json()) as BFFEnvelope<MbPushLog[]>
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Failed to load push logs")
  }
  return {
    items: json.data ?? [],
    totalItems: Number(json.pagination?.totalItems ?? 0),
    totalPages: Number(json.pagination?.totalPages ?? 0),
    currentPage: Number(json.pagination?.currentPage ?? 1),
    pageSize: Number(json.pagination?.pageSize ?? 10),
  }
}
