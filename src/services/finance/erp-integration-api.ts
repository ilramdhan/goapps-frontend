// ERP Integration API service — calls the BFF (never the backend directly), 1:1 with proto HTTP paths.

import {
  normalizeErpList,
  normalizeErpJobRef,
  normalizeErpBatch,
  normalizeErpCoverageLine,
  normalizeErpStdCostRow,
  normalizeErpOracleCall,
  normalizeErpAdjPreview,
  normalizeErpPeriodLock,
  normalizeErpLinkReportRow,
  normalizeErpCurrencySanityRow,
  normalizeErpIntegrationConfig,
  normalizeErpSchedule,
  normalizeErpBacktestReport,
  type ErpList,
  type ErpJobRef,
  type ErpBatch,
  type ErpCoverageLine,
  type ErpStdCostRow,
  type ErpOracleCall,
  type ErpAdjPreview,
  type ErpPeriodLock,
  type ErpLinkReportRow,
  type ErpCurrencySanityRow,
  type ErpIntegrationConfig,
  type ErpSchedule,
  type ErpBacktestReport,
} from "@/types/finance/erp-integration"

const BASE = "/api/v1/finance/erp-integration"

type Loose = Record<string, unknown>
type Params = Record<string, string | number | boolean | undefined>

async function call(path: string, method = "GET", body?: unknown): Promise<Loose> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  const json = (await res.json()) as Loose
  const base = json.base as { isSuccess?: boolean; message?: string } | undefined
  if (base?.isSuccess === false) throw new Error(base.message || "ERP integration request failed")
  return json
}

function qs(params?: Params): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== "") sp.set(k, String(v))
  const s = sp.toString()
  return s ? `?${s}` : ""
}

const data = (json: Loose): Loose => (json.data ?? {}) as Loose

// ---- Batches ----
export async function createBatch(body: { period: string; mode: string }): Promise<ErpBatch> {
  return normalizeErpBatch(data(await call("/batches", "POST", body)))
}
export async function listBatches(params?: Params): Promise<ErpList<ErpBatch>> {
  return normalizeErpList(await call(`/batches${qs(params)}`), normalizeErpBatch)
}
export async function getBatch(batchId: number): Promise<ErpBatch> {
  return normalizeErpBatch(data(await call(`/batches/${batchId}`)))
}
export async function abandonBatch(batchId: number): Promise<ErpBatch> {
  return normalizeErpBatch(data(await call(`/batches/${batchId}/abandon`, "POST", {})))
}
export async function lockBatch(batchId: number): Promise<ErpBatch> {
  return normalizeErpBatch(data(await call(`/batches/${batchId}/lock`, "POST", {})))
}

// ---- Async pipeline steps (return {jobId, batchId}) ----
const step = (suffix: string) => async (batchId: number, body: unknown = {}): Promise<ErpJobRef> =>
  normalizeErpJobRef(await call(`/batches/${batchId}/${suffix}`, "POST", body))

export const loadDemand = step("load-demand")
export const runCoverage = step("coverage")
export const runDerive = step("derive")
export const validateBatch = step("validate")
export const reconBatch = step("recon")
export const pushBatch = step("push")

export async function ackWarnings(batchId: number, body: unknown = {}): Promise<void> {
  await call(`/batches/${batchId}/ack-warnings`, "POST", body)
}

// ---- Coverage / std cost / push preview ----
export async function listCoverage(batchId: number, params?: Params): Promise<ErpList<ErpCoverageLine>> {
  return normalizeErpList(await call(`/batches/${batchId}/coverage${qs(params)}`), normalizeErpCoverageLine)
}
export async function exportCoverage(batchId: number, params?: Params): Promise<Blob> {
  const res = await fetch(`${BASE}/batches/${batchId}/coverage/export${qs(params)}`, { credentials: "include" })
  if (!res.ok) throw new Error(`Export failed: ${res.status}`)
  return res.blob()
}
export async function listStdCost(batchId: number, params?: Params): Promise<ErpList<ErpStdCostRow>> {
  return normalizeErpList(await call(`/batches/${batchId}/std-cost${qs(params)}`), normalizeErpStdCostRow)
}
export async function previewPush(batchId: number): Promise<Loose> {
  return call(`/batches/${batchId}/push/preview`)
}
export async function createProductFromDemand(batchId: number, cecId: number, body: unknown = {}): Promise<Loose> {
  return call(`/batches/${batchId}/coverage/${cecId}/create-product`, "POST", body)
}
export async function exportRecon(batchId: number): Promise<Blob> {
  const res = await fetch(`${BASE}/batches/${batchId}/recon/export`, { credentials: "include" })
  if (!res.ok) throw new Error(`Export failed: ${res.status}`)
  return res.blob()
}
export async function exportManualSample(batchId: number): Promise<Blob> {
  const res = await fetch(`${BASE}/batches/${batchId}/manual-sample`, { credentials: "include" })
  if (!res.ok) throw new Error(`Export failed: ${res.status}`)
  return res.blob()
}

// ---- ADJ ----
export async function previewAdjOperation(batchId: number, operation: string): Promise<ErpJobRef> {
  return normalizeErpJobRef(await call(`/batches/${batchId}/adj-preview`, "POST", { operation }))
}
export async function getAdjPreview(previewId: string, params?: Params): Promise<ErpAdjPreview> {
  return normalizeErpAdjPreview(data(await call(`/adj-previews/${encodeURIComponent(previewId)}${qs(params)}`)))
}
export async function executeAdjOperation(
  previewId: string,
  body: { confirmSetHash: string; confirmText: string }
): Promise<ErpJobRef> {
  return normalizeErpJobRef(await call(`/adj-previews/${encodeURIComponent(previewId)}/execute`, "POST", body))
}
export async function listOracleCalls(batchId: number, params?: Params): Promise<ErpList<ErpOracleCall>> {
  return normalizeErpList(await call(`/batches/${batchId}/oracle-calls${qs(params)}`), normalizeErpOracleCall)
}

// ---- Period lock ----
export async function lockPeriod(period: string, body: { reason?: string } = {}): Promise<ErpPeriodLock> {
  return normalizeErpPeriodLock(data(await call(`/periods/${encodeURIComponent(period)}/lock`, "POST", body)))
}
export async function unlockPeriod(period: string, body: { reason?: string } = {}): Promise<ErpPeriodLock> {
  return normalizeErpPeriodLock(data(await call(`/periods/${encodeURIComponent(period)}/unlock`, "POST", body)))
}
export async function getPeriodLock(period: string): Promise<ErpPeriodLock> {
  return normalizeErpPeriodLock(data(await call(`/periods/${encodeURIComponent(period)}/lock`)))
}
export async function getCurrencySanity(period: string): Promise<ErpList<ErpCurrencySanityRow>> {
  return normalizeErpList(await call(`/periods/${encodeURIComponent(period)}/currency-sanity`), normalizeErpCurrencySanityRow)
}

// ---- Links / maintenance ----
export async function linkErpToProduct(body: unknown): Promise<Loose> {
  return call("/links", "POST", body)
}
export async function getItemLinkReport(params?: Params): Promise<ErpList<ErpLinkReportRow>> {
  return normalizeErpList(await call(`/link-report${qs(params)}`), normalizeErpLinkReportRow)
}
export async function runAttributeBackfill(body: unknown = {}): Promise<ErpJobRef> {
  return normalizeErpJobRef(await call("/attr-backfill", "POST", body))
}
export async function runMasterSync(body: unknown = {}): Promise<ErpJobRef> {
  return normalizeErpJobRef(await call("/master-sync", "POST", body))
}

// ---- Config / schedule / backtest ----
export async function getConfig(): Promise<ErpIntegrationConfig> {
  return normalizeErpIntegrationConfig(data(await call("/config")))
}
export async function getSchedule(): Promise<ErpSchedule> {
  return normalizeErpSchedule(data(await call("/schedule")))
}
export async function updateSchedule(body: Partial<ErpSchedule>): Promise<ErpSchedule> {
  return normalizeErpSchedule(data(await call("/schedule", "PUT", body)))
}
export async function runBacktest(body: { period: string }): Promise<ErpJobRef> {
  return normalizeErpJobRef(await call("/backtests", "POST", body))
}
export async function getBacktestReport(batchId: number): Promise<ErpBacktestReport> {
  return normalizeErpBacktestReport(data(await call(`/backtests/${batchId}/report`)))
}
