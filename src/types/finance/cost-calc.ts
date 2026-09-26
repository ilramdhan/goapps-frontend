// CostCalc types — Phase C calc engine (jobs, chunks, products, results, breakdowns, history).
// NUMERIC(20,6) fields stay as strings; UI formats at display time.
// Enum normalizers strip proto prefix and map ts-proto numeric enum values to UI short forms.

export type CalcJobStatus =
  | "QUEUED"
  | "PLANNING"
  | "PROCESSING"
  | "SUCCESS"
  | "PARTIAL_FAILED"
  | "FAILED"
  | "CANCELLED"

export type CalcJobScope = "ALL" | "FILTERED" | "SINGLE_PRODUCT" | "SINGLE_ROUTE"

export type CalculationType = "ACTUAL" | "FORECAST" | "SELLING"

export type CostResultStatus = "CALCULATED" | "VERIFIED" | "APPROVED" | "SUPERSEDED"

export type ChunkStatus =
  | "QUEUED"
  | "DISPATCHED"
  | "PROCESSING"
  | "SUCCESS"
  | "PARTIAL_FAILED"
  | "FAILED"

export type JobProductStatus =
  | "PENDING"
  | "READY"
  | "CALCULATING"
  | "SUCCESS"
  | "FAILED"
  | "BLOCKED"
  | "SKIPPED"

// ---------- enum normalizers ----------

function stripPrefix(s: string, prefix: string): string {
  return s.startsWith(prefix) ? s.slice(prefix.length) : s
}

// ts-proto encodes enums as numeric on the wire, but BFFs may serialize them as
// strings (proto-style) or numbers. Handle both.
const CALC_JOB_STATUS_BY_NUM: Record<number, CalcJobStatus> = {
  1: "QUEUED",
  2: "PLANNING",
  3: "PROCESSING",
  4: "SUCCESS",
  5: "PARTIAL_FAILED",
  6: "FAILED",
  7: "CANCELLED",
}
const CALC_JOB_SCOPE_BY_NUM: Record<number, CalcJobScope> = {
  1: "ALL",
  2: "FILTERED",
  3: "SINGLE_PRODUCT",
  4: "SINGLE_ROUTE",
}
const CALCULATION_TYPE_BY_NUM: Record<number, CalculationType> = {
  1: "ACTUAL",
  2: "FORECAST",
  3: "SELLING",
}
const COST_RESULT_STATUS_BY_NUM: Record<number, CostResultStatus> = {
  1: "CALCULATED",
  2: "VERIFIED",
  3: "APPROVED",
  4: "SUPERSEDED",
}
const CHUNK_STATUS_BY_NUM: Record<number, ChunkStatus> = {
  1: "QUEUED",
  2: "DISPATCHED",
  3: "PROCESSING",
  4: "SUCCESS",
  5: "PARTIAL_FAILED",
  6: "FAILED",
}
const JOB_PRODUCT_STATUS_BY_NUM: Record<number, JobProductStatus> = {
  1: "PENDING",
  2: "READY",
  3: "CALCULATING",
  4: "SUCCESS",
  5: "FAILED",
  6: "BLOCKED",
  7: "SKIPPED",
}

export function normalizeCalcJobStatus(v: unknown): CalcJobStatus {
  if (typeof v === "number") return CALC_JOB_STATUS_BY_NUM[v] ?? "QUEUED"
  const raw = String(v ?? "").toUpperCase()
  const stripped = stripPrefix(raw, "CALC_JOB_STATUS_") as CalcJobStatus
  const allowed: CalcJobStatus[] = [
    "QUEUED",
    "PLANNING",
    "PROCESSING",
    "SUCCESS",
    "PARTIAL_FAILED",
    "FAILED",
    "CANCELLED",
  ]
  return allowed.includes(stripped) ? stripped : "QUEUED"
}

export function normalizeCalcJobScope(v: unknown): CalcJobScope {
  if (typeof v === "number") return CALC_JOB_SCOPE_BY_NUM[v] ?? "ALL"
  const raw = String(v ?? "").toUpperCase()
  const stripped = stripPrefix(raw, "CALC_JOB_SCOPE_") as CalcJobScope
  const allowed: CalcJobScope[] = ["ALL", "FILTERED", "SINGLE_PRODUCT", "SINGLE_ROUTE"]
  return allowed.includes(stripped) ? stripped : "ALL"
}

export function normalizeCalculationType(v: unknown): CalculationType {
  if (typeof v === "number") return CALCULATION_TYPE_BY_NUM[v] ?? "ACTUAL"
  const raw = String(v ?? "").toUpperCase()
  const stripped = stripPrefix(raw, "CALCULATION_TYPE_") as CalculationType
  const allowed: CalculationType[] = ["ACTUAL", "FORECAST", "SELLING"]
  return allowed.includes(stripped) ? stripped : "ACTUAL"
}

export function normalizeCostResultStatus(v: unknown): CostResultStatus {
  if (typeof v === "number") return COST_RESULT_STATUS_BY_NUM[v] ?? "CALCULATED"
  const raw = String(v ?? "").toUpperCase()
  const stripped = stripPrefix(raw, "COST_RESULT_STATUS_") as CostResultStatus
  const allowed: CostResultStatus[] = ["CALCULATED", "VERIFIED", "APPROVED", "SUPERSEDED"]
  return allowed.includes(stripped) ? stripped : "CALCULATED"
}

export function normalizeChunkStatus(v: unknown): ChunkStatus {
  if (typeof v === "number") return CHUNK_STATUS_BY_NUM[v] ?? "QUEUED"
  const raw = String(v ?? "").toUpperCase()
  const stripped = stripPrefix(raw, "CHUNK_STATUS_") as ChunkStatus
  const allowed: ChunkStatus[] = [
    "QUEUED",
    "DISPATCHED",
    "PROCESSING",
    "SUCCESS",
    "PARTIAL_FAILED",
    "FAILED",
  ]
  return allowed.includes(stripped) ? stripped : "QUEUED"
}

export function normalizeJobProductStatus(v: unknown): JobProductStatus {
  if (typeof v === "number") return JOB_PRODUCT_STATUS_BY_NUM[v] ?? "PENDING"
  const raw = String(v ?? "").toUpperCase()
  const stripped = stripPrefix(raw, "JOB_PRODUCT_STATUS_") as JobProductStatus
  const allowed: JobProductStatus[] = [
    "PENDING",
    "READY",
    "CALCULATING",
    "SUCCESS",
    "FAILED",
    "BLOCKED",
    "SKIPPED",
  ]
  return allowed.includes(stripped) ? stripped : "PENDING"
}

// ---------- field helpers ----------

function fieldNum(
  o: Record<string, unknown>,
  camel: string,
  snake: string,
  fallback = 0,
): number {
  const v = o[camel] ?? o[snake]
  if (v == null || v === "") return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function fieldStr(
  o: Record<string, unknown>,
  camel: string,
  snake: string,
  fallback = "",
): string {
  const v = o[camel] ?? o[snake]
  return v == null ? fallback : String(v)
}

function fieldDate(o: Record<string, unknown>, camel: string, snake: string): string | null {
  const v = o[camel] ?? o[snake]
  if (v == null || v === "") return null
  return String(v)
}

function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {}
}

function fieldNumArr(o: Record<string, unknown>, camel: string, snake: string): number[] {
  const v = o[camel] ?? o[snake]
  if (!Array.isArray(v)) return []
  return v.map((x) => Number(x)).filter((n) => Number.isFinite(n))
}

function fieldStrMap(
  o: Record<string, unknown>,
  camel: string,
  snake: string,
): Record<string, string> {
  const v = o[camel] ?? o[snake]
  if (!v || typeof v !== "object") return {}
  const out: Record<string, string> = {}
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    out[k] = String(val ?? "")
  }
  return out
}

// ---------- interfaces ----------

export interface CalJob {
  jobId: number
  jobCode: string
  period: string
  calculationType: CalculationType
  scope: CalcJobScope
  productFilterJson: string
  status: CalcJobStatus
  priority: number
  totalProducts: number
  totalChunks: number
  totalWaves: number
  processedChunks: number
  successCount: number
  failedCount: number
  blockedCount: number
  errorSummaryJson: string
  triggeredBy: string
  queuedAt: string | null
  startedAt: string | null
  completedAt: string | null
  durationMs: number
  createdBy: string
}

export interface CalJobChunk {
  chunkId: number
  jobId: number
  chunkNumber: number
  waveNo: number
  productIds: number[]
  productCount: number
  status: ChunkStatus
  workerId: string
  queuedAt: string | null
  dispatchedAt: string | null
  startedAt: string | null
  completedAt: string | null
  durationMs: number
  successCount: number
  failedCount: number
  errorMessage: string
  retryCount: number
  maxRetries: number
}

export interface CalJobProduct {
  jobProductId: number
  jobId: number
  chunkId: number
  productSysId: number
  productCode: string
  productName: string
  routeHeadId: number
  waveNo: number
  status: JobProductStatus
  blockReason: string
  startedAt: string | null
  completedAt: string | null
  durationMs: number
  costId: number
  errorMessage: string
  calculationLogJson: string
}

export interface CostResult {
  costId: number
  productSysId: number
  productCode: string
  productName: string
  period: string
  calculationType: CalculationType
  routeHeadId: number
  version: number
  costPerUnit: string
  totalRmCost: string
  totalConversion: string
  totalCost: string
  uomId: number
  uomCode: string
  currencyCode: string
  status: CostResultStatus
  jobId: number
  calculatedAt: string | null
  calculatedBy: string
  verifiedAt: string | null
  verifiedBy: string
  // Resolved ERP item / shade / primary RM (additive fields — see
  // finance/v1/cost_calc.proto CostResult). primaryRmCode/Name may be empty
  // when the product has no RM detail; rmCount is 0 in that case.
  itemCode: string
  itemName: string
  shadeCode: string
  shadeName: string
  primaryRmCode: string
  primaryRmName: string
  rmCount: number
  // Full RM breakdown (every cpc_rm_cost_detail line, ordered by contribution
  // descending) — populated on both list rows and single-result fetches now
  // that the backend RM-detail bug is fixed. Empty array if the product has
  // no RM detail (rmCount will also be 0 in that case).
  rmDetails: CostRmDetail[]
}

export interface LevelBreakdown {
  level: number
  productSysId: number
  productCode: string
  productName: string
  costContribution: string
  ratio: string
}

export interface CostRmDetail {
  rmType: string
  refCode: string
  refLabel: string
  shadeCode: string
  unitCost: string
  ratio: string
  contribution: string
  // Route level this RM edge feeds (1 = FG; 2..N upstream). Newly populated
  // by the backend — previously always 0/blank.
  routeLevel: number
}

export interface FormulaEval {
  formulaCode: string
  formulaName: string
  expression: string
  inputs: Record<string, string>
  outputParamCode: string
  outputValue: string
}

export interface CostBreakdown {
  summary: CostResult | null
  byLevel: LevelBreakdown[]
  rmDetails: CostRmDetail[]
  formulaTrace: FormulaEval[]
  paramSnapshot: Record<string, string>
}

export interface CostHistoryEntry {
  costId: number
  period: string
  calculationType: CalculationType
  version: number
  costPerUnit: string
  variancePctFromPrevious: string
  status: CostResultStatus
  jobId: number
  calculatedAt: string | null
  calculatedBy: string
}

// ---------- normalizers ----------

export function normalizeCalJob(raw: Record<string, unknown>): CalJob {
  return {
    jobId: fieldNum(raw, "jobId", "job_id"),
    jobCode: fieldStr(raw, "jobCode", "job_code"),
    period: fieldStr(raw, "period", "period"),
    calculationType: normalizeCalculationType(raw.calculationType ?? raw.calculation_type),
    scope: normalizeCalcJobScope(raw.scope),
    productFilterJson: fieldStr(raw, "productFilterJson", "product_filter_json"),
    status: normalizeCalcJobStatus(raw.status),
    priority: fieldNum(raw, "priority", "priority"),
    totalProducts: fieldNum(raw, "totalProducts", "total_products"),
    totalChunks: fieldNum(raw, "totalChunks", "total_chunks"),
    totalWaves: fieldNum(raw, "totalWaves", "total_waves"),
    processedChunks: fieldNum(raw, "processedChunks", "processed_chunks"),
    successCount: fieldNum(raw, "successCount", "success_count"),
    failedCount: fieldNum(raw, "failedCount", "failed_count"),
    blockedCount: fieldNum(raw, "blockedCount", "blocked_count"),
    errorSummaryJson: fieldStr(raw, "errorSummaryJson", "error_summary_json"),
    triggeredBy: fieldStr(raw, "triggeredBy", "triggered_by"),
    queuedAt: fieldDate(raw, "queuedAt", "queued_at"),
    startedAt: fieldDate(raw, "startedAt", "started_at"),
    completedAt: fieldDate(raw, "completedAt", "completed_at"),
    durationMs: fieldNum(raw, "durationMs", "duration_ms"),
    createdBy: fieldStr(raw, "createdBy", "created_by"),
  }
}

export function normalizeCalJobChunk(raw: Record<string, unknown>): CalJobChunk {
  return {
    chunkId: fieldNum(raw, "chunkId", "chunk_id"),
    jobId: fieldNum(raw, "jobId", "job_id"),
    chunkNumber: fieldNum(raw, "chunkNumber", "chunk_number"),
    waveNo: fieldNum(raw, "waveNo", "wave_no"),
    productIds: fieldNumArr(raw, "productIds", "product_ids"),
    productCount: fieldNum(raw, "productCount", "product_count"),
    status: normalizeChunkStatus(raw.status),
    workerId: fieldStr(raw, "workerId", "worker_id"),
    queuedAt: fieldDate(raw, "queuedAt", "queued_at"),
    dispatchedAt: fieldDate(raw, "dispatchedAt", "dispatched_at"),
    startedAt: fieldDate(raw, "startedAt", "started_at"),
    completedAt: fieldDate(raw, "completedAt", "completed_at"),
    durationMs: fieldNum(raw, "durationMs", "duration_ms"),
    successCount: fieldNum(raw, "successCount", "success_count"),
    failedCount: fieldNum(raw, "failedCount", "failed_count"),
    errorMessage: fieldStr(raw, "errorMessage", "error_message"),
    retryCount: fieldNum(raw, "retryCount", "retry_count"),
    maxRetries: fieldNum(raw, "maxRetries", "max_retries"),
  }
}

export function normalizeCalJobProduct(raw: Record<string, unknown>): CalJobProduct {
  return {
    jobProductId: fieldNum(raw, "jobProductId", "job_product_id"),
    jobId: fieldNum(raw, "jobId", "job_id"),
    chunkId: fieldNum(raw, "chunkId", "chunk_id"),
    productSysId: fieldNum(raw, "productSysId", "product_sys_id"),
    productCode: fieldStr(raw, "productCode", "product_code"),
    productName: fieldStr(raw, "productName", "product_name"),
    routeHeadId: fieldNum(raw, "routeHeadId", "route_head_id"),
    waveNo: fieldNum(raw, "waveNo", "wave_no"),
    status: normalizeJobProductStatus(raw.status),
    blockReason: fieldStr(raw, "blockReason", "block_reason"),
    startedAt: fieldDate(raw, "startedAt", "started_at"),
    completedAt: fieldDate(raw, "completedAt", "completed_at"),
    durationMs: fieldNum(raw, "durationMs", "duration_ms"),
    costId: fieldNum(raw, "costId", "cost_id"),
    errorMessage: fieldStr(raw, "errorMessage", "error_message"),
    calculationLogJson: fieldStr(raw, "calculationLogJson", "calculation_log_json"),
  }
}

export function normalizeCostResult(raw: Record<string, unknown>): CostResult {
  return {
    costId: fieldNum(raw, "costId", "cost_id"),
    productSysId: fieldNum(raw, "productSysId", "product_sys_id"),
    productCode: fieldStr(raw, "productCode", "product_code"),
    productName: fieldStr(raw, "productName", "product_name"),
    period: fieldStr(raw, "period", "period"),
    calculationType: normalizeCalculationType(raw.calculationType ?? raw.calculation_type),
    routeHeadId: fieldNum(raw, "routeHeadId", "route_head_id"),
    version: fieldNum(raw, "version", "version"),
    costPerUnit: fieldStr(raw, "costPerUnit", "cost_per_unit", "0"),
    totalRmCost: fieldStr(raw, "totalRmCost", "total_rm_cost", "0"),
    totalConversion: fieldStr(raw, "totalConversion", "total_conversion", "0"),
    totalCost: fieldStr(raw, "totalCost", "total_cost", "0"),
    uomId: fieldNum(raw, "uomId", "uom_id"),
    uomCode: fieldStr(raw, "uomCode", "uom_code"),
    currencyCode: fieldStr(raw, "currencyCode", "currency_code"),
    status: normalizeCostResultStatus(raw.status),
    jobId: fieldNum(raw, "jobId", "job_id"),
    calculatedAt: fieldDate(raw, "calculatedAt", "calculated_at"),
    calculatedBy: fieldStr(raw, "calculatedBy", "calculated_by"),
    verifiedAt: fieldDate(raw, "verifiedAt", "verified_at"),
    verifiedBy: fieldStr(raw, "verifiedBy", "verified_by"),
    itemCode: fieldStr(raw, "itemCode", "item_code"),
    itemName: fieldStr(raw, "itemName", "item_name"),
    shadeCode: fieldStr(raw, "shadeCode", "shade_code"),
    shadeName: fieldStr(raw, "shadeName", "shade_name"),
    primaryRmCode: fieldStr(raw, "primaryRmCode", "primary_rm_code"),
    primaryRmName: fieldStr(raw, "primaryRmName", "primary_rm_name"),
    rmCount: fieldNum(raw, "rmCount", "rm_count"),
    rmDetails: arr<Record<string, unknown>>(raw.rmDetails ?? raw.rm_details).map(
      normalizeCostRmDetail,
    ),
  }
}

export function normalizeLevelBreakdown(raw: Record<string, unknown>): LevelBreakdown {
  return {
    level: fieldNum(raw, "level", "level"),
    productSysId: fieldNum(raw, "productSysId", "product_sys_id"),
    productCode: fieldStr(raw, "productCode", "product_code"),
    productName: fieldStr(raw, "productName", "product_name"),
    costContribution: fieldStr(raw, "costContribution", "cost_contribution", "0"),
    ratio: fieldStr(raw, "ratio", "ratio", "0"),
  }
}

export function normalizeCostRmDetail(raw: Record<string, unknown>): CostRmDetail {
  return {
    rmType: fieldStr(raw, "rmType", "rm_type"),
    refCode: fieldStr(raw, "refCode", "ref_code"),
    refLabel: fieldStr(raw, "refLabel", "ref_label"),
    shadeCode: fieldStr(raw, "shadeCode", "shade_code"),
    unitCost: fieldStr(raw, "unitCost", "unit_cost", "0"),
    ratio: fieldStr(raw, "ratio", "ratio", "0"),
    contribution: fieldStr(raw, "contribution", "contribution", "0"),
    routeLevel: fieldNum(raw, "routeLevel", "route_level"),
  }
}

export function normalizeFormulaEval(raw: Record<string, unknown>): FormulaEval {
  return {
    formulaCode: fieldStr(raw, "formulaCode", "formula_code"),
    formulaName: fieldStr(raw, "formulaName", "formula_name"),
    expression: fieldStr(raw, "expression", "expression"),
    inputs: fieldStrMap(raw, "inputs", "inputs"),
    outputParamCode: fieldStr(raw, "outputParamCode", "output_param_code"),
    outputValue: fieldStr(raw, "outputValue", "output_value", "0"),
  }
}

export function normalizeCostBreakdown(raw: Record<string, unknown>): CostBreakdown {
  const summaryRaw = asRecord(raw.summary)
  return {
    summary: Object.keys(summaryRaw).length > 0 ? normalizeCostResult(summaryRaw) : null,
    byLevel: arr<Record<string, unknown>>(raw.byLevel ?? raw.by_level).map(normalizeLevelBreakdown),
    rmDetails: arr<Record<string, unknown>>(raw.rmDetails ?? raw.rm_details).map(normalizeCostRmDetail),
    formulaTrace: arr<Record<string, unknown>>(raw.formulaTrace ?? raw.formula_trace).map(
      normalizeFormulaEval,
    ),
    paramSnapshot: fieldStrMap(raw, "paramSnapshot", "param_snapshot"),
  }
}

export function normalizeCostHistoryEntry(raw: Record<string, unknown>): CostHistoryEntry {
  return {
    costId: fieldNum(raw, "costId", "cost_id"),
    period: fieldStr(raw, "period", "period"),
    calculationType: normalizeCalculationType(raw.calculationType ?? raw.calculation_type),
    version: fieldNum(raw, "version", "version"),
    costPerUnit: fieldStr(raw, "costPerUnit", "cost_per_unit", "0"),
    variancePctFromPrevious: fieldStr(
      raw,
      "variancePctFromPrevious",
      "variance_pct_from_previous",
      "0",
    ),
    status: normalizeCostResultStatus(raw.status),
    jobId: fieldNum(raw, "jobId", "job_id"),
    calculatedAt: fieldDate(raw, "calculatedAt", "calculated_at"),
    calculatedBy: fieldStr(raw, "calculatedBy", "calculated_by"),
  }
}

// ---------- list params ----------

export interface ListCalcJobsParams {
  period?: string
  calculationType?: CalculationType | ""
  status?: CalcJobStatus | ""
  triggeredBy?: string
  page?: number
  pageSize?: number
}

export interface ListCalcJobChunksParams {
  waveNo?: number
  status?: ChunkStatus | ""
  page?: number
  pageSize?: number
}

export interface ListCalcJobProductsParams {
  status?: JobProductStatus | ""
  page?: number
  pageSize?: number
}

export interface ListCostHistoryParams {
  calculationType?: CalculationType | ""
  page?: number
  pageSize?: number
}
