"use client"

import { ConfirmDialog } from "@/components/shared"
import type { PlanItem } from "@/types/ppc/plan-item"
import { useDeletePlanItem } from "@/hooks/ppc/use-plan-item"

interface PlanItemDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planItem: PlanItem | null
  onSuccess?: () => void
}

export function PlanItemDeleteDialog({
  open,
  onOpenChange,
  planItem,
  onSuccess,
}: PlanItemDeleteDialogProps) {
  const deleteMutation = useDeletePlanItem()

  const handleDelete = async () => {
    if (!planItem) return
    try {
      await deleteMutation.mutateAsync(String(planItem.planItemId))
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("Failed to delete plan item:", error)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Plan Item"
      description={`Are you sure you want to delete the plan item for "${planItem?.productCode}" (${planItem?.productName})? This action cannot be undone.`}
      variant="destructive"
      isLoading={deleteMutation.isPending}
      confirmText="Delete"
      onConfirm={handleDelete}
    />
  )
}
