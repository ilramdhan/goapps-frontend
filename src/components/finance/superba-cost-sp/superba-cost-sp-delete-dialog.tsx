"use client"

import { ConfirmDialog } from "@/components/shared/confirm-dialog/confirm-dialog"
import type { SuperbaCostSp } from "@/types/finance/superba-cost-sp"
import { useDeleteSuperbaCostSp } from "@/hooks/finance/use-superba-cost-sp"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: SuperbaCostSp | null
}

export function SuperbaCostSpDeleteDialog({ open, onOpenChange, row }: Props) {
  const mutation = useDeleteSuperbaCostSp()
  if (!row) return null

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Superba Cost SP"
      description={`Shade "${row.shadeCode}" (Legacy Sys Id ${row.legacySysId}) will be deleted. SUPERBA products that depend on it may be blocked from costing (MISSING_SUPERBA_COST) until another row exists for the shade.`}
      variant="destructive"
      isLoading={mutation.isPending}
      confirmText="Delete"
      onConfirm={() =>
        mutation.mutate(row.id, {
          onSuccess: () => onOpenChange(false),
        })
      }
    />
  )
}
