// Pure mapping from the cost breakdown param snapshot to the conversion-cost
// fields shown on the cost result detail page.

export const PARAM_CAP_COST = "CAPTIVE_COST_QLTY_LOSS"
export const PARAM_DEL_COST = "DELIVERY_COST_QLTY_LOSS"
export const PARAM_TOTAL_CAP_CONV = "TOTAL_CAP_CONV"
export const PARAM_TOTAL_DEL_CONV = "TOTAL_DEL_CONV"
export const PARAM_CAP_CONV_STAGE = "CAP_CONV_STAGE"
export const PARAM_DEL_CONV_STAGE = "DEL_CONV_STAGE"

export interface ConversionCostFields {
  capCost: string | null
  delCost: string | null
  totalCapConv: string | null
  totalDelConv: string | null
  capConvStage: string | null
  delConvStage: string | null
}

function pick(snapshot: Record<string, string> | undefined, key: string): string | null {
  const v = snapshot?.[key]
  if (v === undefined || v === null) return null
  const t = String(v).trim()
  return t === "" ? null : t
}

export function getConversionCostFields(
  snapshot: Record<string, string> | undefined,
): ConversionCostFields {
  return {
    capCost: pick(snapshot, PARAM_CAP_COST),
    delCost: pick(snapshot, PARAM_DEL_COST),
    totalCapConv: pick(snapshot, PARAM_TOTAL_CAP_CONV),
    totalDelConv: pick(snapshot, PARAM_TOTAL_DEL_CONV),
    capConvStage: pick(snapshot, PARAM_CAP_CONV_STAGE),
    delConvStage: pick(snapshot, PARAM_DEL_CONV_STAGE),
  }
}
