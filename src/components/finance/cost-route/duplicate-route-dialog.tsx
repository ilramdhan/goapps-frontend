"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useDuplicateRoute, type DuplicateRouteTargetMode } from "@/hooks/finance/use-duplicate-route"

interface Props {
  open: boolean
  onClose: () => void
  sourceHeadId: number
  sourceProductCode?: string
  /**
   * When set, the backend atomically re-links the request to the new fork.
   */
  linkedRequestId?: number
}

export function DuplicateRouteDialog({
  open,
  onClose,
  sourceHeadId,
  sourceProductCode,
  linkedRequestId,
}: Props) {
  const router = useRouter()
  const [targetMode, setTargetMode] = useState<DuplicateRouteTargetMode>("NEW_PRODUCT")
  const [includeRouting, setIncludeRouting] = useState(true)
  const [includeUpstream, setIncludeUpstream] = useState(true)
  const [includeApplicability, setIncludeApplicability] = useState(true)
  const [includeValues, setIncludeValues] = useState(true)
  const [newCodePrefix, setNewCodePrefix] = useState("")
  const dupM = useDuplicateRoute()

  const isSameProduct = targetMode === "SAME_PRODUCT"

  // Values require applicability ON — derive instead of syncing via an effect.
  const effectiveIncludeValues = includeApplicability && includeValues

  const handleSubmit = async () => {
    // SAME_PRODUCT forks the route graph only — the backend rejects the
    // request outright if any of the product/param-copy flags are set, so
    // the dialog must make that combination unreachable rather than rely on
    // the 400 (design doc §1.2 mutual-exclusion rule).
    const res = await dupM.mutateAsync(
      isSameProduct
        ? {
            headId: sourceHeadId,
            includeRouting: true,
            includeUpstream: false,
            includeApplicability: false,
            includeValues: false,
            newCodePrefix: undefined,
            linkedRequestId,
            targetMode: "SAME_PRODUCT",
          }
        : {
            headId: sourceHeadId,
            includeRouting,
            includeUpstream,
            includeApplicability,
            includeValues: effectiveIncludeValues,
            newCodePrefix: newCodePrefix || undefined,
            linkedRequestId,
            targetMode: "NEW_PRODUCT",
          },
    )
    onClose()
    router.push(`/finance/routes/${res.newHeadId}`)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Duplicate {sourceProductCode ?? `route #${sourceHeadId}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <RadioGroup
            value={targetMode}
            onValueChange={(v) => setTargetMode(v as DuplicateRouteTargetMode)}
            className="gap-2"
          >
            <div className="flex items-start gap-2">
              <RadioGroupItem value="NEW_PRODUCT" id="mode-new-product" className="mt-0.5" />
              <div>
                <Label htmlFor="mode-new-product">Duplicate as new product</Label>
                <p className="text-xs text-muted-foreground">
                  Creates new product(s) and copies the graph/params per the options below.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <RadioGroupItem value="SAME_PRODUCT" id="mode-same-product" className="mt-0.5" />
              <div>
                <Label htmlFor="mode-same-product">Duplicate route only (same product)</Label>
                <p className="text-xs text-muted-foreground">
                  Locks the current route and creates a new draft version for the same
                  product. No product or parameter is duplicated.
                </p>
              </div>
            </div>
          </RadioGroup>

          {isSameProduct ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
              This route (#{sourceHeadId}) will be locked and a new DRAFT route for the same
              product will be created from its current graph. You will be taken to the new
              draft route.
            </div>
          ) : (
            <>
              <p className="text-muted-foreground">Choose what to copy. Defaults = full deep copy.</p>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="t-routing"
                  checked={includeRouting}
                  onCheckedChange={(v) => setIncludeRouting(!!v)}
                />
                <div>
                  <Label htmlFor="t-routing">Routing graph (stages + RMs)</Label>
                  <p className="text-xs text-muted-foreground">
                    OFF → new head starts empty; user builds from scratch.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="t-upstream"
                  checked={includeUpstream}
                  onCheckedChange={(v) => setIncludeUpstream(!!v)}
                  disabled={!includeRouting}
                />
                <div>
                  <Label htmlFor="t-upstream">Upstream products (recursive)</Label>
                  <p className="text-xs text-muted-foreground">
                    OFF → forked RMs reference the ORIGINAL upstream products (shared).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="t-applic"
                  checked={includeApplicability}
                  onCheckedChange={(v) => setIncludeApplicability(!!v)}
                />
                <div>
                  <Label htmlFor="t-applic">CAPP applicability (param links)</Label>
                  <p className="text-xs text-muted-foreground">
                    OFF → forked products have no params declared.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="t-values"
                  checked={effectiveIncludeValues}
                  onCheckedChange={(v) => setIncludeValues(!!v)}
                  disabled={!includeApplicability}
                />
                <div>
                  <Label htmlFor="t-values">CAPP values (numeric / text)</Label>
                  <p className="text-xs text-muted-foreground">
                    OFF → params declared but values are NULL (user fills).
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="t-prefix">New code prefix (optional)</Label>
                <Input
                  id="t-prefix"
                  value={newCodePrefix}
                  onChange={(e) => setNewCodePrefix(e.target.value)}
                  placeholder="e.g. CSTPTY26V2 (defaults to {source}_F)"
                />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={dupM.isPending}>
            {dupM.isPending ? "Duplicating…" : "Duplicate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
