import type { LookupFillValuesResponse } from "@/types/finance/yarn-master"
import type { RequiredParamEntry } from "@/types/finance/cost-product-parameter"

/** Per-param draft changes produced by a lookup (fill-group) selection. */
export type LookupFillPatch = { valueNumeric?: string; valueText?: string }

/**
 * OIL_RATE is a fill-group child of OIL_NAME but is resolved per period by the
 * calc engine, so a lookup change must never write or clear its stored value.
 */
const ENGINE_RESOLVED_CHILDREN = new Set(["OIL_RATE"])

/**
 * Computes the draft patches for every child of `triggerParamCode` after the
 * user picks a new row in a MASTER_LOOKUP parameter.
 *
 * Children the backend returned a value for are overwritten with the new row's
 * values. Children it did NOT return (the new row has no value for that
 * column) are cleared, so values of the previously selected row never linger.
 * Returns an empty map when `fills` is null (fetch failed: keep current state).
 */
export function computeLookupFillPatches(
  entries: RequiredParamEntry[],
  triggerParamCode: string,
  fills: LookupFillValuesResponse | null,
): Map<string, LookupFillPatch> {
  const out = new Map<string, LookupFillPatch>()
  if (!fills) return out

  const numericFills = fills.numericFills ?? {}
  const textFills = fills.textFills ?? {}

  for (const child of entries) {
    if (child.lookupFillGroupCode !== triggerParamCode) continue
    if (ENGINE_RESOLVED_CHILDREN.has(child.paramCode)) continue
    const num = numericFills[child.paramCode]
    const txt = textFills[child.paramCode]
    if (num !== undefined && num !== null) {
      out.set(child.paramId, { valueNumeric: String(num) })
    } else if (txt !== undefined && txt !== null) {
      out.set(child.paramId, { valueText: txt })
    } else {
      out.set(child.paramId, child.dataType === "NUMBER" ? { valueNumeric: "" } : { valueText: "" })
    }
  }
  return out
}
