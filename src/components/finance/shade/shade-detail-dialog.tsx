"use client"

import { useState } from "react"
import { Pencil, PowerOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StatusBadge } from "@/components/common"
import { ConfirmDialog } from "@/components/shared/confirm-dialog/confirm-dialog"
import { usePermissionContext } from "@/providers/permission-provider"

import type { Shade } from "@/types/finance/shade"
import { useDeactivateShade } from "@/hooks/finance/use-shade"

interface ShadeDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shade: Shade | null
  onEdit: (shade: Shade) => void
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  )
}

export function ShadeDetailDialog({ open, onOpenChange, shade, onEdit }: ShadeDetailDialogProps) {
  const { hasPermission } = usePermissionContext()
  const canUpdate = hasPermission("finance.master.shade.update")
  const canDelete = hasPermission("finance.master.shade.delete")

  const [confirmDeactivateOpen, setConfirmDeactivateOpen] = useState(false)
  const deactivateMutation = useDeactivateShade()

  if (!shade) return null

  const isManual = shade.shadeSource === "MANUAL"

  const handleDeactivate = () => {
    deactivateMutation.mutate(String(shade.shadeId), {
      onSuccess: () => {
        setConfirmDeactivateOpen(false)
        onOpenChange(false)
      },
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <DialogTitle className="font-mono">{shade.shadeCode}</DialogTitle>
                <DialogDescription>{shade.shadeName}</DialogDescription>
              </div>
              <StatusBadge status={shade.isActive ? "ACTIVE" : "INACTIVE"} type="product" />
            </div>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Field label="Code">
                <span className="font-mono font-medium">{shade.shadeCode}</span>
              </Field>
              <Field label="Name">{shade.shadeName}</Field>
              <Field label="Short Name">{shade.shadeShortName || <span className="text-muted-foreground">—</span>}</Field>
              <Field label="Source">
                <StatusBadge status={shade.shadeSource} type="generic" size="sm" />
              </Field>
              <Field label="Status">
                <StatusBadge status={shade.isActive ? "ACTIVE" : "INACTIVE"} type="product" size="sm" />
              </Field>
              <Field label="Last Synced">
                {shade.syncedAt ? new Date(shade.syncedAt).toLocaleString() : <span className="text-muted-foreground">Never</span>}
              </Field>
              <Field label="Usage Count">
                <span className="tabular-nums">{shade.usageCount ?? 0}</span>
              </Field>
            </div>

            {!isManual && (
              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium">Oracle Provenance</p>
                <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                  <Field label="Source Created At">
                    {shade.sourceCreatedAt ? new Date(shade.sourceCreatedAt).toLocaleString() : <span className="text-muted-foreground">—</span>}
                  </Field>
                  <Field label="Source Updated At">
                    {shade.sourceUpdatedAt ? new Date(shade.sourceUpdatedAt).toLocaleString() : <span className="text-muted-foreground">—</span>}
                  </Field>
                  <Field label="Source Created By">{shade.sourceCreatedBy || <span className="text-muted-foreground">—</span>}</Field>
                  <Field label="Source Updated By">{shade.sourceUpdatedBy || <span className="text-muted-foreground">—</span>}</Field>
                </div>
              </div>
            )}

            {isManual && (
              <p className="text-xs text-muted-foreground">
                This shade was created manually. Oracle sync will never overwrite it.
              </p>
            )}
          </div>

          <DialogFooter className="flex-row justify-end gap-2 sm:justify-end">
            {shade.isActive && canDelete && (
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmDeactivateOpen(true)}
              >
                <PowerOff className="mr-2 h-4 w-4" />
                Deactivate
              </Button>
            )}
            {canUpdate && (
              <Button type="button" onClick={() => onEdit(shade)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDeactivateOpen}
        onOpenChange={setConfirmDeactivateOpen}
        title="Deactivate Shade"
        description={`"${shade.shadeName}" (${shade.shadeCode}) will be marked inactive. This is not a delete — the record and its history are kept, and it can be reactivated later via Edit.`}
        variant="warning"
        isLoading={deactivateMutation.isPending}
        confirmText="Deactivate"
        onConfirm={handleDeactivate}
      />
    </>
  )
}
