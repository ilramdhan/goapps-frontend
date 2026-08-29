"use client"

import { ConfirmDialog } from "@/components/shared"
import type { MBSpin } from "@/types/finance/mb-spin"
import { useDuplicateMBSpin } from "@/hooks/finance/use-mb-spin"

interface MBSpinDuplicateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mbSpin: MBSpin | null
  onSuccess?: () => void
}

// Confirms RPC DuplicateMBSpin (P8): clones mbSpin into a fresh "R and D" draft
// child, mbs_orion_item_code always NULL on the clone. No overrides are collected
// here — the resulting draft is edited afterwards via the existing MB Spin form
// dialog, not a new one (a separate "RND/Calculated/Actual" duplicate mechanism is
// undecided and out of scope for this button).
export function MBSpinDuplicateDialog({ open, onOpenChange, mbSpin, onSuccess }: MBSpinDuplicateDialogProps) {
  const duplicateMutation = useDuplicateMBSpin()

  const handleDuplicate = async () => {
    if (!mbSpin) return
    try {
      await duplicateMutation.mutateAsync({ mbhId: mbSpin.mbsMbhId, mbsId: mbSpin.mbsId })
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
      title="Duplicate MB Spin"
      description={`Create a new "R and D" draft cloned from "${mbSpin?.mbsMgtName}"? You can edit the copy afterwards.`}
      isLoading={duplicateMutation.isPending}
      confirmText="Duplicate"
      onConfirm={handleDuplicate}
    />
  )
}
