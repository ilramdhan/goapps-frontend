"use client"

// V2: Group head marketing inputs editor (defaults applied at next calc).
// NOTE: appears unused (no import sites beyond this file's own definition and
// the barrel re-export in ./index.ts) — confirmed dead code as of the
// rm-group-period-versioning change. Intentionally left untouched (not
// deleted): removal is out of scope for that change and needs product
// confirmation first.

import { useState } from "react"
import { Loader2, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { RMGroupHead } from "@/types/finance/rm-group"
import {
  RM_VALUATION_FLAG_OPTIONS,
  RM_MARKETING_FLAG_OPTIONS,
} from "@/types/finance/rm-group"
import {
  RMValuationFlag,
  RMMarketingFlag,
} from "@/types/generated/finance/v1/rm_group"
import { useUpdateRMGroup } from "@/hooks/finance/use-rm-group"

interface GroupV2MarketingCardProps {
  group: RMGroupHead
  period: string
}

function toStr(v: number | undefined): string {
  if (v === undefined || v === null) return ""
  return String(v)
}

function toNumOrUndef(v: string): number | undefined {
  if (v.trim() === "") return undefined
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : undefined
}

export function GroupV2MarketingCard({ group, period }: GroupV2MarketingCardProps) {
  const [freight, setFreight] = useState(toStr(group.marketingFreightRate))
  const [anti, setAnti] = useState(toStr(group.marketingAntiDumpingPct))
  const [defaultVal, setDefaultVal] = useState(toStr(group.marketingDefaultValue))
  const [valFlag, setValFlag] = useState<RMValuationFlag>(
    (group.valuationFlag ?? RMValuationFlag.RM_VALUATION_FLAG_UNSPECIFIED) as RMValuationFlag,
  )
  const [mktFlag, setMktFlag] = useState<RMMarketingFlag>(
    (group.marketingFlag ?? RMMarketingFlag.RM_MARKETING_FLAG_UNSPECIFIED) as RMMarketingFlag,
  )

  // Initial state derived from group prop. Caller can remount via key={group.groupHeadId}
  // if the underlying group changes (rare on this page).

  const updateMutation = useUpdateRMGroup()

  const save = async () => {
    await updateMutation.mutateAsync({
      id: group.groupHeadId,
      data: {
        groupHeadId: group.groupHeadId,
        period,
        marketingFreightRate: toNumOrUndef(freight),
        marketingAntiDumpingPct: toNumOrUndef(anti),
        marketingDefaultValue: toNumOrUndef(defaultVal),
        valuationFlag: valFlag,
        marketingFlag: mktFlag,
        clearMarketingFreightRate: freight.trim() === "",
        clearMarketingAntiDumpingPct: anti.trim() === "",
        clearMarketingDefaultValue: defaultVal.trim() === "",
        clearInitValValuation: false,
        clearInitValMarketing: false,
        clearInitValSimulation: false,
      },
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Marketing Inputs (V2)</CardTitle>
        <CardDescription className="text-xs">
          Defaults applied to new RM Cost rows at next calculation. Each row remains
          editable on the cost detail screen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Marketing Freight Rate</Label>
            <Input
              type="number"
              step="0.0001"
              value={freight}
              onChange={(e) => setFreight(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Anti Dumping %</Label>
            <Input
              type="number"
              step="0.01"
              value={anti}
              onChange={(e) => setAnti(e.target.value)}
              placeholder="e.g. 5"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Marketing Default Value</Label>
            <Input
              type="number"
              step="0.0001"
              value={defaultVal}
              onChange={(e) => setDefaultVal(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Valuation Flag</Label>
            <Select value={String(valFlag)} onValueChange={(v) => setValFlag(Number(v) as RMValuationFlag)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RM_VALUATION_FLAG_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Marketing Flag</Label>
            <Select value={String(mktFlag)} onValueChange={(v) => setMktFlag(Number(v) as RMMarketingFlag)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RM_MARKETING_FLAG_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={save} disabled={updateMutation.isPending} size="sm">
          {updateMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Marketing Inputs
        </Button>
      </CardContent>
    </Card>
  )
}
