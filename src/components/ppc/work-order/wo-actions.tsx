"use client"

import { useState } from "react"
import { Send, CheckCircle2, ShieldCheck, XCircle, Copy } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

import { WOSubmitDialog } from "./wo-submit-dialog"
import { WOApproveParameterDialog } from "./wo-approve-parameter-dialog"
import { WORejectDialog } from "./wo-reject-dialog"
import { WOReferenceDialog } from "./wo-reference-dialog"

import type { WorkOrder } from "@/types/ppc/work-order"
import { WOStatus } from "@/types/ppc/common"
import { useApproveWO } from "@/hooks/ppc/use-work-order"

interface WOActionsProps {
  workOrder: WorkOrder
}

function formatDateTime(iso: string): string {
  if (!iso) return "-"
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
}

export function WOActions({ workOrder }: WOActionsProps) {
  const approveMutation = useApproveWO()
  const [submitOpen, setSubmitOpen] = useState(false)
  const [pcApproveOpen, setPcApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [referenceOpen, setReferenceOpen] = useState(false)

  const status = workOrder.status
  const isDraft = status === WOStatus.WO_STATUS_DRAFT
  const isSubmitted = status === WOStatus.WO_STATUS_SUBMITTED
  const isPcApproved = status === WOStatus.WO_STATUS_PC_APPROVED
  const canReject = isSubmitted || isPcApproved

  const handlePmApprove = () => {
    // Sequential: PM only after PC. Guarded by disabled state below too.
    approveMutation.mutate({ woId: workOrder.woId, approvalSide: "PM" })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2">
          {isDraft && (
            <Button onClick={() => setSubmitOpen(true)}>
              <Send className="mr-2 h-4 w-4" />
              Submit for Approval
            </Button>
          )}

          {isSubmitted && (
            <Button onClick={() => setPcApproveOpen(true)}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve Parameters (PC)
            </Button>
          )}

          {/* PM approve — sequential: disabled until PC_APPROVED. */}
          <Button
            variant="secondary"
            onClick={handlePmApprove}
            disabled={!isPcApproved || approveMutation.isPending}
            title={!isPcApproved ? "Requires PC approval first" : undefined}
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            Approve (PM)
          </Button>

          {canReject && (
            <Button variant="destructive" onClick={() => setRejectOpen(true)}>
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
          )}

          <Button variant="outline" onClick={() => setReferenceOpen(true)}>
            <Copy className="mr-2 h-4 w-4" />
            Create Reference
          </Button>
        </div>

        <Separator />

        {/* Sequential approval trace. */}
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Submitted</p>
            <p>{formatDateTime(workOrder.submittedAt)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">PC Approved</p>
            <p>{formatDateTime(workOrder.pcApprovedAt)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">PM Approved</p>
            <p>{formatDateTime(workOrder.pmApprovedAt)}</p>
          </div>
        </div>
      </CardContent>

      <WOSubmitDialog open={submitOpen} onOpenChange={setSubmitOpen} workOrder={workOrder} />
      <WOApproveParameterDialog
        open={pcApproveOpen}
        onOpenChange={setPcApproveOpen}
        workOrder={workOrder}
      />
      <WORejectDialog open={rejectOpen} onOpenChange={setRejectOpen} workOrder={workOrder} />
      <WOReferenceDialog open={referenceOpen} onOpenChange={setReferenceOpen} workOrder={workOrder} />
    </Card>
  )
}
