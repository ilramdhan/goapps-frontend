// Canonical Phase B — CostProductMaster (PRD §7.4.1, CPM_).
export type RmRatioModeOverride = "" | "INPUT" | "DENIER"

export interface CostProductMaster {
  productSysId: number
  productCode: string
  productTypeId: number
  productTypeCode?: string
  productTypeName?: string
  productName: string
  shadeCode: string
  shadeName?: string
  gradeCode: string
  description: string
  flex01: string
  flex02: string
  flex03: string
  erpItemCode?: string
  erpFgType?: string
  erpChpItemCode?: string
  erpMsBatchItem?: string
  erpItemType?: string
  erpPrdPerDay?: string
  /** Per-product override of the RM ratio mode; "" = follow product type. */
  rmRatioModeOverride: RmRatioModeOverride
  /** Effective mode (override else type default); "" when backend did not send it. */
  effectiveRmRatioMode: string
  /** Min fixed-cost floor per kg; null = Auto (machine default), 0 = off. */
  fixcostMinThreshold: number | null
  isActive: boolean
  source: string
  isLocked: boolean
  createdAt?: string
  createdBy?: string
  updatedAt?: string
  updatedBy?: string
}

export interface ListCostProductMastersParams {
  search?: string
  productTypeId?: number
  /** Multi-select type filter; unioned with productTypeId server-side. Empty = no filter. */
  productTypeIds?: number[]
  shadeCode?: string
  activeFilter?: "all" | "active" | "inactive" | ""
  sortBy?: string
  sortOrder?: "asc" | "desc"
  page?: number
  pageSize?: number
}

export interface CreateCostProductMasterPayload {
  productTypeId: number
  productName: string
  shadeCode: string
  gradeCode: string
  description: string
  flex01?: string
  flex02?: string
  flex03?: string
  erpFgType?: string
  erpChpItemCode?: string
  erpMsBatchItem?: string
  erpItemType?: string
  erpPrdPerDay?: string
  /** Orion item code (optional, <=50). Used by the minimal POY create. */
  erpItemCode?: string
}

export interface UpdateCostProductMasterPayload {
  productName: string
  shadeCode: string
  gradeCode: string
  description: string
  flex01?: string
  flex02?: string
  flex03?: string
  erpFgType?: string
  erpChpItemCode?: string
  erpMsBatchItem?: string
  erpItemType?: string
  erpPrdPerDay?: string
  /** "" clears the override (follow product type). Omit to leave unchanged. */
  rmRatioModeOverride?: RmRatioModeOverride
  /** 0..1; omit to leave unchanged (no reset-to-auto path). */
  fixcostMinThreshold?: number
}

type Raw = Record<string, unknown> & {
  audit?: {
    createdAt?: string; created_at?: string
    createdBy?: string; created_by?: string
    updatedAt?: string; updated_at?: string
    updatedBy?: string; updated_by?: string
  }
}

const str = (v: unknown): string => (typeof v === "string" ? v : "")
const num = (v: unknown): number => (typeof v === "number" ? v : Number(v ?? 0))

function normalizeRmOverride(v: unknown): RmRatioModeOverride {
  const s = str(v).toUpperCase()
  return s === "INPUT" || s === "DENIER" ? s : ""
}

function numOrNull(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function normalizeCostProductMaster(raw: Raw): CostProductMaster {
  return {
    productSysId: num(raw.productSysId ?? raw.product_sys_id),
    productCode: str(raw.productCode ?? raw.product_code),
    productTypeId: num(raw.productTypeId ?? raw.product_type_id),
    productTypeCode: str(raw.productTypeCode ?? raw.product_type_code) || undefined,
    productTypeName: str(raw.productTypeName ?? raw.product_type_name) || undefined,
    productName: str(raw.productName ?? raw.product_name),
    shadeCode: str(raw.shadeCode ?? raw.shade_code),
    shadeName: str(raw.shadeName ?? raw.shade_name) || undefined,
    gradeCode: str(raw.gradeCode ?? raw.grade_code),
    description: str(raw.description),
    flex01: str(raw.flex01 ?? raw.flex_01),
    flex02: str(raw.flex02 ?? raw.flex_02),
    flex03: str(raw.flex03 ?? raw.flex_03),
    erpItemCode: str(raw.erpItemCode ?? raw.erp_item_code),
    erpFgType: str(raw.erpFgType ?? raw.erp_fg_type),
    erpChpItemCode: str(raw.erpChpItemCode ?? raw.erp_chp_item_code),
    erpMsBatchItem: str(raw.erpMsBatchItem ?? raw.erp_ms_batch_item),
    erpItemType: str(raw.erpItemType ?? raw.erp_item_type),
    erpPrdPerDay: str(raw.erpPrdPerDay ?? raw.erp_prd_per_day),
    rmRatioModeOverride: normalizeRmOverride(raw.rmRatioModeOverride ?? raw.rm_ratio_mode_override),
    effectiveRmRatioMode: str(raw.effectiveRmRatioMode ?? raw.effective_rm_ratio_mode),
    fixcostMinThreshold: numOrNull(raw.fixcostMinThreshold ?? raw.fixcost_min_threshold),
    isActive: (raw.isActive ?? raw.is_active ?? true) as boolean,
    source: str(raw.source),
    isLocked: (raw.isLocked ?? raw.is_locked ?? false) as boolean,
    createdAt: raw.audit?.createdAt ?? raw.audit?.created_at,
    createdBy: raw.audit?.createdBy ?? raw.audit?.created_by,
    updatedAt: raw.audit?.updatedAt ?? raw.audit?.updated_at,
    updatedBy: raw.audit?.updatedBy ?? raw.audit?.updated_by,
  }
}

// ============================================================================
// P7 — MB spin link (FG-aware), Oracle ETL preview/apply
// ============================================================================

export type {
  CostProductMbLink,
  GetCostProductMbLinkResponse,
  RelinkCostProductMbResponse,
  ProductEtlRow,
  ProductEtlCounts,
  ProductEtlPreview,
  PreviewProductEtlFromOracleResponse,
  ProductEtlApplyRow,
  ProductEtlApplyResult,
  ApplyProductEtlFromOracleResponse,
} from "@/types/generated/finance/v1/cost_product_master"

import { rawNumbers, rawRecords, toBoolean, toNumber, toStringValue, type RawRecord } from "@/types/finance/raw-coerce"

export type MbLinkSource = "FG_MATCH" | "SHADE_ONLY" | "SUPERBA" | "NONE"

export const MB_LINK_SOURCE_LABELS: Record<MbLinkSource, string> = {
  FG_MATCH: "FG match",
  SHADE_ONLY: "Shade only",
  SUPERBA: "Superba",
  NONE: "None",
}

export type EtlRowStatus =
  | "EXISTS"
  | "EXISTS_MULTI"
  | "NEW_SHADE"
  | "NEW_ITEM"
  | "POSSIBLE_DUPLICATE"
  | "INVALID_TYPE"

export const ETL_STATUS_LABELS: Record<EtlRowStatus, string> = {
  EXISTS: "Already exists",
  EXISTS_MULTI: "Exists (multiple)",
  NEW_SHADE: "New shade",
  NEW_ITEM: "New item",
  POSSIBLE_DUPLICATE: "Possible duplicate",
  INVALID_TYPE: "Invalid type",
}

/** Statuses whose rows can never be applied (the backend marks them selectable=false). */
export const ETL_NON_SELECTABLE_STATUSES: readonly EtlRowStatus[] = [
  "EXISTS",
  "EXISTS_MULTI",
  "POSSIBLE_DUPLICATE",
  "INVALID_TYPE",
]

export interface NormalizedMbLink {
  linkSource: MbLinkSource | string
  spinId: string
  spinCode: string
  spinShadeCode: string
  fgProductId: number
  fgProductCode: string
  candidatePoyProductIds: number[]
  reason: string
  currentParamValue: string
  paramMatches: boolean
}

/** Normalizes CostProductMbLink (GetCostProductMbLink / RelinkCostProductMb data). */
export function normalizeMbLink(raw: RawRecord | undefined | null): NormalizedMbLink {
  const r = (raw ?? {}) as RawRecord
  return {
    linkSource: toStringValue(r.linkSource ?? r.link_source) || "NONE",
    spinId: toStringValue(r.spinId ?? r.spin_id),
    spinCode: toStringValue(r.spinCode ?? r.spin_code),
    spinShadeCode: toStringValue(r.spinShadeCode ?? r.spin_shade_code),
    fgProductId: toNumber(r.fgProductId ?? r.fg_product_id),
    fgProductCode: toStringValue(r.fgProductCode ?? r.fg_product_code),
    candidatePoyProductIds: rawNumbers(r.candidatePoyProductIds ?? r.candidate_poy_product_ids),
    reason: toStringValue(r.reason),
    currentParamValue: toStringValue(r.currentParamValue ?? r.current_param_value),
    paramMatches: toBoolean(r.paramMatches ?? r.param_matches),
  }
}

export interface NormalizedEtlCounts {
  exists: number
  existsMulti: number
  newShade: number
  newItem: number
  possibleDuplicate: number
  invalidType: number
  total: number
}

export interface NormalizedEtlRow {
  rowKey: string
  mergeItemOrion: string
  itemName: string
  shadeCode: string
  shadeName: string
  typeCode: string
  status: EtlRowStatus | string
  selectable: boolean
  matchedProductIds: number[]
  denier: string
  filament: string
  note: string
}

export interface NormalizedEtlPreview {
  runId: string
  fromDate: string
  rows: NormalizedEtlRow[]
  counts: NormalizedEtlCounts
  applyLimit: number
}

function normalizeEtlCounts(raw: unknown): NormalizedEtlCounts {
  const c = (raw ?? {}) as RawRecord
  return {
    exists: toNumber(c.exists),
    existsMulti: toNumber(c.existsMulti ?? c.exists_multi),
    newShade: toNumber(c.newShade ?? c.new_shade),
    newItem: toNumber(c.newItem ?? c.new_item),
    possibleDuplicate: toNumber(c.possibleDuplicate ?? c.possible_duplicate),
    invalidType: toNumber(c.invalidType ?? c.invalid_type),
    total: toNumber(c.total),
  }
}

/** Normalizes ProductEtlPreview. Counts are BEFORE the includeExisting filter (backend). */
export function normalizeEtlPreview(raw: RawRecord | undefined | null): NormalizedEtlPreview {
  const r = (raw ?? {}) as RawRecord
  return {
    runId: toStringValue(r.runId ?? r.run_id),
    fromDate: toStringValue(r.fromDate ?? r.from_date),
    rows: rawRecords(r.rows).map((row) => ({
      rowKey: toStringValue(row.rowKey ?? row.row_key),
      mergeItemOrion: toStringValue(row.mergeItemOrion ?? row.merge_item_orion),
      itemName: toStringValue(row.itemName ?? row.item_name),
      shadeCode: toStringValue(row.shadeCode ?? row.shade_code),
      shadeName: toStringValue(row.shadeName ?? row.shade_name),
      typeCode: toStringValue(row.typeCode ?? row.type_code),
      status: toStringValue(row.status),
      selectable: toBoolean(row.selectable),
      matchedProductIds: rawNumbers(row.matchedProductIds ?? row.matched_product_ids),
      denier: toStringValue(row.denier),
      filament: toStringValue(row.filament),
      note: toStringValue(row.note),
    })),
    counts: normalizeEtlCounts(r.counts),
    applyLimit: toNumber(r.applyLimit ?? r.apply_limit),
  }
}

export interface NormalizedEtlApplyRow {
  rowKey: string
  result: "INSERTED" | "SKIPPED" | "FAILED" | string
  productSysId: number
  productCode: string
  message: string
}

export interface NormalizedEtlApplyResult {
  runId: string
  inserted: number
  skipped: number
  failed: number
  rows: NormalizedEtlApplyRow[]
}

/** Normalizes ProductEtlApplyResult. */
export function normalizeEtlApplyResult(raw: RawRecord | undefined | null): NormalizedEtlApplyResult {
  const r = (raw ?? {}) as RawRecord
  return {
    runId: toStringValue(r.runId ?? r.run_id),
    inserted: toNumber(r.inserted),
    skipped: toNumber(r.skipped),
    failed: toNumber(r.failed),
    rows: rawRecords(r.rows).map((row) => ({
      rowKey: toStringValue(row.rowKey ?? row.row_key),
      result: toStringValue(row.result),
      productSysId: toNumber(row.productSysId ?? row.product_sys_id),
      productCode: toStringValue(row.productCode ?? row.product_code),
      message: toStringValue(row.message),
    })),
  }
}
