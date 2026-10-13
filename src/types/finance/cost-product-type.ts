// Canonical Phase B — CostProductType (PRD §7.2.1, CPT_).
export type RmRatioMode = "INPUT" | "DENIER"

export const RM_RATIO_MODE_OPTIONS: Array<{ value: RmRatioMode; label: string }> = [
  { value: "INPUT", label: "Input ratio (route)" },
  { value: "DENIER", label: "Denier share (MEL/ACY)" },
]

export interface CostProductType {
  typeId: number
  typeCode: string
  typeName: string
  isActive: boolean
  /** How RM ratio is derived: INPUT = route ratio, DENIER = denier share (MEL/ACY). */
  rmRatioMode: RmRatioMode
  createdAt?: string
  updatedAt?: string
}

export interface ListCostProductTypesParams {
  search?: string
  activeFilter?: "all" | "active" | "inactive" | ""
  sortBy?: string
  sortOrder?: "asc" | "desc"
  page?: number
  pageSize?: number
}

type RawCostProductType = {
  typeId?: number | string
  type_id?: number | string
  typeCode?: string
  type_code?: string
  typeName?: string
  type_name?: string
  isActive?: boolean
  is_active?: boolean
  rmRatioMode?: string
  rm_ratio_mode?: string
  audit?: { createdAt?: string; created_at?: string; updatedAt?: string; updated_at?: string }
}

export function normalizeCostProductType(raw: RawCostProductType): CostProductType {
  return {
    typeId: Number(raw.typeId ?? raw.type_id ?? 0),
    typeCode: raw.typeCode ?? raw.type_code ?? "",
    typeName: raw.typeName ?? raw.type_name ?? "",
    isActive: raw.isActive ?? raw.is_active ?? true,
    rmRatioMode: (raw.rmRatioMode || raw.rm_ratio_mode) === "DENIER" ? "DENIER" : "INPUT",
    createdAt: raw.audit?.createdAt ?? raw.audit?.created_at,
    updatedAt: raw.audit?.updatedAt ?? raw.audit?.updated_at,
  }
}
