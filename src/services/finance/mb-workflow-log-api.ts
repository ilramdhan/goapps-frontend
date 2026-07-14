// MB Workflow Log API service — audit trail of MB Head status transitions

import type { MbWorkflowLog, ListMbWorkflowLogsParams } from "@/types/finance/mb-workflow-log"

interface BFFEnvelope<T> {
  base?: { isSuccess?: boolean; message?: string }
  data?: T
}

export async function listMbWorkflowLogs(params: ListMbWorkflowLogsParams): Promise<MbWorkflowLog[]> {
  const qs = new URLSearchParams({ mbhId: params.mbhId })
  const res = await fetch(`/api/v1/finance/mb-workflow-logs?${qs.toString()}`, { credentials: "include" })
  const json = (await res.json()) as BFFEnvelope<MbWorkflowLog[]>
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Failed to load MB workflow logs")
  }
  return json.data ?? []
}
