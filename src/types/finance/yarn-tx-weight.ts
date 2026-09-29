// Yarn TX Weight Types - per product type grade weight rules (AE/A9/A/B/C)
// Drives the F_YARN_{grade}_WT formulas via the tx_weight() engine built-in.

export {
  YarnTxWeightGrade,
  YarnTxWeightMode,
  YarnTxWeightServiceDefinition,
} from "@/types/generated/finance/v1/yarn_tx_weight"

import { YarnTxWeightGrade, YarnTxWeightMode } from "@/types/generated/finance/v1/yarn_tx_weight"

// ============================================================================
// UI enums (string codes are easier to render/select than proto numbers)
// ============================================================================

export type TxWeightGradeCode = "AE" | "A9" | "A" | "B" | "C"
export type TxWeightModeCode = "LESS_BY" | "MULTIPLY" | "FIXED"

export const TX_WEIGHT_GRADES: TxWeightGradeCode[] = ["AE", "A9", "A", "B", "C"]

export const TX_WEIGHT_MODE_OPTIONS: { value: TxWeightModeCode; label: string; hint: string }[] = [
  { value: "LESS_BY", label: "Less By", hint: "AX − value" },
  { value: "MULTIPLY", label: "Multiply", hint: "AX × value" },
  { value: "FIXED", label: "Fixed", hint: "= value" },
]

const GRADE_TO_ENUM: Record<TxWeightGradeCode, YarnTxWeightGrade> = {
  AE: YarnTxWeightGrade.YARN_TX_WEIGHT_GRADE_AE,
  A9: YarnTxWeightGrade.YARN_TX_WEIGHT_GRADE_A9,
  A: YarnTxWeightGrade.YARN_TX_WEIGHT_GRADE_A,
  B: YarnTxWeightGrade.YARN_TX_WEIGHT_GRADE_B,
  C: YarnTxWeightGrade.YARN_TX_WEIGHT_GRADE_C,
}

const MODE_TO_ENUM: Record<TxWeightModeCode, YarnTxWeightMode> = {
  LESS_BY: YarnTxWeightMode.YARN_TX_WEIGHT_MODE_LESS_BY,
  MULTIPLY: YarnTxWeightMode.YARN_TX_WEIGHT_MODE_MULTIPLY,
  FIXED: YarnTxWeightMode.YARN_TX_WEIGHT_MODE_FIXED,
}

export function gradeCodeToEnum(code: TxWeightGradeCode | "" | undefined): YarnTxWeightGrade {
  return code ? GRADE_TO_ENUM[code] ?? YarnTxWeightGrade.YARN_TX_WEIGHT_GRADE_UNSPECIFIED : YarnTxWeightGrade.YARN_TX_WEIGHT_GRADE_UNSPECIFIED
}

export function modeCodeToEnum(code: TxWeightModeCode | "" | undefined): YarnTxWeightMode {
  return code ? MODE_TO_ENUM[code] ?? YarnTxWeightMode.YARN_TX_WEIGHT_MODE_UNSPECIFIED : YarnTxWeightMode.YARN_TX_WEIGHT_MODE_UNSPECIFIED
}

/** Accepts proto number, full enum name ("YARN_TX_WEIGHT_GRADE_AE") or short code ("AE"). */
export function toGradeCode(raw: unknown): TxWeightGradeCode | "" {
  if (typeof raw === "number") {
    const hit = (Object.keys(GRADE_TO_ENUM) as TxWeightGradeCode[]).find((k) => GRADE_TO_ENUM[k] === raw)
    return hit ?? ""
  }
  if (typeof raw === "string" && raw) {
    const short = raw.replace(/^YARN_TX_WEIGHT_GRADE_/, "") as TxWeightGradeCode
    if (short in GRADE_TO_ENUM) return short
    const n = Number(raw)
    if (!Number.isNaN(n)) return toGradeCode(n)
  }
  return ""
}

export function toModeCode(raw: unknown): TxWeightModeCode | "" {
  if (typeof raw === "number") {
    const hit = (Object.keys(MODE_TO_ENUM) as TxWeightModeCode[]).find((k) => MODE_TO_ENUM[k] === raw)
    return hit ?? ""
  }
  if (typeof raw === "string" && raw) {
    const short = raw.replace(/^YARN_TX_WEIGHT_MODE_/, "") as TxWeightModeCode
    if (short in MODE_TO_ENUM) return short
    const n = Number(raw)
    if (!Number.isNaN(n)) return toModeCode(n)
  }
  return ""
}

// ============================================================================
// Normalized entity
// ============================================================================

export interface YarnTxWeightRow {
  id: string
  productTypeId: number
  productTypeCode: string
  productTypeName: string
  grade: TxWeightGradeCode | ""
  mode: TxWeightModeCode | ""
  value: number
  description: string
  oracleSysId: string
  createdAt?: string
  createdBy?: string
  updatedAt?: string
  updatedBy?: string
}

export type RawYarnTxWeight = {
  id?: string
  productTypeId?: number | string
  product_type_id?: number | string
  productTypeCode?: string
  product_type_code?: string
  productTypeName?: string
  product_type_name?: string
  grade?: number | string
  mode?: number | string
  value?: number | string
  description?: string
  oracleSysId?: string
  oracle_sys_id?: string
  audit?: {
    createdAt?: string
    created_at?: string
    createdBy?: string
    created_by?: string
    updatedAt?: string
    updated_at?: string
    updatedBy?: string
    updated_by?: string
  }
}

export function normalizeYarnTxWeight(raw: RawYarnTxWeight): YarnTxWeightRow {
  const audit = raw.audit ?? {}
  return {
    id: raw.id ?? "",
    productTypeId: Number(raw.productTypeId ?? raw.product_type_id ?? 0),
    productTypeCode: raw.productTypeCode ?? raw.product_type_code ?? "",
    productTypeName: raw.productTypeName ?? raw.product_type_name ?? "",
    grade: toGradeCode(raw.grade),
    mode: toModeCode(raw.mode),
    value: Number(raw.value ?? 0),
    description: raw.description ?? "",
    oracleSysId: raw.oracleSysId ?? raw.oracle_sys_id ?? "",
    createdAt: audit.createdAt ?? audit.created_at,
    createdBy: audit.createdBy ?? audit.created_by,
    updatedAt: audit.updatedAt ?? audit.updated_at,
    updatedBy: audit.updatedBy ?? audit.updated_by,
  }
}

/** Human preview of a rule, e.g. "AX − 0.5", "AX × 0.65", "= 2.5". */
export function formatTxWeightPreview(mode: TxWeightModeCode | "", value: number): string {
  const v = Number.isFinite(value) ? String(Number(value.toFixed(6))) : "0"
  switch (mode) {
    case "LESS_BY":
      return `AX − ${v}`
    case "MULTIPLY":
      return `AX × ${v}`
    case "FIXED":
      return `= ${v}`
    default:
      return "—"
  }
}

// ============================================================================
// Params / form
// ============================================================================

export interface ListYarnTxWeightParams {
  page?: number
  pageSize?: number
  search?: string
  productTypeId?: number
  grade?: TxWeightGradeCode | ""
  sortBy?: string
  sortOrder?: "asc" | "desc" | ""
}

export interface YarnTxWeightFormData {
  productTypeId: number
  grade: TxWeightGradeCode
  mode: TxWeightModeCode
  value: number
  description: string
}
