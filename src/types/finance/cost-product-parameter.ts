// cost_product_parameter (CPP_) — per-product parameter values.
// Handles both camelCase and snake_case from BFF.

export type ParamDataType = "NUMBER" | "TEXT" | "BOOLEAN"

export interface RequiredParamEntry {
  paramId: string
  paramCode: string
  paramName: string
  paramShortName: string
  dataType: ParamDataType
  paramCategory: string
  uomCode: string
  ownerDepartment: string
  isRequiredForCosting: boolean
  lookupMasterCode: string
  lookupFillGroupCode: string
  lookupSourceColumn: string
  displayOrder: number
  displayGroup: string
  // MB Spin "multiple variants" marker fields — see
  // docs/superpowers/mbspin-tanda-varian-ganda-rancangan.md.
  // valueMbSpinId non-empty = resolved to exactly one variant (no marker needed).
  // hasMbSpinCandidateCount is the discriminator: false means "not applicable"
  // (not an MB_SPIN lookup param, or no value yet) and must NEVER be treated
  // the same as mbSpinCandidateCount === 0 (which means "matched zero
  // variants" — a real, distinct state from "not applicable").
  valueMbSpinId: string
  mbSpinCandidateCount: number
  hasMbSpinCandidateCount: boolean
  hasValue: boolean
  valueNumeric: string
  valueText: string
  valueFlag: boolean
  filledAt: string
  filledBy: string
}

export interface MissingParam {
  paramId: string
  paramCode: string
  paramName: string
  displayGroup: string
}

interface RawRequiredParamEntry {
  paramId?: string
  param_id?: string
  paramCode?: string
  param_code?: string
  paramName?: string
  param_name?: string
  paramShortName?: string
  param_short_name?: string
  dataType?: string
  data_type?: string
  paramCategory?: string
  param_category?: string
  uomCode?: string
  uom_code?: string
  ownerDepartment?: string
  owner_department?: string
  isRequiredForCosting?: boolean
  is_required_for_costing?: boolean
  lookupMasterCode?: string
  lookup_master_code?: string
  lookupFillGroupCode?: string
  lookup_fill_group_code?: string
  lookupSourceColumn?: string
  lookup_source_column?: string
  displayOrder?: number
  display_order?: number
  displayGroup?: string
  display_group?: string
  valueMbSpinId?: string
  value_mb_spin_id?: string
  // Backend sends these as real number/bool (gRPC client parses protobuf
  // int32/bool directly) but the string forms are tolerated too, matching
  // how every other field in this raw shape is defensively typed.
  mbSpinCandidateCount?: number | string
  mb_spin_candidate_count?: number | string
  hasMbSpinCandidateCount?: boolean | string
  has_mb_spin_candidate_count?: boolean | string
  hasValue?: boolean
  has_value?: boolean
  valueNumeric?: string
  value_numeric?: string
  valueText?: string
  value_text?: string
  valueFlag?: boolean
  value_flag?: boolean
  filledAt?: string
  filled_at?: string
  filledBy?: string
  filled_by?: string
}

// Boolean("false") === true in JS, so string-shaped booleans must be parsed
// explicitly rather than coerced with Boolean(). Real gRPC responses hand us
// an actual JS boolean here (int32/bool proto fields, not int64), but this
// stays defensive for any raw shape that arrives as "true"/"false" strings.
function parseBoolField(v: boolean | string | undefined): boolean {
  if (typeof v === "boolean") return v
  if (typeof v === "string") return v === "true" || v === "1"
  return false
}

// int64 fields arrive as strings from the backend, but this is an int32 field
// (mb_spin_candidate_count) — real responses hand us a JS number. Still
// tolerate a numeric string defensively, same spirit as parseBoolField above.
function parseIntField(v: number | string | undefined): number {
  if (typeof v === "number") return v
  if (typeof v === "string") {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

export function normalizeRequiredEntry(raw: RawRequiredParamEntry): RequiredParamEntry {
  return {
    paramId: raw.paramId ?? raw.param_id ?? "",
    paramCode: raw.paramCode ?? raw.param_code ?? "",
    paramName: raw.paramName ?? raw.param_name ?? "",
    paramShortName: raw.paramShortName ?? raw.param_short_name ?? "",
    dataType: (raw.dataType ?? raw.data_type ?? "TEXT") as ParamDataType,
    paramCategory: raw.paramCategory ?? raw.param_category ?? "",
    uomCode: raw.uomCode ?? raw.uom_code ?? "",
    ownerDepartment: raw.ownerDepartment ?? raw.owner_department ?? "",
    isRequiredForCosting: raw.isRequiredForCosting ?? raw.is_required_for_costing ?? false,
    lookupMasterCode: raw.lookupMasterCode ?? raw.lookup_master_code ?? "",
    lookupFillGroupCode: raw.lookupFillGroupCode ?? raw.lookup_fill_group_code ?? "",
    lookupSourceColumn: raw.lookupSourceColumn ?? raw.lookup_source_column ?? "",
    displayOrder: Number(raw.displayOrder ?? raw.display_order ?? 0),
    displayGroup: raw.displayGroup ?? raw.display_group ?? "",
    valueMbSpinId: raw.valueMbSpinId ?? raw.value_mb_spin_id ?? "",
    mbSpinCandidateCount: parseIntField(raw.mbSpinCandidateCount ?? raw.mb_spin_candidate_count),
    hasMbSpinCandidateCount: parseBoolField(
      raw.hasMbSpinCandidateCount ?? raw.has_mb_spin_candidate_count,
    ),
    hasValue: raw.hasValue ?? raw.has_value ?? false,
    valueNumeric: raw.valueNumeric ?? raw.value_numeric ?? "",
    valueText: raw.valueText ?? raw.value_text ?? "",
    valueFlag: raw.valueFlag ?? raw.value_flag ?? false,
    filledAt: raw.filledAt ?? raw.filled_at ?? "",
    filledBy: raw.filledBy ?? raw.filled_by ?? "",
  }
}

// MB Spin "multiple/zero variant" marker — derives the four distinguishable
// states from the three raw fields. See
// docs/superpowers/mbspin-tanda-varian-ganda-rancangan.md §Rencana Frontend.
//
//   (1) SUDAH TERPILIH — valueMbSpinId non-empty            -> null (no marker)
//   (2) AMBIGU          — empty + hasCount=true + count > 1 -> "ambiguous"
//   (3) TIDAK DIKENALI  — empty + hasCount=true + count = 0 -> "unmatched"
//   (4) TIDAK BERLAKU   — hasMbSpinCandidateCount = false   -> null (no marker)
//
// hasMbSpinCandidateCount === false is NEVER treated as count === 0 — those
// are different states (not-applicable vs. matched-zero-variants).
export type MbSpinAmbiguityState = "ambiguous" | "unmatched" | null

export function getMbSpinAmbiguityState(entry: RequiredParamEntry): MbSpinAmbiguityState {
  if (entry.valueMbSpinId !== "") return null
  if (!entry.hasMbSpinCandidateCount) return null
  if (entry.mbSpinCandidateCount > 1) return "ambiguous"
  if (entry.mbSpinCandidateCount === 0) return "unmatched"
  // count === 1 with an empty valueMbSpinId shouldn't happen (the resolver
  // should have filled valueMbSpinId when exactly one candidate matched) —
  // treat as "no marker" rather than guessing which state it belongs to.
  return null
}

// Plain-language Indonesian copy — no technical terms, no raw UUIDs/counts
// without context. Kept as functions so the ambiguous case can optionally
// include the variant count.
export function getMbSpinAmbiguityMessage(state: "ambiguous" | "unmatched", count?: number): string {
  if (state === "ambiguous") {
    return typeof count === "number" && count > 0
      ? `Kode ini punya ${count} varian — silakan pilih salah satu.`
      : "Kode ini punya beberapa varian — silakan pilih salah satu."
  }
  return "Kode ini tidak ditemukan di data master — perlu diperbaiki lebih dulu."
}

export function normalizeMissingParam(raw: Partial<MissingParam> & Record<string, unknown>): MissingParam {
  return {
    paramId: (raw.paramId as string) ?? (raw.param_id as string) ?? "",
    paramCode: (raw.paramCode as string) ?? (raw.param_code as string) ?? "",
    paramName: (raw.paramName as string) ?? (raw.param_name as string) ?? "",
    displayGroup: (raw.displayGroup as string) ?? (raw.display_group as string) ?? "",
  }
}

export interface UpsertParamValuePayload {
  productSysId: number
  paramId: string
  valueNumeric?: string
  valueText?: string
  valueFlag?: boolean
  hasValueFlag?: boolean
}

// AvailableParamEntry — params NOT yet applicable for a product (Add Parameter picker).
export interface AvailableParamEntry {
  paramId: string
  paramCode: string
  paramName: string
  paramShortName: string
  dataType: ParamDataType
  paramCategory: string
  uomCode: string
  ownerDepartment: string
  isRequiredForCosting: boolean
  lookupMasterCode: string
  lookupFillGroupCode: string
  lookupSourceColumn: string
  displayOrder: number
  displayGroup: string
}

export function normalizeAvailable(raw: Record<string, unknown>): AvailableParamEntry {
  const r = raw as Record<string, unknown>
  return {
    paramId: (r.paramId as string) ?? (r.param_id as string) ?? "",
    paramCode: (r.paramCode as string) ?? (r.param_code as string) ?? "",
    paramName: (r.paramName as string) ?? (r.param_name as string) ?? "",
    paramShortName: (r.paramShortName as string) ?? (r.param_short_name as string) ?? "",
    dataType: ((r.dataType as string) ?? (r.data_type as string) ?? "TEXT") as ParamDataType,
    paramCategory: (r.paramCategory as string) ?? (r.param_category as string) ?? "",
    uomCode: (r.uomCode as string) ?? (r.uom_code as string) ?? "",
    ownerDepartment: (r.ownerDepartment as string) ?? (r.owner_department as string) ?? "",
    isRequiredForCosting: (r.isRequiredForCosting as boolean) ?? (r.is_required_for_costing as boolean) ?? false,
    lookupMasterCode: (r.lookupMasterCode as string) ?? (r.lookup_master_code as string) ?? "",
    lookupFillGroupCode: (r.lookupFillGroupCode as string) ?? (r.lookup_fill_group_code as string) ?? "",
    lookupSourceColumn: (r.lookupSourceColumn as string) ?? (r.lookup_source_column as string) ?? "",
    displayOrder: Number((r.displayOrder as number) ?? (r.display_order as number) ?? 0),
    displayGroup: (r.displayGroup as string) ?? (r.display_group as string) ?? "",
  }
}
