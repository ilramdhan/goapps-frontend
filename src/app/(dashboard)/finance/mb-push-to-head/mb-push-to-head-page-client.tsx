"use client"

import { useState } from "react"
import { Loader2, PlayCircle } from "lucide-react"

import { PageHeader } from "@/components/common/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConfirmDialog } from "@/components/shared/confirm-dialog/confirm-dialog"
import { MbPushPreviewPanel, MbPushLogTable } from "@/components/finance/mb-push"
import { useMbPushLogs } from "@/hooks/finance/use-mb-push"
import { useTriggerMbBatch } from "@/hooks/finance/use-mb-batch"
import { usePermissionContext } from "@/providers/permission-provider"

function currentPeriod(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  return `${y}${m}`
}

export default function MbPushToHeadPageClient() {
  const [period, setPeriod] = useState(currentPeriod())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { data: logData, isLoading: logsLoading } = useMbPushLogs({ page: 1, pageSize: 20 })
  const { hasPermission } = usePermissionContext()
  const triggerBatch = useTriggerMbBatch()

  const periodValid = /^\d{6}$/.test(period)
  const canTrigger = hasPermission("finance.mb.batch.trigger")

  return (
    <div className="space-y-6">
      <PageHeader title="MB Push to Head" subtitle="Push finalized MB batch costs into the product cost head." />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Period</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="max-w-[200px] space-y-1">
              <Label htmlFor="push-period">Period (YYYYMM)</Label>
              <Input
                id="push-period"
                value={period}
                onChange={(e) => setPeriod(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                placeholder="e.g., 202601"
                maxLength={6}
                className="font-mono"
              />
            </div>

            {canTrigger && (
              <Button
                variant="outline"
                size="sm"
                disabled={!periodValid || triggerBatch.isPending}
                onClick={() => setConfirmOpen(true)}
              >
                {triggerBatch.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PlayCircle className="mr-2 h-4 w-4" />
                )}
                Trigger MB Batch
              </Button>
            )}
          </div>

          {period.length === 6 ? (
            <MbPushPreviewPanel period={period} />
          ) : (
            <p className="text-sm text-muted-foreground">Enter a 6-digit period to preview pushable MB Heads.</p>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Trigger MB Batch"
        description={`This computes costs for all VALIDATED MB heads in period ${period}. This may take a while.`}
        confirmText="Trigger"
        isLoading={triggerBatch.isPending}
        onConfirm={async () => {
          await triggerBatch.mutateAsync(period)
          setConfirmOpen(false)
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Push History</CardTitle>
        </CardHeader>
        <CardContent>
          <MbPushLogTable items={logData?.items ?? []} isLoading={logsLoading} />
        </CardContent>
      </Card>
    </div>
  )
}
