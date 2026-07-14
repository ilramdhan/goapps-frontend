// Canonical Phase B — CostProductMaster (PRD §7.4.1, CPM_).
export interface CostProductMaster {
  productSysId: number
  productCode: string
  productTypeId: number
  productTypeCode?: string
  productTypeName?: string
  productName: string
  shadeCode: string
  gradeCode: string
  description: string
  flex01: string
  flex02: string
  flex03: string
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
}

export interface UpdateCostProductMasterPayload {
  productName: string
  shadeCode: string
  gradeCode: string
  description: string
  flex01?: string
  flex02?: string
  flex03?: string
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

export function normalizeCostProductMaster(raw: Raw): CostProductMaster {
  return {
    productSysId: num(raw.productSysId ?? raw.product_sys_id),
    productCode: str(raw.productCode ?? raw.product_code),
    productTypeId: num(raw.productTypeId ?? raw.product_type_id),
    productTypeCode: str(raw.productTypeCode ?? raw.product_type_code) || undefined,
    productTypeName: str(raw.productTypeName ?? raw.product_type_name) || undefined,
    productName: str(raw.productName ?? raw.product_name),
    shadeCode: str(raw.shadeCode ?? raw.shade_code),
    gradeCode: str(raw.gradeCode ?? raw.grade_code) || "AX",
    description: str(raw.description),
    flex01: str(raw.flex01 ?? raw.flex_01),
    flex02: str(raw.flex02 ?? raw.flex_02),
    flex03: str(raw.flex03 ?? raw.flex_03),
    isActive: (raw.isActive ?? raw.is_active ?? true) as boolean,
    source: str(raw.source),
    isLocked: (raw.isLocked ?? raw.is_locked ?? false) as boolean,
    createdAt: raw.audit?.createdAt ?? raw.audit?.created_at,
    createdBy: raw.audit?.createdBy ?? raw.audit?.created_by,
    updatedAt: raw.audit?.updatedAt ?? raw.audit?.updated_at,
    updatedBy: raw.audit?.updatedBy ?? raw.audit?.updated_by,
  }
}
