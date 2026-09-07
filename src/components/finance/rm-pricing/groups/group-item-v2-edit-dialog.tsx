"use client"

// V2: Per-detail valuation inputs editor (freight / anti / duty / transport / default).

import { useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import type { RMGroupDetail } from "@/types/finance/rm-group"
import { useUpdateGroupItem } from "@/hooks/finance/use-rm-group-items"

interface GroupItemV2EditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  detail: RMGroupDetail | null
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

/** Decimal stored (0.04) → whole-percent UI string ("4"). */
function pctStrFromDecimal(v: number | undefined): string {
  if (v === undefined || v === null) return ""
  return String(Math.round(v * 100 * 1e6) / 1e6)
}

/** Whole-percent UI string ("4") → decimal storage (0.04). */
function decimalFromPctStr(v: string): number | undefined {
  if (v.trim() === "") return undefined
  const n = parseFloat(v)
  if (!Number.isFinite(n)) return undefined
  return Math.round((n / 100) * 1e8) / 1e8
}

export function GroupItemV2EditDialog({ open, onOpenChange, detail, period }: GroupItemV2EditDialogProps) {
  if (!detail) return null
  // Render the inner dialog with the detail-keyed remount pattern so initial
  // state always derives from the current detail row.
  return (
    <GroupItemV2EditDialogInner
      key={`${detail.groupDetailId}::${period}`}
      open={open}
      onOpenChange={onOpenChange}
      detail={detail}
      period={period}
    />
  )
}

interface GroupItemV2EditDialogInnerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  detail: RMGroupDetail
  period: string
}

function GroupItemV2EditDialogInner({ open, onOpenChange, detail, period }: GroupItemV2EditDialogInnerProps) {
  const [freight, setFreight] = useState(toStr(detail.valuationFreightRate))
  // anti / duty are stored as decimal (0.04) but displayed as whole percent (4).
  const [antiPct, setAntiPct] = useState(pctStrFromDecimal(detail.valuationAntiDumpingPct))
  const [dutyPct, setDutyPct] = useState(pctStrFromDecimal(detail.valuationDutyPct))
  const [transport, setTransport] = useState(toStr(detail.valuationTransportRate))
  const [defaultVal, setDefaultVal] = useState(toStr(detail.valuationDefaultValue))
  const updateMutation = useUpdateGroupItem()

  const save = async () => {
    await updateMutation.mutateAsync({
      groupHeadId: detail.groupHeadId,
      groupDetailId: detail.groupDetailId,
      period,
      valuationFreightRate: toNumOrUndef(freight),
      valuationAntiDumpingPct: decimalFromPctStr(antiPct),
      valuationDutyPct: decimalFromPctStr(dutyPct),
      valuationTransportRate: toNumOrUndef(transport),
      valuationDefaultValue: toNumOrUndef(defaultVal),
      clearValuationFreightRate: freight.trim() === "",
      clearValuationAntiDumpingPct: antiPct.trim() === "",
      clearValuationDutyPct: dutyPct.trim() === "",
      clearValuationTransportRate: transport.trim() === "",
      clearValuationDefaultValue: defaultVal.trim() === "",
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Valuation inputs — {detail.itemCode}
            {detail.gradeCode ? ` / ${detail.gradeCode}` : ""}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Per-detail freight / anti-dumping / duty / transport / fix value (V2 valuation engine).
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Freight Rate</Label>
            <Input
              type="number"
              step="0.0001"
              value={freight}
              onChange={(e) => setFreight(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Anti Dumping % (e.g. 10 for 10%)</Label>
            <Input
              type="number"
              step="0.01"
              value={antiPct}
              onChange={(e) => setAntiPct(e.target.value)}
              placeholder="10"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Duty % (e.g. 4 for 4%)</Label>
            <Input
              type="number"
              step="0.01"
              value={dutyPct}
              onChange={(e) => setDutyPct(e.target.value)}
              placeholder="4"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Transport Rate</Label>
            <Input
              type="number"
              step="0.0001"
              value={transport}
              onChange={(e) => setTransport(e.target.value)}
              placeholder="0.0"
            />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Default Value (drives FL when set)</Label>
            <Input
              type="number"
              step="0.0001"
              value={defaultVal}
              onChange={(e) => setDefaultVal(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
