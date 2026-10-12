"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"


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
import { useCreateErpBatch } from "@/hooks/finance/use-erp-integration"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const PERIOD_RE = /^\d{4}(0[1-9]|1[0-2])$/

function defaultPeriod(): string {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`
}

export function CreateBatchDialog({ open, onOpenChange }: Props) {
  const router = useRouter()
  const create = useCreateErpBatch()
  const [period, setPeriod] = useState(defaultPeriod())
  const [needsLock, setNeedsLock] = useState(false)
  const valid = PERIOD_RE.test(period)

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setPeriod(defaultPeriod())
      setNeedsLock(false)
    }
    onOpenChange(next)
  }

  const submit = async () => {
    if (!valid) return
    setNeedsLock(false)
    try {
      const batch = await create.mutateAsync({ period, mode: "LIVE" })
      handleOpenChange(false)
      if (batch?.batchId) router.push(`/finance/erp-integration/${batch.batchId}`)
    } catch (e) {
      // The mutation's onError already shows the error toast; add an inline hint only.
      if (e instanceof Error && /not locked/i.test(e.message)) setNeedsLock(true)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create ERP batch</DialogTitle>
          <DialogDescription>
            Creates a LIVE batch for a period. SHADOW batches are created by running a backtest.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="erp-batch-period">Period (YYYYMM)</Label>
            <Input
              id="erp-batch-period"
              value={period}
              maxLength={6}
              onChange={(e) => setPeriod(e.target.value)}
              aria-invalid={!valid}
            />
            {!valid && <p className="text-xs text-destructive">Enter a valid period, e.g. 202606.</p>}
            {needsLock && (
              <p className="text-xs text-destructive">
                Period {period} is not locked. Lock it first in the Period lock card, then create the batch.
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Mode</Label>
            <Input value="LIVE" disabled readOnly />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={create.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!valid || create.isPending}>
            {create.isPending ? "Creating…" : "Create batch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
