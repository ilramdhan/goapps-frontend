"use client"

// AttachRouteDialog — F3: pick an existing COMPLETE/LOCKED route belonging
// to a DIFFERENT product and attach/copy its whole graph onto the target
// product. Shared upstream products (e.g. masterbatch, POY) are reused
// as-is by the backend, never cloned. See design.md §3 for the full data
// flow.
//
// Two-step flow inside one dialog, driven by the shared
// useRouteSourcePicker/RouteSourcePickerList/RouteSourcePreview
// sub-components (also reused by route-graph-editor.tsx's AddRmDialog
// splice mode, B4):
//   1. "pick"    — search + select a source route (product code/name search,
//                  COMPLETE/LOCKED only).
//   2. "confirm" — show source route summary + explicit copy-semantics note,
//                  then submit.
import { AlertTriangle, ArrowLeft } from "lucide-react"

import {
  RouteSourcePickerList,
  RouteSourcePreview,
  useRouteSourcePicker,
} from "@/components/finance/cost-route/route-source-picker"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  ScrollableDialogBody,
  ScrollableDialogContent,
  ScrollableDialogFooter,
  ScrollableDialogHeader,
} from "@/components/common/scrollable-dialog"
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { AttachRouteConflictError, useAttachRoute } from "@/hooks/finance/use-attach-route"
import { useState } from "react"

interface AttachRouteDialogProps {
  open: boolean
  onClose: () => void
  targetProductSysId: number
  targetProductCode?: string
  targetProductName?: string
  /** When set, the backend atomically links the request to the new attached head. */
  linkedRequestId?: number
  onAttached: (newHeadId: number) => void
}

export function AttachRouteDialog({
  open,
  onClose,
  targetProductSysId,
  targetProductCode,
  targetProductName,
  linkedRequestId,
  onAttached,
}: AttachRouteDialogProps) {
  const picker = useRouteSourcePicker(targetProductSysId)
  const [conflictMessage, setConflictMessage] = useState<string | undefined>(undefined)

  const attachM = useAttachRoute()

  function handleClose() {
    picker.reset()
    setConflictMessage(undefined)
    onClose()
  }

  async function handleConfirm() {
    if (!picker.selectedHeadId) return
    setConflictMessage(undefined)
    try {
      const res = await attachM.mutateAsync({
        sourceHeadId: picker.selectedHeadId,
        targetProductSysId,
        linkedRequestId,
      })
      picker.reset()
      onClose()
      onAttached(res.newHeadId)
    } catch (err) {
      if (err instanceof AttachRouteConflictError) {
        setConflictMessage(err.message)
        return
      }
      // Any other error is already toasted by the hook.
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <ScrollableDialogContent className="sm:max-w-xl">
        <ScrollableDialogHeader>
          <DialogTitle>Attach existing route</DialogTitle>
          <DialogDescription>
            {picker.step === "pick"
              ? "Search for a product with a COMPLETE or LOCKED route, then copy its whole routing structure onto this product."
              : "Confirm what will be copied before attaching."}
          </DialogDescription>
        </ScrollableDialogHeader>

        <ScrollableDialogBody className="space-y-4">
          {picker.step === "pick" && <RouteSourcePickerList state={picker} />}

          {picker.step === "confirm" && picker.selectedRoute && (
            <RouteSourcePreview
              state={picker}
              targetLabel={targetProductCode || `#${targetProductSysId}`}
              targetSublabel={targetProductName}
            >
              <Alert>
                <AlertTitle className="text-xs font-semibold">What gets copied</AlertTitle>
                <AlertDescription className="text-xs">
                  This copies the full routing structure into a new draft route owned by{" "}
                  <strong>{targetProductCode || `product #${targetProductSysId}`}</strong>. Shared raw materials and
                  intermediates (e.g. POY) will reference the <strong>same existing products</strong> as the source
                  route — not new copies — so ratios and costs stay identical.
                </AlertDescription>
              </Alert>

              {conflictMessage && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="text-xs font-semibold">Can&apos;t attach route</AlertTitle>
                  <AlertDescription className="text-xs">
                    {targetProductCode || `Product #${targetProductSysId}`} already has an active route. Attach is
                    only available for a product with no live route yet — resolve or fork the existing route instead.
                  </AlertDescription>
                </Alert>
              )}
            </RouteSourcePreview>
          )}
        </ScrollableDialogBody>

        <ScrollableDialogFooter>
          {picker.step === "confirm" ? (
            <>
              <Button variant="ghost" onClick={picker.back} disabled={attachM.isPending}>
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
              </Button>
              <Button onClick={handleConfirm} disabled={attachM.isPending || picker.isGraphLoading}>
                {attachM.isPending ? "Attaching…" : "Attach route"}
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
          )}
        </ScrollableDialogFooter>
      </ScrollableDialogContent>
    </Dialog>
  )
}
