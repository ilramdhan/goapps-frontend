"use client"

import { ConfirmDialog } from "@/components/shared"
import { type SpinFixedCost, formatPeriod } from "@/types/finance/spin-fixed-cost"
import { useDeleteSpinFixedCost } from "@/hooks/finance/use-spin-fixed-cost"

interface SpinFixedCostDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  spinFixedCost: SpinFixedCost | null
  onSuccess?: () => void
}

export function SpinFixedCostDeleteDialog({
  open,
  onOpenChange,
  spinFixedCost,
  onSuccess,
}: SpinFixedCostDeleteDialogProps) {
  const deleteMutation = useDeleteSpinFixedCost()

  const handleDelete = async () => {
    if (!spinFixedCost) return

    try {
      // The backend refuses a delete that would leave the calc engine without a
      // pool row; that message is toasted verbatim by the mutation's onError.
      await deleteMutation.mutateAsync(spinFixedCost.id)
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("Failed to delete Spin Fixed Cost:", error)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Spin Fixed Cost"
      description={
        `Delete the POY spinning fixed-cost pool for ${formatPeriod(spinFixedCost?.period || "")}? ` +
        "Every POY product costed against this period uses this pool. " +
        "The deletion is refused if it would leave the calc engine with no pool row. " +
        "This action cannot be undone."
      }
      variant="destructive"
      isLoading={deleteMutation.isPending}
      confirmText="Delete"
      onConfirm={handleDelete}
    />
  )
}
