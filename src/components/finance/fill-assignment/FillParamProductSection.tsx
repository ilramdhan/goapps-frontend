"use client"

import { useCallback, useMemo, useState } from "react"
import { Check, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  useProductRequiredParams,
  useUpsertProductParamValuesBatch,
} from "@/hooks/finance/use-cost-product-parameter"
import type { RequiredParamEntry, UpsertParamValuePayload } from "@/types/finance/cost-product-parameter"

interface LocalValue {
  valueNumeric?: string
  valueText?: string
  valueFlag?: boolean
}

interface Props {
  productSysId: number
  productCode?: string
  productName?: string
  onSaved?: () => void
  isLocked?: boolean
}

export function FillParamProductSection({ productSysId, productCode, productName, onSaved, isLocked }: Props) {
  const { data: params = [], isLoading } = useProductRequiredParams(productSysId)
  const upsertM = useUpsertProductParamValuesBatch()

  // Group+sort params by displayGroup/displayOrder (same pattern as cost-breakdown-modal)
  const groupedParams = useMemo(() => {
    const groupMinOrder: Record<string, number> = {}
    const grouped: Record<string, typeof params> = {}
    for (const p of params) {
      const g = p.displayGroup
      if (!grouped[g]) {
        grouped[g] = []
        groupMinOrder[g] = p.displayOrder
      } else {
        groupMinOrder[g] = Math.min(groupMinOrder[g], p.displayOrder)
      }
      grouped[g].push(p)
    }
    return Object.keys(grouped)
      .sort((a, b) => {
        if (!a && !b) return 0
        if (!a) return 1
        if (!b) return -1
        return (groupMinOrder[a] ?? 9999) - (groupMinOrder[b] ?? 9999)
      })
      .map((g) => ({ group: g, entries: grouped[g] }))
  }, [params])

  // Track user edits as a delta map — no useEffect initialization needed.
  // getEffectiveValue falls back to the server value when the user hasn't changed it.
  const [userEdits, setUserEdits] = useState<Map<string, LocalValue>>(new Map())

  function getEffectiveValue(param: RequiredParamEntry): LocalValue {
    if (userEdits.has(param.paramId)) return userEdits.get(param.paramId)!
    return {
      valueNumeric: param.valueNumeric || "",
      valueText: param.valueText || "",
      valueFlag: param.valueFlag,
    }
  }

  const handleChange = useCallback((paramId: string, update: Partial<LocalValue>) => {
    setUserEdits((prev) => {
      const next = new Map(prev)
      next.set(paramId, { ...(next.get(paramId) ?? {}), ...update })
      return next
    })
  }, [])

  async function onSave() {
    const payload: UpsertParamValuePayload[] = params.map((p) => {
      const v = getEffectiveValue(p)
      if (p.dataType === "BOOLEAN") {
        return { productSysId, paramId: p.paramId, valueFlag: v.valueFlag ?? false, hasValueFlag: true }
      }
      if (p.dataType === "NUMBER") {
        return { productSysId, paramId: p.paramId, valueNumeric: v.valueNumeric || "0" }
      }
      return { productSysId, paramId: p.paramId, valueText: v.valueText || "" }
    })
    await upsertM.mutateAsync({ productSysId, values: payload })
    onSaved?.()
  }

  const title = productCode ?? productName ?? `Product ${productSysId}`

  if (isLoading) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold">{title}</p>
        <div className="h-16 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  if (isLocked) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
        🔒 This route is locked. Param values are read-only. Contact an authorized user to unlock.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-0.5">
        <p className="text-sm font-semibold leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground">
          {productName ? `${productName} · ` : ""}
          {params.length} parameter{params.length !== 1 ? "s" : ""}
        </p>
      </div>
      {params.length === 0 ? (
        <p className="text-sm text-muted-foreground">No parameters defined for this product.</p>
      ) : (
        groupedParams.map(({ group, entries }) => (
          <div key={group || "__ungrouped"} className="space-y-4">
            {group && (
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{group}</p>
            )}
            {entries.map((param) => (
              <ParamInput
                key={param.paramId}
                param={param}
                value={getEffectiveValue(param)}
                onChange={(v) => handleChange(param.paramId, v)}
              />
            ))}
          </div>
        ))
      )}
      {params.length > 0 && (
        <div className="flex justify-end pt-2 border-t">
          <Button size="sm" onClick={onSave} disabled={upsertM.isPending}>
            {upsertM.isPending ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="mr-2 h-3.5 w-3.5" />
            )}
            Save
          </Button>
        </div>
      )}
    </div>
  )
}

interface ParamInputProps {
  param: RequiredParamEntry
  value: LocalValue
  onChange: (v: Partial<LocalValue>) => void
}

function ParamInput({ param, value, onChange }: ParamInputProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label className="text-xs font-medium">
          {param.paramCode}
          {param.isRequiredForCosting && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {param.uomCode && (
          <span className="text-[10px] text-muted-foreground">{param.uomCode}</span>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground">{param.paramName}</p>
      {param.dataType === "NUMBER" && (
        <Input
          type="number"
          value={value.valueNumeric ?? ""}
          onChange={(e) => onChange({ valueNumeric: e.target.value })}
          className="h-8 text-sm font-mono"
          placeholder="Enter value"
        />
      )}
      {param.dataType === "TEXT" && (
        <Input
          value={value.valueText ?? ""}
          onChange={(e) => onChange({ valueText: e.target.value })}
          className="h-8 text-sm"
          placeholder="Enter value"
        />
      )}
      {param.dataType === "BOOLEAN" && (
        <div className="flex items-center gap-2">
          <Switch
            checked={value.valueFlag ?? false}
            onCheckedChange={(checked) => onChange({ valueFlag: checked })}
          />
          <span className="text-xs text-muted-foreground">
            {(value.valueFlag ?? false) ? "True" : "False"}
          </span>
        </div>
      )}
    </div>
  )
}
