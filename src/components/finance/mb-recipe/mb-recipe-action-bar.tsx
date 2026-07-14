"use client"

// MbRecipeActionBar — status-gated workflow transition buttons for an MB Head.
import { useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ReasonDialog } from "@/components/finance/cost-product-request/transition-dialogs"
import {
  useSubmitMBHead,
  useApproveMBHead,
  useValidateMBHead,
  useUnApproveMBHead,
  useRevokeMBHead,
} from "@/hooks/finance/use-mb-head"
import type { MBHead, MBHeadEntryStatus } from "@/types/finance/mb-head"

interface Props {
  mbHead: MBHead
}

export function MbRecipeActionBar({ mbHead }: Props) {
  const status = mbHead.entryStatus as MBHeadEntryStatus
  const [reasonDialog, setReasonDialog] = useState<"unapprove" | "revoke" | null>(null)

  const submitM = useSubmitMBHead()
  const approveM = useApproveMBHead()
  const validateM = useValidateMBHead()
  const unApproveM = useUnApproveMBHead()
  const revokeM = useRevokeMBHead()

  const canSubmit = status === "DRAFT"
  const canValidateDirect = status === "DRAFT" && mbHead.isBoughtout
  const canApprove = status === "SUBMITTED" || status === "UN_APPROVED"
  const canValidate = status === "APPROVED"
  const canUnApprove = status === "APPROVED"
  const canRevoke = status !== "REVOKED"

  if (!canSubmit && !canValidateDirect && !canApprove && !canValidate && !canUnApprove && !canRevoke) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canSubmit && (
        <Button size="sm" disabled={submitM.isPending} onClick={() => submitM.mutate(mbHead.mbhId)}>
          {submitM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit
        </Button>
      )}
      {canValidateDirect && (
        <Button size="sm" disabled={validateM.isPending} onClick={() => validateM.mutate(mbHead.mbhId)}>
          {validateM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Validate
        </Button>
      )}
      {canApprove && (
        <Button size="sm" disabled={approveM.isPending} onClick={() => approveM.mutate(mbHead.mbhId)}>
          {approveM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Approve
        </Button>
      )}
      {canValidate && (
        <Button size="sm" disabled={validateM.isPending} onClick={() => validateM.mutate(mbHead.mbhId)}>
          {validateM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Validate
        </Button>
      )}
      {canUnApprove && (
        <Button size="sm" variant="outline" onClick={() => setReasonDialog("unapprove")}>
          Un-approve
        </Button>
      )}
      {canRevoke && (
        <Button size="sm" variant="destructive" onClick={() => setReasonDialog("revoke")}>
          Revoke
        </Button>
      )}

      <ReasonDialog
        open={reasonDialog === "unapprove"}
        onOpenChange={(o) => !o && setReasonDialog(null)}
        title="Un-approve MB Head"
        description="This reverts the MB Head from Approved back to Un-approved. A reason is required."
        confirmLabel="Un-approve"
        pending={unApproveM.isPending}
        onConfirm={(reason) => {
          unApproveM.mutate({ mbhId: mbHead.mbhId, reason }, { onSuccess: () => setReasonDialog(null) })
        }}
      />

      <ReasonDialog
        open={reasonDialog === "revoke"}
        onOpenChange={(o) => !o && setReasonDialog(null)}
        title="Revoke MB Head"
        description="This permanently revokes the MB Head. This action cannot be undone. A reason is required."
        confirmLabel="Revoke"
        pending={revokeM.isPending}
        onConfirm={(reason) => {
          revokeM.mutate({ mbhId: mbHead.mbhId, reason }, { onSuccess: () => setReasonDialog(null) })
        }}
      />
    </div>
  )
}
