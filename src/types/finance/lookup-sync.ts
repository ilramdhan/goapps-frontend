// Lookup Sync Types - re-sync product params derived from master lookups.
// Raw (camelCase or snake_case) -> normalized shapes. totalItems is a string
// from int64 proto, so it is always Number()'d.

export type LookupSyncScope =
  | { masterRef: { lookupMasterCode: string; masterKey: string } }
  | { productIds: { productSysIds: number[] } }
  | { filter: { search?: string; productTypeIds?: number[]; shadeCode?: string; activeFilter?: string } }

export type LookupSyncSkipReason = "" | "LOCKED" | "KEY_EMPTY" | "KEY_NOT_FOUND" | "MB_SPIN_AMBIGUOUS"

export interface LookupSyncValueChange {
  paramId: string
  paramCode: string
  paramName: string
  oldValue: string
  newValue: string
  changeKind: "SET" | "CLEAR" | string
}

export interface LookupSyncItem {
  productSysId: number
  productCode: string
  productName: string
  triggerParamCode: string
  lookupMasterCode: string
  masterKey: string
  skipReason: string
  changes: LookupSyncValueChange[]
}

export interface LookupSyncSummary {
  totalProducts: number
  productsWithChanges: number
  totalValueChanges: number
  lockedProducts: number
  skipCounts: Record<string, number>
  planFingerprint: string
}

export interface LookupSyncPreview {
  summary: LookupSyncSummary
  items: LookupSyncItem[]
  pagination: { currentPage: number; pageSize: number; totalItems: number; totalPages: number }
}

export interface LookupSyncJobInfo {
  jobId: string
  jobCode: string
  status: string
  totalChildren: number
  completedChildren: number
  failedChildren: number
}

export interface LookupSyncApplyResult {
  /** True when the server reported the plan drifted since preview (statusCode 409). */
  drifted: boolean
  job?: LookupSyncJobInfo
  summary?: LookupSyncSummary
}

export interface LookupSyncJobStatus extends LookupSyncJobInfo {
  skippedChildren: number
  valuesWritten: number
}

export interface LookupSyncJobFailure {
  productSysId: number
  productCode: string
  errorMessage: string
}

export const LOOKUP_SYNC_JOB_TERMINAL_STATUSES = ["DONE", "FAILED", "PARTIAL"] as const

export function isLookupSyncJobTerminal(status: string | undefined): boolean {
  return !!status && (LOOKUP_SYNC_JOB_TERMINAL_STATUSES as readonly string[]).includes(status)
}

type Raw = Record<string, unknown> | null | undefined

function pick(r: Raw, camel: string, snake: string): unknown {
  if (!r) return undefined
  return r[camel] ?? r[snake]
}
const str = (v: unknown): string => (v === undefined || v === null ? "" : String(v))
const num = (v: unknown): number => {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}
const arr = (v: unknown): Raw[] => (Array.isArray(v) ? (v as Raw[]) : [])

export function normalizeLookupSyncChange(r: Raw): LookupSyncValueChange {
  return {
    paramId: str(pick(r, "paramId", "param_id")),
    paramCode: str(pick(r, "paramCode", "param_code")),
    paramName: str(pick(r, "paramName", "param_name")),
    oldValue: str(pick(r, "oldValue", "old_value")),
    newValue: str(pick(r, "newValue", "new_value")),
    changeKind: str(pick(r, "changeKind", "change_kind")),
  }
}

export function normalizeLookupSyncItem(r: Raw): LookupSyncItem {
  return {
    productSysId: num(pick(r, "productSysId", "product_sys_id")),
    productCode: str(pick(r, "productCode", "product_code")),
    productName: str(pick(r, "productName", "product_name")),
    triggerParamCode: str(pick(r, "triggerParamCode", "trigger_param_code")),
    lookupMasterCode: str(pick(r, "lookupMasterCode", "lookup_master_code")),
    masterKey: str(pick(r, "masterKey", "master_key")),
    skipReason: str(pick(r, "skipReason", "skip_reason")),
    changes: arr(pick(r, "changes", "changes")).map(normalizeLookupSyncChange),
  }
}

export function normalizeLookupSyncSummary(r: Raw): LookupSyncSummary {
  const sc = (pick(r, "skipCounts", "skip_counts") ?? {}) as Record<string, unknown>
  const skipCounts: Record<string, number> = {}
  for (const [k, v] of Object.entries(sc)) skipCounts[k] = num(v)
  return {
    totalProducts: num(pick(r, "totalProducts", "total_products")),
    productsWithChanges: num(pick(r, "productsWithChanges", "products_with_changes")),
    totalValueChanges: num(pick(r, "totalValueChanges", "total_value_changes")),
    lockedProducts: num(pick(r, "lockedProducts", "locked_products")),
    skipCounts,
    planFingerprint: str(pick(r, "planFingerprint", "plan_fingerprint")),
  }
}

export function normalizeLookupSyncPreview(r: Raw): LookupSyncPreview {
  const p = (pick(r, "pagination", "pagination") ?? {}) as Raw
  return {
    summary: normalizeLookupSyncSummary(pick(r, "summary", "summary") as Raw),
    items: arr(pick(r, "items", "items")).map(normalizeLookupSyncItem),
    pagination: {
      currentPage: num(pick(p, "currentPage", "current_page")) || 1,
      pageSize: num(pick(p, "pageSize", "page_size")),
      totalItems: num(pick(p, "totalItems", "total_items")),
      totalPages: num(pick(p, "totalPages", "total_pages")),
    },
  }
}

export function normalizeLookupSyncJobInfo(r: Raw): LookupSyncJobInfo {
  return {
    jobId: str(pick(r, "jobId", "job_id")),
    jobCode: str(pick(r, "jobCode", "job_code")),
    status: str(pick(r, "status", "status")),
    totalChildren: num(pick(r, "totalChildren", "total_children")),
    completedChildren: num(pick(r, "completedChildren", "completed_children")),
    failedChildren: num(pick(r, "failedChildren", "failed_children")),
  }
}

export function normalizeLookupSyncJobStatus(r: Raw): LookupSyncJobStatus {
  return {
    ...normalizeLookupSyncJobInfo(pick(r, "data", "data") as Raw),
    skippedChildren: num(pick(r, "skippedChildren", "skipped_children")),
    valuesWritten: num(pick(r, "valuesWritten", "values_written")),
  }
}

export function normalizeLookupSyncFailure(r: Raw): LookupSyncJobFailure {
  return {
    productSysId: num(pick(r, "productSysId", "product_sys_id")),
    productCode: str(pick(r, "productCode", "product_code")),
    errorMessage: str(pick(r, "errorMessage", "error_message")),
  }
}
