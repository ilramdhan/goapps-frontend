"use client"

import { useState } from "react"
import { FlaskConical } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { usePermission } from "@/lib/hooks/use-permission"
import { useErpJob, useRunErpBacktest } from "@/hooks/finance/use-erp-integration"

export const BACKTEST_PERIODS = ["202604", "202605", "202606", "202607", "202608", "202609"]
const EXCLUDED: Record<string, string> = { "202605": "Excluded until E-11 (F-10)" }

export function ErpBacktestPanel() {
  const { hasPermission } = usePermission()
  const canView = hasPermission("finance.cost.erpintegration.view")
  const canTrigger = hasPermission("finance.cost.erpintegration.trigger")
  const [period, setPeriod] = useState("202604")
  const [ref, setRef] = useState<{ jobId: string; batchId: number } | null>(null)
  const run = useRunErpBacktest()
  const { data: job } = useErpJob(ref?.jobId ?? "", ref?.batchId)

  if (!canView) return null

  const start = async () => {
    try {
      const r = await run.mutateAsync({ period })
      setRef({ jobId: r.jobId, batchId: r.batchId })
    } catch {
      // toast already shown by mutation onError
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className="h-4 w-4" /> Backtest (SHADOW)
        </CardTitle>
        <CardDescription>
          Compares GoApps standard cost with legacy for a period. Never pushes to Oracle.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label htmlFor="erp-backtest-period" className="text-xs text-muted-foreground">
              Period
            </label>
            <select
              id="erp-backtest-period"
              aria-label="Backtest period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="h-9 w-40 rounded-md border bg-transparent px-2 text-sm"
            >
              {BACKTEST_PERIODS.map((p) => (
                <option key={p} value={p} disabled={p in EXCLUDED} title={EXCLUDED[p]}>
                  {p in EXCLUDED ? `${p} — ${EXCLUDED[p]}` : p}
                </option>
              ))}
            </select>
          </div>
          {canTrigger && (
            <Button onClick={start} disabled={run.isPending || period in EXCLUDED}>
              {run.isPending ? "Starting…" : "Run backtest"}
            </Button>
          )}
        </div>
        {ref && (
          <div className="space-y-1">
            <Progress value={job?.data?.progress ?? 0} />
            <p className="text-xs text-muted-foreground">
              Job {ref.jobId}: {job?.data?.progress ?? 0}%
              {job?.data?.errorMessage ? ` — ${job.data.errorMessage}` : ""}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
