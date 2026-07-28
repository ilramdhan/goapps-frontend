"use client"

import { ConfirmDialog } from "@/components/shared"
import type { Demand } from "@/types/ppc/demand"
import { useDeleteDemand } from "@/hooks/ppc/use-demand"

interface DemandDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  demand: Demand | null
  onSuccess?: () => void
}

export function DemandDeleteDialog({
  open,
  onOpenChange,
  demand,
  onSuccess,
}: DemandDeleteDialogProps) {
  const deleteMutation = useDeleteDemand()

  const productLabel = demand?.productCode || demand?.productName
    ? `"${demand?.productCode}" (${demand?.productName})`
    : "this unmapped-product demand"

  const handleDelete = async () => {
    if (!demand) return
    try {
      await deleteMutation.mutateAsync(String(demand.demandId))
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("Failed to delete demand:", error)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Demand"
      description={`Are you sure you want to delete the demand for ${productLabel}? This action cannot be undone.`}
      variant="destructive"
      isLoading={deleteMutation.isPending}
      confirmText="Delete"
      onConfirm={handleDelete}
    />
  )
}
