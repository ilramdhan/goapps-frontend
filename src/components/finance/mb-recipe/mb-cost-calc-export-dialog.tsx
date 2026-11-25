"use client"

// Period picker for "Export MB Cost Calc Detail". Empty period = backend picks the
// latest snapshot (old behaviour), which can be stale / show RM rate 0 — so we
// default to the first listed period instead.
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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCostResultPeriods } from "@/hooks/finance/use-cost-calc"

export const LATEST_AUTO = "__latest__"

/** Default selection: first (latest) period, or auto when none are listed. */
export function pickDefaultPeriod(periods: string[]): string {
  return periods[0] ?? LATEST_AUTO
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  isPending?: boolean
  /** period is "" for latest (auto). */
  onConfirm: (period: string) => void
}

export function MbCostCalcExportDialog({ open, onOpenChange, isPending, onConfirm }: Props) {
  const { data } = useCostResultPeriods()
  const periods = data?.periods
  // null = user has not chosen; fall back to the derived default (reset on close).
  const [choice, setChoice] = useState<string | null>(null)
  const value = choice ?? pickDefaultPeriod(periods ?? [])
  const setValue = setChoice

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setChoice(null)
        onOpenChange(o)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export MB Cost Calc Detail</DialogTitle>
          <DialogDescription>
            Choose the cost period to export. &quot;Latest (auto)&quot; uses the newest snapshot, which may be
            incomplete (e.g. RM rate 0).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="cost-calc-export-period">Period</Label>
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger id="cost-calc-export-period" aria-label="Period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={LATEST_AUTO}>Latest (auto)</SelectItem>
              {(periods ?? []).map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={isPending} onClick={() => onConfirm(value === LATEST_AUTO ? "" : value)}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
