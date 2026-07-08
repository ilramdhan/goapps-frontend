// Param summary types — grouped param values per product → fill level.
// Returned by the GetParamSummary RPC.

export interface ParamValueEntry {
  paramId: string
  paramCode: string
  paramName: string
  dataType: string // "NUMBER" | "TEXT" | "BOOLEAN"
  displayGroup: string
  displayOrder: number
  hasValue: boolean
  valueNumeric: string
  valueText: string
  valueFlag: boolean
  uomCode: string
  isRequired: boolean
}

export interface FillLevelSummary {
  routeLevel: number
  taskStatus: string
  filledByUserId: string
  filledAt: string
  filledParams: number
  totalParams: number
  params: ParamValueEntry[]
  lastEditedBy: string
  lastEditedAt: string
}

export interface ProductParamSummary {
  productSysId: number
  productCode: string
  productName: string
  levels: FillLevelSummary[]
}

export interface ParamSummaryData {
  products: ProductParamSummary[]
  totalParams: number
  filledParams: number
}

// ---------- normalizers (handle both camelCase and snake_case) ----------

function normalizeParamValue(raw: Record<string, unknown>): ParamValueEntry {
  return {
    paramId: String(raw.paramId ?? raw.param_id ?? ""),
    paramCode: String(raw.paramCode ?? raw.param_code ?? ""),
    paramName: String(raw.paramName ?? raw.param_name ?? ""),
    dataType: String(raw.dataType ?? raw.data_type ?? ""),
    displayGroup: String(raw.displayGroup ?? raw.display_group ?? ""),
    displayOrder: Number(raw.displayOrder ?? raw.display_order ?? 0),
    hasValue: Boolean(raw.hasValue ?? raw.has_value ?? false),
    valueNumeric: String(raw.valueNumeric ?? raw.value_numeric ?? ""),
    valueText: String(raw.valueText ?? raw.value_text ?? ""),
    valueFlag: Boolean(raw.valueFlag ?? raw.value_flag ?? false),
    uomCode: String(raw.uomCode ?? raw.uom_code ?? ""),
    isRequired: Boolean(raw.isRequired ?? raw.is_required ?? false),
  }
}

function normalizeFillLevel(raw: Record<string, unknown>): FillLevelSummary {
  const rawParams = (raw.params as Record<string, unknown>[] | undefined) ?? []
  return {
    routeLevel: Number(raw.routeLevel ?? raw.route_level ?? 0),
    taskStatus: String(raw.taskStatus ?? raw.task_status ?? ""),
    filledByUserId: String(raw.filledByUserId ?? raw.filled_by_user_id ?? ""),
    filledAt: String(raw.filledAt ?? raw.filled_at ?? ""),
    filledParams: Number(raw.filledParams ?? raw.filled_params ?? 0),
    totalParams: Number(raw.totalParams ?? raw.total_params ?? 0),
    params: rawParams.map(normalizeParamValue),
    lastEditedBy: String(raw.lastEditedBy ?? raw.last_edited_by ?? ""),
    lastEditedAt: String(raw.lastEditedAt ?? raw.last_edited_at ?? ""),
  }
}

function normalizeProduct(raw: Record<string, unknown>): ProductParamSummary {
  const rawLevels = (raw.levels as Record<string, unknown>[] | undefined) ?? []
  return {
    productSysId: Number(raw.productSysId ?? raw.product_sys_id ?? 0),
    productCode: String(raw.productCode ?? raw.product_code ?? ""),
    productName: String(raw.productName ?? raw.product_name ?? ""),
    levels: rawLevels.map(normalizeFillLevel),
  }
}

export function normalizeParamSummary(raw: Record<string, unknown>): ParamSummaryData {
  const rawProducts = (raw.products as Record<string, unknown>[] | undefined) ?? []
  return {
    products: rawProducts.map(normalizeProduct),
    totalParams: Number(raw.totalParams ?? raw.total_params ?? 0),
    filledParams: Number(raw.filledParams ?? raw.filled_params ?? 0),
  }
}
