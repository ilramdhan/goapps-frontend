// Yarn TX Weight Types - one grade-weight config (AE/A9/A/B/C) shared by many product types.
// Drives the F_YARN_{grade}_WT formulas via the tx_weight() engine built-in.
// Backed by YarnTxWeightGroupService (BFF: /api/v1/finance/yarn-tx-weight-groups).

export {
  YarnTxWeightGrade,
  YarnTxWeightMode,
  YarnTxWeightGroupServiceDefinition,
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

/** Human preview of a rule, e.g. "AX − 0.5", "AX × 0.65", "2.5" (fixed). */
export function formatTxWeightPreview(mode: TxWeightModeCode | "", value: number): string {
  const v = Number.isFinite(value) ? String(Number(value.toFixed(6))) : "0"
  switch (mode) {
    case "LESS_BY":
      return `AX − ${v}`
    case "MULTIPLY":
      return `AX × ${v}`
    case "FIXED":
      return v
    default:
      return "—"
  }
}

// ============================================================================
// Normalized entities
// ============================================================================

export interface TxWeightProductTypeRef {
  id: number
  code: string
  name: string
}

export interface TxWeightRule {
  grade: TxWeightGradeCode | ""
  mode: TxWeightModeCode | ""
  value: number
  description: string
}

export interface YarnTxWeightGroup {
  groupId: string
  code: string
  name: string
  description: string
  productTypes: TxWeightProductTypeRef[]
  rules: TxWeightRule[]
  createdAt?: string
  createdBy?: string
  updatedAt?: string
  updatedBy?: string
}

type RawAudit = {
  createdAt?: string
  created_at?: string
  createdBy?: string
  created_by?: string
  updatedAt?: string
  updated_at?: string
  updatedBy?: string
  updated_by?: string
}

export type RawTxWeightProductTypeRef = { id?: number | string; code?: string; name?: string }

export type RawTxWeightRule = {
  grade?: number | string
  mode?: number | string
  value?: number | string
  description?: string
}

export type RawYarnTxWeightGroup = {
  groupId?: string
  group_id?: string
  code?: string
  name?: string
  description?: string
  productTypes?: RawTxWeightProductTypeRef[]
  product_types?: RawTxWeightProductTypeRef[]
  rules?: RawTxWeightRule[]
  audit?: RawAudit
}

function gradeIndex(g: TxWeightGradeCode | ""): number {
  const i = g ? TX_WEIGHT_GRADES.indexOf(g) : -1
  return i < 0 ? TX_WEIGHT_GRADES.length : i
}

export function normalizeTxWeightRule(raw: RawTxWeightRule): TxWeightRule {
  return {
    grade: toGradeCode(raw.grade),
    mode: toModeCode(raw.mode),
    value: Number(raw.value ?? 0),
    description: raw.description ?? "",
  }
}

/** Normalizes a group payload (camelCase or snake_case). Types sort by code, rules AE → C. */
export function normalizeYarnTxWeightGroup(raw: RawYarnTxWeightGroup): YarnTxWeightGroup {
  const audit = raw.audit ?? {}
  const productTypes = (raw.productTypes ?? raw.product_types ?? [])
    .map((pt) => ({ id: Number(pt.id ?? 0), code: pt.code ?? "", name: pt.name ?? "" }))
    .sort((a, b) => a.code.localeCompare(b.code))
  const rules = (raw.rules ?? [])
    .map(normalizeTxWeightRule)
    .sort((a, b) => gradeIndex(a.grade) - gradeIndex(b.grade))
  return {
    groupId: raw.groupId ?? raw.group_id ?? "",
    code: raw.code ?? "",
    name: raw.name ?? "",
    description: raw.description ?? "",
    productTypes,
    rules,
    createdAt: audit.createdAt ?? audit.created_at,
    createdBy: audit.createdBy ?? audit.created_by,
    updatedAt: audit.updatedAt ?? audit.updated_at,
    updatedBy: audit.updatedBy ?? audit.updated_by,
  }
}

/** Preview text per grade AE → C; grades without a rule fall back to the ratio formula. */
export const TX_WEIGHT_FALLBACK_LABEL = "Ratio fallback"

export function groupRulePreviews(
  group: Pick<YarnTxWeightGroup, "rules">
): { grade: TxWeightGradeCode; preview: string; hasRule: boolean }[] {
  return TX_WEIGHT_GRADES.map((grade) => {
    const rule = group.rules.find((r) => r.grade === grade)
    return rule && rule.mode
      ? { grade, preview: formatTxWeightPreview(rule.mode, rule.value), hasRule: true }
      : { grade, preview: TX_WEIGHT_FALLBACK_LABEL, hasRule: false }
  })
}

/**
 * Maps product type id → code of the group that owns it, skipping `excludeGroupId`
 * (the group being edited). Used to disable types already taken by another group.
 */
export function buildProductTypeOwnerMap(
  groups: Pick<YarnTxWeightGroup, "groupId" | "code" | "productTypes">[],
  excludeGroupId?: string
): Map<number, string> {
  const owners = new Map<number, string>()
  for (const g of groups) {
    if (excludeGroupId && g.groupId === excludeGroupId) continue
    for (const pt of g.productTypes) {
      if (!owners.has(pt.id)) owners.set(pt.id, g.code)
    }
  }
  return owners
}

// ============================================================================
// Params / form
// ============================================================================

export interface ListYarnTxWeightGroupsParams {
  page?: number
  pageSize?: number
  search?: string
  productTypeId?: number
  sortBy?: string
  sortOrder?: "asc" | "desc" | ""
}

/** One of the five fixed grade rows in the form; mode "" = no rule (ratio fallback). */
export interface TxWeightRuleFormRow {
  grade: TxWeightGradeCode
  mode: TxWeightModeCode | ""
  value: number
}

export interface YarnTxWeightGroupFormData {
  code: string
  name: string
  description: string
  productTypeIds: number[]
  rules: { grade: TxWeightGradeCode; mode: TxWeightModeCode; value: number; description: string }[]
}

/** Five form rows (AE → C) seeded from a group's rules. */
export function toRuleFormRows(rules: TxWeightRule[] = []): TxWeightRuleFormRow[] {
  return TX_WEIGHT_GRADES.map((grade) => {
    const r = rules.find((x) => x.grade === grade)
    return { grade, mode: r?.mode ?? "", value: r?.value ?? 0 }
  })
}

/** Keeps only rows with a mode set, preserving AE → C order and any existing description. */
export function fromRuleFormRows(
  rows: TxWeightRuleFormRow[],
  existing: TxWeightRule[] = []
): YarnTxWeightGroupFormData["rules"] {
  return rows
    .filter((r): r is TxWeightRuleFormRow & { mode: TxWeightModeCode } => r.mode !== "")
    .map((r) => ({
      grade: r.grade,
      mode: r.mode,
      value: Number(r.value),
      description: existing.find((e) => e.grade === r.grade)?.description ?? "",
    }))
}

// ============================================================================
// BFF request mapping (UI string codes → proto enums)
// ============================================================================

export interface YarnTxWeightGroupRequestBody {
  code: string
  name: string
  description: string
  productTypeIds: number[]
  rules: { grade: YarnTxWeightGrade; mode: YarnTxWeightMode; value: number; description: string }[]
}

/** Maps a JSON body (camelCase or snake_case, codes or enums) to the create/update gRPC payload. */
export function toYarnTxWeightGroupRequestBody(body: Record<string, unknown>): YarnTxWeightGroupRequestBody {
  const rawIds = (body.productTypeIds ?? body.product_type_ids ?? []) as unknown[]
  const rawRules = (body.rules ?? []) as RawTxWeightRule[]
  return {
    code: String(body.code ?? "").trim().toUpperCase(),
    name: String(body.name ?? "").trim(),
    description: String(body.description ?? ""),
    productTypeIds: Array.from(new Set(rawIds.map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0))),
    rules: rawRules.map((r) => ({
      grade: gradeCodeToEnum(toGradeCode(r.grade)),
      mode: modeCodeToEnum(toModeCode(r.mode)),
      value: Number(r.value ?? 0),
      description: String(r.description ?? ""),
    })),
  }
}
