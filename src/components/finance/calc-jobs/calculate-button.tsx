"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Calculator } from "lucide-react"

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
import { useTriggerCalcJob } from "@/hooks/finance/use-cost-calc"
import { usePermissionContext } from "@/providers/permission-provider"
import type { CalcJobScope, CalculationType } from "@/types/finance/cost-calc"

interface CalculateButtonProps {
  // Exactly one of productSysId / routeHeadId must be set.
  productSysId?: number
  routeHeadId?: number
  label?: string
  variant?: "default" | "outline" | "secondary"
  size?: "default" | "sm" | "lg"
  disabled?: boolean
  disabledReason?: string
}

function currentPeriod(): string {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`
}

export function CalculateButton(props: CalculateButtonProps) {
  const { hasPermission } = usePermissionContext()
  const router = useRouter()
  const trigger = useTriggerCalcJob()
  const [open, setOpen] = useState(false)
  const [period, setPeriod] = useState(currentPeriod())
  const [calcType, setCalcType] = useState<CalculationType>("ACTUAL")

  if (!hasPermission("finance.cost.caljob.trigger")) return null
  if (!props.productSysId && !props.routeHeadId) return null

  const periodValid = /^\d{6}$/.test(period)
  const canSubmit = periodValid && !trigger.isPending

  const handleSubmit = async () => {
    const scope: CalcJobScope = props.routeHeadId ? "SINGLE_ROUTE" : "SINGLE_PRODUCT"
    const job = await trigger.mutateAsync({
      period,
      calculationType: calcType,
      scope,
      productSysId: props.productSysId ?? 0,
      routeHeadId: props.routeHeadId ?? 0,
    })
    setOpen(false)
    router.push(`/finance/calc-jobs/${job.jobId}`)
  }

  return (
    <>
      <Button
        variant={props.variant ?? "outline"}
        size={props.size ?? "default"}
        onClick={() => setOpen(true)}
        disabled={props.disabled}
        title={props.disabled ? props.disabledReason : undefined}
      >
        <Calculator className="mr-2 h-4 w-4" />
        {props.label ?? "Calculate"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trigger cost calculation</DialogTitle>
            <DialogDescription>
              {props.routeHeadId
                ? "Computes cost for this route's product across the selected period."
                : "Computes cost for this product across the selected period."}
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
              />
              {!periodValid && period && (
                <p className="text-xs text-destructive">Period must be 6 digits (YYYYMM)</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Calculation type</Label>
              <Select value={calcType} onValueChange={(v) => setCalcType(v as CalculationType)}>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {trigger.isPending ? "Triggering..." : "Trigger"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
