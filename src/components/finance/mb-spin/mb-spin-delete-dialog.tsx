"use client"

import { ConfirmDialog } from "@/components/shared"
import type { MBSpin } from "@/types/finance/mb-spin"
import { useDeleteMBSpin } from "@/hooks/finance/use-mb-spin"

interface MBSpinDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mbSpin: MBSpin | null
  onSuccess?: () => void
}

export function MBSpinDeleteDialog({ open, onOpenChange, mbSpin, onSuccess }: MBSpinDeleteDialogProps) {
  const deleteMutation = useDeleteMBSpin()

  const handleDelete = async () => {
    if (!mbSpin) return
    try {
      await deleteMutation.mutateAsync({ mbsId: mbSpin.mbsId, mbhId: mbSpin.mbsMbhId })
      onOpenChange(false)
      onSuccess?.()
    } catch {
      // toast handled in hook
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete MB Spin"
      description={`Delete MB Spin "${mbSpin?.mbsMgtName}"? This action cannot be undone.`}
      variant="destructive"
      isLoading={deleteMutation.isPending}
      confirmText="Delete"
      onConfirm={handleDelete}
    />
  )
}
