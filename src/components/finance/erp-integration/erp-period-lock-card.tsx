"use client"

import { useState } from "react"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Textarea } from "@/components/ui/textarea"
import {
  useErpPeriodLock,
  useLockErpPeriod,
  useUnlockErpPeriod,
} from "@/hooks/finance/use-erp-integration"
import { usePermission } from "@/lib/hooks/use-permission"

const PERIOD_RE = /^\d{4}(0[1-9]|1[0-2])$/
const reasonSchema = z
  .string()
  .trim()
  .min(10, "Reason must be at least 10 characters")
  .max(1000, "Reason must be at most 1000 characters")

function defaultPeriod(): string {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`
}

export function ErpPeriodLockCard() {
  const { hasPermission } = usePermission()
  const canLock = hasPermission("finance.cost.erpintegration.lock")
  const canUnlock = hasPermission("finance.cost.erpintegration.unlock")

  const [period, setPeriod] = useState(defaultPeriod())
  const valid = PERIOD_RE.test(period)
  const lockQuery = useErpPeriodLock(valid ? period : "")
  const lock = useLockErpPeriod()
  const unlock = useUnlockErpPeriod()

  const [action, setAction] = useState<"lock" | "unlock" | null>(null)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  // No data or an error (never locked) is treated as "Not locked".
  const info = lockQuery.data
  const locked = !!info?.locked

  const close = () => {
    setAction(null)
    setReason("")
    setError(null)
  }

  const submit = async () => {
    const parsed = reasonSchema.safeParse(reason)
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }
    try {
      const m = action === "lock" ? lock : unlock
      await m.mutateAsync({ period, reason: parsed.data })
      close()
    } catch {
      // toast already shown by mutation onError
    }
  }

  const pending = lock.isPending || unlock.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle>Period lock (ACTUAL)</CardTitle>
        <CardDescription>
          A LIVE ERP batch can only be created for a period whose ACTUAL cost is locked. Locking stops
          cost recalculation for that period.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="erp-lock-period">Period (YYYYMM)</Label>
          <Input
            id="erp-lock-period"
            value={period}
            maxLength={6}
            onChange={(e) => setPeriod(e.target.value)}
            aria-invalid={!valid}
          />
          {!valid && <p className="text-xs text-destructive">Enter a valid period, e.g. 202606.</p>}
        </div>
        {valid && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={locked ? "default" : "secondary"}>{locked ? "Locked" : "Not locked"}</Badge>
            {locked && info && (
              <span className="text-muted-foreground">
                by {info.lockedBy} at {info.lockedAt} — {info.reason}
              </span>
            )}
          </div>
        )}
        <div className="flex gap-2">
          {valid && !locked && canLock && (
            <Button size="sm" onClick={() => setAction("lock")}>
              Lock period
            </Button>
          )}
          {valid && locked && canUnlock && (
            <Button size="sm" variant="outline" onClick={() => setAction("unlock")}>
              Unlock period
            </Button>
          )}
        </div>
      </CardContent>

      <Dialog open={action !== null} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action === "lock" ? "Lock" : "Unlock"} period {period}</DialogTitle>
            <DialogDescription>
              {action === "lock"
                ? "Locks ACTUAL cost for this period."
                : "Unlock is refused while the ERP ADJ period is already posted."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="erp-lock-reason">Reason</Label>
            <Textarea
              id="erp-lock-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                setError(null)
              }}
              aria-invalid={!!error}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? "Saving…" : action === "lock" ? "Lock period" : "Unlock period"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
