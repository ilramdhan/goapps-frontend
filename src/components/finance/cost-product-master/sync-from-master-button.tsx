"use client"

// "Sync dari master" action — opens LookupSyncPreviewDialog for a given scope.
// Visible-but-disabled with a tooltip when the user lacks the permission (same
// gate as Bulk Edit Params), or when `disabledReason` is given (e.g. locked product).
import { useState } from "react"
import { RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { LookupSyncPreviewDialog } from "@/components/finance/lookup-sync"
import { usePermissionContext } from "@/providers/permission-provider"
import type { LookupSyncScope } from "@/types/finance/lookup-sync"

// Same permission as BulkEditProductParams (see bulk-edit-params-toolbar.tsx).
export const SYNC_FROM_MASTER_PERMISSION = "finance.product.route.create"

interface Props {
  scope: LookupSyncScope
  title?: string
  label?: string
  disabledReason?: string
  variant?: "default" | "outline"
}

export function SyncFromMasterButton({ scope, title, label = "Sync dari master", disabledReason, variant = "outline" }: Props) {
  const { hasPermission } = usePermissionContext()
  const [open, setOpen] = useState(false)
  const allowed = hasPermission(SYNC_FROM_MASTER_PERMISSION)
  const hint = !allowed ? `Requires the "${SYNC_FROM_MASTER_PERMISSION}" permission.` : disabledReason

  if (hint) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Button size="sm" variant={variant} disabled>
              <RefreshCw className="mr-2 h-4 w-4" />
              {label}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{hint}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <>
      <Button size="sm" variant={variant} onClick={() => setOpen(true)}>
        <RefreshCw className="mr-2 h-4 w-4" />
        {label}
      </Button>
      {open && <LookupSyncPreviewDialog open={open} onOpenChange={setOpen} scope={scope} title={title} />}
    </>
  )
}
