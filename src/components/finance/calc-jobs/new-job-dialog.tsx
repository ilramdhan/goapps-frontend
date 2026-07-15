"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ProductTypeCombobox } from "@/components/finance/comboboxes"
import { useTriggerCalcJob } from "@/hooks/finance/use-cost-calc"
import type { CalcJobScope, CalculationType } from "@/types/finance/cost-calc"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function defaultPeriod(): string {
  // Default to previous month — calc usually runs against a closed period.
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  return `${y}${m}`
}

export function NewJobDialog({ open, onOpenChange }: Props) {
  const router = useRouter()
  const trigger = useTriggerCalcJob()
  const [period, setPeriod] = useState(defaultPeriod())
  const [calcType, setCalcType] = useState<CalculationType>("ACTUAL")
  const [scope, setScope] = useState<CalcJobScope>("ALL")
  const [productTypeId, setProductTypeId] = useState<number | undefined>(undefined)

  // Reset form state whenever the dialog closes so reopening doesn't carry
  // over previously-entered values.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setPeriod(defaultPeriod())
      setCalcType("ACTUAL")
      setScope("ALL")
      setProductTypeId(undefined)
    }
    onOpenChange(next)
  }

  const periodValid = /^\d{6}$/.test(period)
  const filteredNeedsType = scope === "FILTERED" && !productTypeId
  const canSubmit = periodValid && !filteredNeedsType && !trigger.isPending

  const handleSubmit = async () => {
    if (!canSubmit) return
    const job = await trigger.mutateAsync({
      period,
      calculationType: calcType,
      scope,
      productTypeIdFilter: scope === "FILTERED" ? productTypeId : undefined,
    })
    handleOpenChange(false)
    router.push(`/finance/calc-jobs/${job.jobId}`)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Trigger a calc job</DialogTitle>
          <DialogDescription>
            Creates a new calc job. ALL covers every active product;
            FILTERED restricts to a single product type. SINGLE_PRODUCT and
            SINGLE_ROUTE are triggered from product / route detail pages.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="calc-period">Period</Label>
            <Input
              id="calc-period"
              placeholder="YYYYMM"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              maxLength={6}
              className="w-40 font-mono"
            />
            {!periodValid && period && (
              <p className="text-xs text-destructive">Period must be 6 digits (YYYYMM)</p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Calculation type</Label>
            <Select
              value={calcType}
              onValueChange={(v) => setCalcType(v as CalculationType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTUAL">Actual (Valuation Rate)</SelectItem>
                <SelectItem value="FORECAST">Forecast (Marketing Rate)</SelectItem>
                <SelectItem value="SELLING">Selling (Simulation Rate)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Scope</Label>
            <Select
              value={scope}
              onValueChange={(v) => {
                setScope(v as CalcJobScope)
                if (v !== "FILTERED") setProductTypeId(undefined)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All products</SelectItem>
                <SelectItem value="FILTERED">Filtered by product type</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scope === "FILTERED" && (
            <div className="space-y-1">
              <Label>Product type</Label>
              <ProductTypeCombobox
                value={productTypeId}
                onChange={(typeId) => setProductTypeId(typeId)}
                placeholder="Pick a product type…"
              />
              {filteredNeedsType && (
                <p className="text-xs text-destructive">Required for FILTERED scope</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {trigger.isPending ? "Triggering…" : "Trigger"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
