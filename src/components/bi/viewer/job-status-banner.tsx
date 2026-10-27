"use client"

// Workforce dashboards: "data per run terakhir" + warning when the latest ETL run failed (PRD §8, H014).

import { AlertTriangle } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useEtlStatus } from "@/hooks/bi/use-etl-status"

const fmt = (d?: Date | string) => {
  if (!d) return undefined
  const date = typeof d === "string" ? new Date(d) : d
  return isNaN(date.getTime())
    ? undefined
    : date.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" }) + " WIB"
}

const time = (d?: Date | string) => (d ? new Date(d).getTime() || 0 : 0)

/** Shows the latest successful HR ETL run and a banner when the most recent run failed. */
export function JobStatusBanner() {
  // Server returns only ETL_HR_* jobs (HD-27), so no client-side filtering or log lookup is needed.
  const { data: jobs, error } = useEtlStatus()
  const hrJobs = jobs ?? []

  // Most recently executed job decides whether to warn.
  const latest = [...hrJobs].sort((a, b) => time(b.lastRunAt) - time(a.lastRunAt))[0]
  const failed = latest?.lastStatus === "FAILED"

  const lastSuccess = [...hrJobs.map(j => j.lastSuccessAt).filter(Boolean) as Date[]].sort(
    (a, b) => time(b) - time(a)
  )[0]

  // The banner is informational only: any error (including 403 without etlstatus.view) hides it quietly.
  if (error || hrJobs.length === 0) return null

  return (
    <div className="space-y-3">
      <Badge variant="outline" className="gap-1.5 font-normal">
        <span className={`h-2 w-2 rounded-full ${lastSuccess ? "bg-emerald-500" : "bg-muted-foreground"}`} />
        {lastSuccess ? `Data per ${fmt(lastSuccess)}` : "Belum ada run sukses"}
      </Badge>
      {failed && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Run data terakhir gagal</AlertTitle>
          <AlertDescription>
            Job {latest?.jobName} gagal pada {fmt(latest?.lastRunAt) ?? "-"}. Data di dashboard ini
            {lastSuccess ? ` masih dari run sukses ${fmt(lastSuccess)}` : " mungkin belum lengkap"}; hubungi admin BI.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
