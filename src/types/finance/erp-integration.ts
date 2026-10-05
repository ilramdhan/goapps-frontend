// ERP Integration types — loose raw types (camelCase + snake_case), normalized types, normalizers.
// Enums normalize to the proto name WITHOUT prefix (e.g. "VALIDATED"). int64 -> number. Decimals stay strings.

import {
  erpBatchStatusToJSON,
  erpBatchModeToJSON,
  erpAdjOperationToJSON,
  erpCoverageStatusToJSON,
  erpDeriveStatusToJSON,
  erpStdSourceToJSON,
  erpReconStatusToJSON,
  erpBacktestClassToJSON,
} from "@/types/generated/finance/v1/erp_integration"

// ============================================================================
// Helpers
// ============================================================================

type Loose = Record<string, unknown>

/** Pick the first defined key (camelCase first, then snake_case). */
function pick(raw: Loose | null | undefined, camel: string, snake: string): unknown {
  if (!raw) return undefined
  return raw[camel] !== undefined ? raw[camel] : raw[snake]
}

const str = (v: unknown): string => (v === undefined || v === null ? "" : String(v))
const num = (v: unknown): number => (v === undefined || v === null || v === "" ? 0 : Number(v))
const bool = (v: unknown): boolean => v === true || v === "true"
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : [])
const objList = (v: unknown): Loose[] => (Array.isArray(v) ? (v as Loose[]) : [])

/** Normalize an enum (string name or number) to its name without the prefix. */
export function normalizeErpEnum(
  v: unknown,
  toJSON: (n: number) => string,
  prefix: string
): string {
  if (v === undefined || v === null || v === "") return "UNSPECIFIED"
  const name = typeof v === "number" ? toJSON(v) : String(v)
  return name.startsWith(prefix) ? name.slice(prefix.length) : name
}

// ============================================================================
// List envelope
// ============================================================================

export interface ErpPagination {
  currentPage: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface ErpList<T> {
  isSuccess: boolean
  message: string
  items: T[]
  pagination: ErpPagination
}

export function normalizeErpList<T>(raw: Loose | null | undefined, item: (r: Loose) => T): ErpList<T> {
  const base = (raw?.base ?? {}) as Loose
  const p = (raw?.pagination ?? {}) as Loose
  return {
    isSuccess: base.isSuccess === undefined && base.is_success === undefined ? true : bool(pick(base, "isSuccess", "is_success")),
    message: str(base.message),
    items: objList(raw?.data).map(item),
    pagination: {
      currentPage: num(pick(p, "currentPage", "current_page")),
      pageSize: num(pick(p, "pageSize", "page_size")),
      totalItems: num(pick(p, "totalItems", "total_items")),
      totalPages: num(pick(p, "totalPages", "total_pages")),
    },
  }
}

/** Async RPC result. */
export interface ErpJobRef {
  jobId: string
  batchId: number
  previewId?: string
}

export function normalizeErpJobRef(raw: Loose | null | undefined): ErpJobRef {
  const previewId = pick(raw, "previewId", "preview_id")
  return {
    jobId: str(pick(raw, "jobId", "job_id")),
    batchId: num(pick(raw, "batchId", "batch_id")),
    ...(previewId !== undefined ? { previewId: str(previewId) } : {}),
  }
}

// ============================================================================
// Entities
// ============================================================================

export interface ErpBatch {
  batchId: number
  period: string
  mode: string
  status: string
  seq: number
  createdBy: string
  createdAt: string
  updatedAt: string
  summaryJson: string
  progress: number
  allowedActions: string[]
  failedReason: string
}

export function normalizeErpBatch(r: Loose): ErpBatch {
  return {
    batchId: num(pick(r, "batchId", "batch_id")),
    period: str(r.period),
    mode: normalizeErpEnum(r.mode, erpBatchModeToJSON, "ERP_BATCH_MODE_"),
    status: normalizeErpEnum(r.status, erpBatchStatusToJSON, "ERP_BATCH_STATUS_"),
    seq: num(r.seq),
    createdBy: str(pick(r, "createdBy", "created_by")),
    createdAt: str(pick(r, "createdAt", "created_at")),
    updatedAt: str(pick(r, "updatedAt", "updated_at")),
    summaryJson: str(pick(r, "summaryJson", "summary_json")),
    progress: num(r.progress),
    allowedActions: strList(pick(r, "allowedActions", "allowed_actions")),
    failedReason: str(pick(r, "failedReason", "failed_reason")),
  }
}

export interface ErpCoverageLine {
  cecId: number
  erpItemCode: string
  productId: string
  productCode: string
  qty: string
  costUsd: string
  status: string
  message: string
}

export function normalizeErpCoverageLine(r: Loose): ErpCoverageLine {
  return {
    cecId: num(pick(r, "cecId", "cec_id")),
    erpItemCode: str(pick(r, "erpItemCode", "erp_item_code")),
    productId: str(pick(r, "productId", "product_id")),
    productCode: str(pick(r, "productCode", "product_code")),
    qty: str(r.qty),
    costUsd: str(pick(r, "costUsd", "cost_usd")),
    status: normalizeErpEnum(r.status, erpCoverageStatusToJSON, "ERP_COVERAGE_STATUS_"),
    message: str(r.message),
  }
}

export interface ErpStdCostRow {
  id: number
  erpItemCode: string
  gradeCode: string
  shadeCode: string
  basis: string
  source: string
  deriveStatus: string
  reconStatus: string
  stdCost: string
  oracleStdCost: string
  diff: string
  message: string
}

export function normalizeErpStdCostRow(r: Loose): ErpStdCostRow {
  return {
    id: num(r.id),
    erpItemCode: str(pick(r, "erpItemCode", "erp_item_code")),
    gradeCode: str(pick(r, "gradeCode", "grade_code")),
    shadeCode: str(pick(r, "shadeCode", "shade_code")),
    basis: str(r.basis),
    source: normalizeErpEnum(r.source, erpStdSourceToJSON, "ERP_STD_SOURCE_"),
    deriveStatus: normalizeErpEnum(pick(r, "deriveStatus", "derive_status"), erpDeriveStatusToJSON, "ERP_DERIVE_STATUS_"),
    reconStatus: normalizeErpEnum(pick(r, "reconStatus", "recon_status"), erpReconStatusToJSON, "ERP_RECON_STATUS_"),
    stdCost: str(pick(r, "stdCost", "std_cost")),
    oracleStdCost: str(pick(r, "oracleStdCost", "oracle_std_cost")),
    diff: str(r.diff),
    message: str(r.message),
  }
}

export interface ErpOracleCall {
  id: number
  callType: string
  status: string
  actor: string
  startedAt: string
  durationMs: number
  error: string
  oraCode: string
  attempts: number
  finishedAt: string
}

export function normalizeErpOracleCall(r: Loose): ErpOracleCall {
  return {
    id: num(r.id),
    callType: str(pick(r, "callType", "call_type")),
    status: str(r.status),
    actor: str(r.actor),
    startedAt: str(pick(r, "startedAt", "started_at")),
    durationMs: num(pick(r, "durationMs", "duration_ms")),
    error: str(r.error),
    oraCode: str(pick(r, "oraCode", "ora_code")),
    attempts: num(r.attempts),
    finishedAt: str(pick(r, "finishedAt", "finished_at")),
  }
}

export interface ErpAdjHead {
  headId: string
  itemCode: string
  qty: string
  amount: string
  excluded: boolean
  excludeReason: string
}

export function normalizeErpAdjHead(r: Loose): ErpAdjHead {
  return {
    headId: str(pick(r, "headId", "head_id")),
    itemCode: str(pick(r, "itemCode", "item_code")),
    qty: str(r.qty),
    amount: str(r.amount),
    excluded: bool(r.excluded),
    excludeReason: str(pick(r, "excludeReason", "exclude_reason")),
  }
}

export interface ErpV07Result {
  ok: boolean
  offendingHeadIds: string[]
}

export function normalizeErpV07Result(r: Loose | null | undefined): ErpV07Result {
  return {
    ok: bool(r?.ok),
    offendingHeadIds: strList(pick(r, "offendingHeadIds", "offending_head_ids")),
  }
}

export interface ErpAdjPreview {
  previewId: string
  batchId: number
  operation: string
  setHash: string
  headCount: number
  excludedCount: number
  totalAmount: string
  v07: ErpV07Result | undefined
  heads: ErpAdjHead[]
  confirmText: string
  createdAt: string
  expiresAt: string
}

export function normalizeErpAdjPreview(r: Loose): ErpAdjPreview {
  return {
    previewId: str(pick(r, "previewId", "preview_id")),
    batchId: num(pick(r, "batchId", "batch_id")),
    operation: normalizeErpEnum(r.operation, erpAdjOperationToJSON, "ERP_ADJ_OPERATION_"),
    setHash: str(pick(r, "setHash", "set_hash")),
    headCount: num(pick(r, "headCount", "head_count")),
    excludedCount: num(pick(r, "excludedCount", "excluded_count")),
    totalAmount: str(pick(r, "totalAmount", "total_amount")),
    v07: r.v07 ? normalizeErpV07Result(r.v07 as Loose) : undefined,
    heads: objList(r.heads).map(normalizeErpAdjHead),
    confirmText: str(pick(r, "confirmText", "confirm_text")),
    createdAt: str(pick(r, "createdAt", "created_at")),
    expiresAt: str(pick(r, "expiresAt", "expires_at")),
  }
}

export interface ErpPeriodLock {
  period: string
  locked: boolean
  reason: string
  lockedBy: string
  lockedAt: string
}

export function normalizeErpPeriodLock(r: Loose): ErpPeriodLock {
  return {
    period: str(r.period),
    locked: bool(r.locked),
    reason: str(r.reason),
    lockedBy: str(pick(r, "lockedBy", "locked_by")),
    lockedAt: str(pick(r, "lockedAt", "locked_at")),
  }
}

/** One item-link issue; sections are grouped by `category`. */
export interface ErpLinkReportRow {
  category: string
  erpItemCode: string
  productId: string
  productCode: string
  detail: string
}

export function normalizeErpLinkReportRow(r: Loose): ErpLinkReportRow {
  return {
    category: str(r.category),
    erpItemCode: str(pick(r, "erpItemCode", "erp_item_code")),
    productId: str(pick(r, "productId", "product_id")),
    productCode: str(pick(r, "productCode", "product_code")),
    detail: str(r.detail),
  }
}

/** Group link report rows into sections keyed by category. */
export function groupErpLinkReport(rows: ErpLinkReportRow[]): Record<string, ErpLinkReportRow[]> {
  const out: Record<string, ErpLinkReportRow[]> = {}
  for (const row of rows) (out[row.category] ??= []).push(row)
  return out
}

export interface ErpCurrencySanityRow {
  currency: string
  rate: string
  ok: boolean
  message: string
}

export function normalizeErpCurrencySanityRow(r: Loose): ErpCurrencySanityRow {
  return { currency: str(r.currency), rate: str(r.rate), ok: bool(r.ok), message: str(r.message) }
}

export interface ErpIntegrationConfig {
  pushEnabled: boolean
  valuationEnabled: boolean
  adjApproveEnabled: boolean
  writerMode: string
  oracleIfConfigured: boolean
}

export function normalizeErpIntegrationConfig(r: Loose): ErpIntegrationConfig {
  return {
    pushEnabled: bool(pick(r, "pushEnabled", "push_enabled")),
    valuationEnabled: bool(pick(r, "valuationEnabled", "valuation_enabled")),
    adjApproveEnabled: bool(pick(r, "adjApproveEnabled", "adj_approve_enabled")),
    writerMode: str(pick(r, "writerMode", "writer_mode")) || "disabled",
    oracleIfConfigured: bool(pick(r, "oracleIfConfigured", "oracle_if_configured")),
  }
}

export interface ErpSchedule {
  enabled: boolean
  cron: string
  runDayOfMonth: number
  runTime: string
  source: string
  nextRunAt: string
  validationErrors: string[]
  mode: ErpScheduleModeName
  runDate: string
  timezone: string
}

export type ErpScheduleModeName = "END_OF_MONTH" | "START_OF_MONTH" | "DAY_OF_MONTH" | "SPECIFIC_DATE" | "CRON" | ""

export function normalizeErpSchedule(r: Loose): ErpSchedule {
  return {
    enabled: bool(r.enabled),
    cron: str(r.cron),
    runDayOfMonth: num(pick(r, "runDayOfMonth", "run_day_of_month")),
    runTime: str(pick(r, "runTime", "run_time")),
    source: str(r.source),
    nextRunAt: str(pick(r, "nextRunAt", "next_run_at")),
    validationErrors: strList(pick(r, "validationErrors", "validation_errors")),
    mode: str(r.mode).replace("ERP_SCHEDULE_MODE_", "").replace("UNSPECIFIED", "") as ErpScheduleModeName,
    runDate: str(pick(r, "runDate", "run_date")),
    timezone: str(r.timezone),
  }
}

export interface ErpBacktestLine {
  erpItemCode: string
  basis: string
  class: string
  goappsStd: string
  legacyStd: string
  diff: string
  deltaPct: string
  fail: boolean
}

export function normalizeErpBacktestLine(r: Loose): ErpBacktestLine {
  return {
    erpItemCode: str(pick(r, "erpItemCode", "erp_item_code")),
    basis: str(r.basis),
    class: normalizeErpEnum(r.class, erpBacktestClassToJSON, "ERP_BACKTEST_CLASS_"),
    deltaPct: str(pick(r, "deltaPct", "delta_pct")),
    fail: bool(r.fail),
    goappsStd: str(pick(r, "goappsStd", "goapps_std")),
    legacyStd: str(pick(r, "legacyStd", "legacy_std")),
    diff: str(r.diff),
  }
}

export interface ErpBacktestReport {
  batchId: number
  period: string
  counts: Record<string, number>
  lines: ErpBacktestLine[]
  failed: boolean
}

export function normalizeErpBacktestReport(r: Loose): ErpBacktestReport {
  const counts: Record<string, number> = {}
  for (const [k, v] of Object.entries((r.counts ?? {}) as Loose)) counts[k] = num(v)
  return {
    batchId: num(pick(r, "batchId", "batch_id")),
    period: str(r.period),
    counts,
    lines: objList(r.lines).map(normalizeErpBacktestLine),
    failed: bool(r.failed),
  }
}
