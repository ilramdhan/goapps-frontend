"use client"

import { ConfirmDialog } from "@/components/shared"
import type { PlanItem } from "@/types/ppc/plan-item"
import { useConfirmPlanItem } from "@/hooks/ppc/use-plan-item"

interface PlanItemConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planItem: PlanItem | null
  onSuccess?: () => void
}

/**
 * Confirms a DRAFT plan item (DRAFT → CONFIRMED, sent as the proto value
 * PLAN_ITEM_STATUS_ACTIVE). Errors surface as a toast from the hook, so a
 * failure leaves the dialog open for a retry.
 */
export function PlanItemConfirmDialog({
  open,
  onOpenChange,
  planItem,
  onSuccess,
}: PlanItemConfirmDialogProps) {
  const confirmMutation = useConfirmPlanItem()

  const handleConfirm = async () => {
    if (!planItem) return
    try {
      await confirmMutation.mutateAsync(planItem)
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("Failed to confirm plan item:", error)
    }
  }

  const label = planItem?.productName || planItem?.productCode || "this plan item"

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Confirm Plan Item"
      description={`Confirm the plan item for "${label}"? It becomes part of the living monthly plan and can no longer return to draft.`}
      variant="success"
      isLoading={confirmMutation.isPending}
      confirmText="Confirm"
      onConfirm={handleConfirm}
    />
  )
}
