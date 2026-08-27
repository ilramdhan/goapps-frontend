// MB Dozing (LDR) calculator types — P7, READ-ONLY (decision K-18).
//
// Nothing here persists anything: `MBDozingService` exposes CalculateDozing and
// PreviewDozingImpact only, and neither RPC writes.
//
// Two modes only: SCALE and XSECTION. STRENGTH is deliberately absent — decision
// gate G6-C3 put it on hold, and the generated proto omits it too. Do NOT add a
// STRENGTH literal, tab or option here.
//
// `resultLdr` is OPTIONAL on the wire and is LEFT UNSET when no conversion
// factor exists (`factorAvailable === false`). A 1.0 fallback is explicitly
// forbidden: absent MUST stay absent and must never collapse to 0.

// ============================================================================
// Re-export proto-generated types
// ============================================================================

export type {
  CalculateDozingRequest,
  CalculateDozingResponse,
  PreviewDozingImpactRequest,
  PreviewDozingImpactResponse,
  DozingImpactRow,
} from "@/types/generated/finance/v1/yarn_master"

export type { BaseResponse } from "@/types/generated/common/v1/common"

// ============================================================================
// Modes
// ============================================================================

/** The only two dozing calculator modes. STRENGTH is on hold (G6-C3). */
export const MB_DOZING_MODES = ["SCALE", "XSECTION"] as const

export type MbDozingMode = (typeof MB_DOZING_MODES)[number]

export const MB_DOZING_MODE_OPTIONS: { value: MbDozingMode; label: string }[] = [
  { value: "SCALE", label: "Scale (Denier / Filament)" },
  { value: "XSECTION", label: "Cross Section" },
]

// ============================================================================
// Request payloads (UI-facing)
// ============================================================================

/** Mode SCALE inputs — every field is required by the backend validator. */
export interface MbDozingScaleInput {
  ldrRef: number
  denierRef: number
  filamentRef: number
  denierTarget: number
  filamentTarget: number
}

/** Mode XSECTION inputs. */
export interface MbDozingXSectionInput {
  ldrSource: number
  fromCrossSection: string
  toCrossSection: string
}

export type CalculateDozingPayload =
  | ({ mode: "SCALE" } & MbDozingScaleInput)
  | ({ mode: "XSECTION" } & MbDozingXSectionInput)

export interface PreviewDozingImpactPayload {
  mbsId: string
  /** 0 means the server default (20). */
  limit?: number
}

// ============================================================================
// Normalized (UI-facing) shapes
// ============================================================================

export interface NormalizedDozingCalculation {
  /**
   * Resulting LDR, or `undefined` when the backend left it unset. `undefined`
   * ("no result") and `0` ("the result is zero") are DIFFERENT states and are
   * never conflated.
   */
  resultLdr?: number
  formulaCode: string
  calculationTrace: string
  /** False ⇒ no conversion factor. Normal path, NOT an error. */
  factorAvailable: boolean
  /** Server-supplied message; shown verbatim when `factorAvailable` is false. */
  message: string
}

export interface NormalizedDozingImpactRow {
  cpmProductSysId: number
  cpmProductCode: string
  cpmProductName: string
  cpmIsLocked: boolean
  /** Absent when the product carries no frozen dozing value — never coerced to 0. */
  frozenDozing?: number
}

export interface NormalizedDozingImpact {
  rows: NormalizedDozingImpactRow[]
  totalAffected: number
  totalLocked: number
  truncated: boolean
  note: string
}

// ============================================================================
// Raw wire shapes — the BFF may hand back camelCase (grpc-js/ts-proto) or
// snake_case (grpc-gateway JSON), so both spellings are accepted.
// ============================================================================

type RawBase = {
  isSuccess?: boolean
  is_success?: boolean
  message?: string
  statusCode?: string
  status_code?: string
}

export type RawDozingCalculation = {
  base?: RawBase
  resultLdr?: number | string | null
  result_ldr?: number | string | null
  formulaCode?: string
  formula_code?: string
  calculationTrace?: string
  calculation_trace?: string
  factorAvailable?: boolean
  factor_available?: boolean
}

export type RawDozingImpactRow = {
  cpmProductSysId?: number | string
  cpm_product_sys_id?: number | string
  cpmProductCode?: string
  cpm_product_code?: string
  cpmProductName?: string
  cpm_product_name?: string
  cpmIsLocked?: boolean
  cpm_is_locked?: boolean
  frozenDozing?: number | string | null
  frozen_dozing?: number | string | null
}

export type RawDozingImpact = {
  base?: RawBase
  data?: RawDozingImpactRow[]
  totalAffected?: number | string
  total_affected?: number | string
  totalLocked?: number | string
  total_locked?: number | string
  truncated?: boolean
  note?: string
}

// ============================================================================
// Normalizers
// ============================================================================

/**
 * Reads an OPTIONAL numeric wire field while preserving the absent/zero
 * distinction. Returns `undefined` only when BOTH spellings are absent (or
 * null / ""); a literal 0 round-trips as 0.
 */
function optionalNumber(
  camel: number | string | null | undefined,
  snake: number | string | null | undefined
): number | undefined {
  const raw = camel ?? snake
  if (raw === undefined || raw === null || raw === "") return undefined
  const n = Number(raw)
  return Number.isNaN(n) ? undefined : n
}

export function normalizeDozingCalculation(
  raw: RawDozingCalculation
): NormalizedDozingCalculation {
  return {
    // NEVER `?? 0` — absent must stay absent (no 1.0/0 fallback, D13).
    resultLdr: optionalNumber(raw.resultLdr, raw.result_ldr),
    formulaCode: raw.formulaCode ?? raw.formula_code ?? "",
    calculationTrace: raw.calculationTrace ?? raw.calculation_trace ?? "",
    factorAvailable: raw.factorAvailable ?? raw.factor_available ?? false,
    message: raw.base?.message ?? "",
  }
}

export function normalizeDozingImpactRow(raw: RawDozingImpactRow): NormalizedDozingImpactRow {
  return {
    cpmProductSysId: Number(raw.cpmProductSysId ?? raw.cpm_product_sys_id ?? 0),
    cpmProductCode: raw.cpmProductCode ?? raw.cpm_product_code ?? "",
    cpmProductName: raw.cpmProductName ?? raw.cpm_product_name ?? "",
    cpmIsLocked: raw.cpmIsLocked ?? raw.cpm_is_locked ?? false,
    frozenDozing: optionalNumber(raw.frozenDozing, raw.frozen_dozing),
  }
}

export function normalizeDozingImpact(raw: RawDozingImpact): NormalizedDozingImpact {
  return {
    rows: (raw.data ?? []).map(normalizeDozingImpactRow),
    // int64 arrives as a string — always Number(...) it.
    totalAffected: Number(raw.totalAffected ?? raw.total_affected ?? 0),
    totalLocked: Number(raw.totalLocked ?? raw.total_locked ?? 0),
    truncated: raw.truncated ?? false,
    note: raw.note ?? "",
  }
}
