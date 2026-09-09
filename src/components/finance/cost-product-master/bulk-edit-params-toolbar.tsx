"use client"

// BulkEditParamsToolbar (F4, product-route-fork-attach-bulk) — appears while
// there is a non-empty product selection on the product-master list. The
// "Bulk Edit Params" action opens the operation-builder dialog. Mirrors
// mb-recipe-bulk-toolbar.tsx's visible-but-disabled + Tooltip permission
// gating: the button stays visible (with a tooltip explaining why) rather
// than being hidden outright when the user lacks the submit permission, so a
// partially permissioned user still understands the action exists.
import { ListChecks } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { usePermissionContext } from "@/providers/permission-provider"

// BulkEditProductParams is guarded by finance.product.route.create in
// auth_interceptor.go (submit RPC) — see B4's wiring, product-route-fork-attach-bulk.
const BULK_EDIT_PARAMS_PERMISSION = "finance.product.route.create"

interface Props {
  selectedCount: number
  /** Invoked when the user clicks "Bulk Edit Params" — parent opens the operation-builder dialog. */
  onOpen: () => void
}

export function BulkEditParamsToolbar({ selectedCount, onOpen }: Props) {
  const { hasPermission } = usePermissionContext()

  if (selectedCount === 0) return null

  const canBulkEdit = hasPermission(BULK_EDIT_PARAMS_PERMISSION)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/40 px-4 py-2">
      <span className="text-sm font-medium">
        {selectedCount} selected
      </span>

      {canBulkEdit ? (
        <Button size="sm" variant="outline" onClick={onOpen}>
          <ListChecks className="mr-2 h-4 w-4" />
          Bulk Edit Params
        </Button>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            {/* span wrapper: a disabled Button doesn't fire pointer events, so Radix's
                tooltip trigger needs a non-disabled element to attach listeners to. */}
            <span className="inline-flex">
              <Button size="sm" variant="outline" disabled>
                <ListChecks className="mr-2 h-4 w-4" />
                Bulk Edit Params
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            Requires the &quot;{BULK_EDIT_PARAMS_PERMISSION}&quot; permission.
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}
