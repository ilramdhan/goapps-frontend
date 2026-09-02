"use client"

// MbRecipeBulkToolbar — Super Admin-only bulk lifecycle-regenerate trigger.
//
// Renders ONLY while there is a non-empty selection (selectedCount > 0). The
// "Regenerate Selected" action adaptively re-triggers Unvalidate → Submit →
// Validate for every selected MB Head — each record only goes through the
// stages it actually needs based on its current status (see
// MbRecipeBulkJobProgressDialog) — so it is gated on ALL THREE of the bulk
// permission codes regardless, since any selection may include a VALIDATED
// row that needs the full chain. A partial grant (e.g. bulkunvalidate +
// bulksubmit but not bulkvalidate) must NOT be enough to start a chain that
// would otherwise get stuck on the last step. The button stays
// visible-but-disabled (with a tooltip explaining why) rather than being
// hidden outright, so a partially permissioned user still understands the
// action exists and why they can't use it — matching this codebase's general
// preference for explaining gates rather than silently omitting affordances.
import { useState } from "react"
import { RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { usePermissionContext } from "@/providers/permission-provider"

// The three RPCs the chain drives, in the order it drives them. All three are
// required — see the file-level note above.
const BULK_MB_HEAD_PERMISSIONS = [
  "finance.mb.head.bulkunvalidate",
  "finance.mb.head.bulksubmit",
  "finance.mb.head.bulkvalidate",
] as const

interface Props {
  selectedCount: number
  /** Invoked once the user confirms in the warning dialog — parent opens the progress dialog. */
  onConfirm: () => void
}

export function MbRecipeBulkToolbar({ selectedCount, onConfirm }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { hasPermission } = usePermissionContext()

  if (selectedCount === 0) return null

  const canBulkRegenerate = BULK_MB_HEAD_PERMISSIONS.every((code) => hasPermission(code))
  const plural = selectedCount === 1 ? "" : "s"

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/40 px-4 py-2">
      <span className="text-sm font-medium">
        {selectedCount} selected
      </span>

      {canBulkRegenerate ? (
        <Button size="sm" variant="outline" onClick={() => setConfirmOpen(true)}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Regenerate Selected
        </Button>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            {/* span wrapper: a disabled Button doesn't fire pointer events, so Radix's
                tooltip trigger needs a non-disabled element to attach listeners to. */}
            <span className="inline-flex">
              <Button size="sm" variant="outline" disabled>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate Selected
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            Requires all three bulk MB Head permissions (unvalidate, submit, validate).
          </TooltipContent>
        </Tooltip>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Regenerate {selectedCount} MB Head{plural}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  This runs a bulk, multi-step regenerate across all {selectedCount} selected MB
                  Head{plural}, re-triggering downstream cost product, CAPP, CPP, and MB Spin
                  generation for each record. Each record moves through Unvalidate, Submit, and
                  Validate as needed based on its own current status — a DRAFT record only needs
                  Submit and Validate, a SUBMITTED record only needs Validate, and a VALIDATED
                  record goes through all three.
                </p>
                <p>
                  This action is <strong>not simply reversible</strong>. Once a stage starts, the
                  affected records move through the workflow again; undoing the effect means
                  re-running the workflow, not a single undo click. Records that fail a stage are
                  reported so you can review and retry them separately.
                </p>
                <p>Continue?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false)
                onConfirm()
              }}
            >
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
