"use client"

import { useEffect } from "react"
import { AlertCircle } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { useErpJob } from "@/hooks/finance/use-erp-integration"
import { isJobActive, JOB_STATUS_LABELS } from "@/types/finance/oracle-sync"
import { JobStatus } from "@/types/generated/finance/v1/oracle_sync"

interface Props {
  jobId: string
  batchId: number
  /** Called once the job reaches a terminal state that needs no further display. */
  onDone: () => void
}

/** Live progress strip for the background job started from this batch. */
export function ErpJobProgress({ jobId, batchId, onDone }: Props) {
  const { data } = useErpJob(jobId, batchId)
  const job = data?.data
  const status = job?.status
  const terminal = status !== undefined && !isJobActive(status)
  const failed = status === JobStatus.JOB_STATUS_FAILED

  useEffect(() => {
    if (terminal && !failed) onDone()
  }, [terminal, failed, onDone])

  if (!job || (terminal && !failed)) return null
  if (failed) {
    return (
      <Alert variant="destructive" data-testid="job-failed">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Job failed</AlertTitle>
        <AlertDescription>{job.errorMessage || "The background job failed."}</AlertDescription>
      </Alert>
    )
  }
  return (
    <div className="space-y-1" data-testid="job-progress">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{JOB_STATUS_LABELS[job.status]}</span>
        <span className="font-mono">{job.progress}%</span>
      </div>
      <Progress value={job.progress} />
    </div>
  )
}
