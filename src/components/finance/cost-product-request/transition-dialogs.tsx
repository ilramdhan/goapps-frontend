"use client"

// transition-dialogs — small per-transition modal helpers (reason / decision / substatus inputs).
import { useMemo, useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { RoutingResolver } from "@/components/finance/cost-product-request/routing-resolver"
import { useCostProductMaster, useCostProductMasters } from "@/hooks/finance/use-cost-product-master"
import { useDecideFeasibility, useSubmitAndDecide, useVerifyClassification } from "@/hooks/finance/use-cost-product-request"
import { useLinkExistingRoute } from "@/hooks/finance/use-link-route"
import { cn } from "@/lib/utils"
import type { ClosedSubstatus, ProductClassification } from "@/types/finance/cost-product-request"

// ----- ReasonDialog: used by Reject + Cancel (any free-text "why" prompt). ----------------
interface ReasonProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  pending?: boolean
  onConfirm: (reason: string) => void
}

export function ReasonDialog({ open, onOpenChange, title, description, confirmLabel, pending, onConfirm }: ReasonProps) {
  const [reason, setReason] = useState("")
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setReason("")
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reason-input">Reason *</Label>
          <Textarea id="reason-input" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={!reason.trim() || pending} onClick={() => onConfirm(reason.trim())}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ----- ClassificationAndFeasibilityDialog -------------------------------------------------
// Merges the former VerifyClassificationDialog + FeasibilityDialog into a single screen
// (item #2, 2026-07-03 CPR UX batch). Extended per design.md §3 Area B (B1) to also resolve
// + link the request's routing inline, when the decision is FEASIBLE, instead of deferring
// routing to a separate later step via the Routing card.
//
// Routing resolution itself (picking a product / brand-new-product form, then clicking
// RoutingResolver's own "Resolve routing" button) is a separate, frontend-only interaction
// that happens BEFORE the dialog's main Submit button is even enabled (mirrors
// `classificationLocked`'s existing gating pattern) — see `resolvedHeadId` below.
//
// Once resolvedHeadId is set and Submit is clicked, the RPC chain is:
//   VerifyClassification -> LinkRoute(requestId, resolvedHeadId) -> DecideFeasibility -> done
// (design.md §3 B1's recommended ordering: routing resolves right after classification, before
// feasibility, since a routing failure should block the whole dialog — consistent with the
// existing "classification saved but feasibility failed -> retry feasibility" pattern extending
// naturally to "classification+routing saved but feasibility failed -> retry feasibility only").
//
// Local state machine: "idle" (all sections editable) -> "classifying" (step 1, VerifyClassification,
// in flight) -> "classified" (step 1 saved; either about to auto-run the routing link, or a later
// step failed and the user is retrying just that step, with classification now read-only) ->
// "routing" (step 2, LinkRoute, in flight; on failure this phase doubles as the "only the route
// link needs a retry" state) -> "deciding" (step 3, DecideFeasibility, in flight) -> "done" (all
// steps succeeded, dialog closes). `error` carries the latest inline message; it is distinct from
// the toasts the underlying hooks already fire on their own success/failure.
type ReviewPhase = "idle" | "classifying" | "classified" | "routing" | "deciding" | "done"

interface ClassificationAndFeasibilityProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  requestId: number
  /** productClassification — the system/marketing-predicted value. */
  currentClassification: ProductClassification
  /** request.verifiedClassification, if already set — used to pre-fill instead of the prediction. */
  initialVerifiedClassification?: ProductClassification
  /** request.referenceProductSysId (D4) — prefills RoutingResolver's product picker when set. */
  referenceProductSysId?: number
  /**
   * "review" (default) — UNDER_REVIEW flow: classification/routing/feasibility are saved via
   * 3 separate calls (VerifyClassification -> LinkRoute -> DecideFeasibility), each individually
   * retryable on failure — used by the "Review & decide" button.
   * "submit" — DRAFT flow (B3 merge): the whole sequence (Submit + StartReview + VerifyClassification
   * + DecideFeasibility + LinkRoute) is composed server-side in a single SubmitAndDecide call, so
   * only one consolidated notification pair fires — used by the DRAFT "Submit" button.
   */
  mode?: "review" | "submit"
}

export function ClassificationAndFeasibilityDialog({
  open,
  onOpenChange,
  requestId,
  currentClassification,
  initialVerifiedClassification,
  referenceProductSysId,
  mode = "review",
}: ClassificationAndFeasibilityProps) {
  const verifyM = useVerifyClassification()
  const feasibilityM = useDecideFeasibility()
  const linkRouteM = useLinkExistingRoute()
  const submitAndDecideM = useSubmitAndDecide()

  const [phase, setPhase] = useState<ReviewPhase>("idle")
  const [error, setError] = useState<string | null>(null)

  const [verified, setVerified] = useState<ProductClassification>(
    initialVerifiedClassification ?? (currentClassification === "pending" ? "existing" : currentClassification),
  )
  const [overrideReason, setOverrideReason] = useState("")
  const [decision, setDecision] = useState<"FEASIBLE" | "NOT_FEASIBLE">("FEASIBLE")
  const [note, setNote] = useState("")
  // Populated by RoutingResolver's onResolved callback once the user has picked/created a
  // product and clicked its own "Resolve routing" button — a precondition step that happens
  // before the dialog's main Submit button is even enabled (mirrors classificationLocked's gate).
  const [resolvedHeadId, setResolvedHeadId] = useState<number | null>(null)
  // Tracks whether LinkRoute already succeeded, so a feasibility-only retry (after routing
  // succeeded but feasibility failed) never re-submits the already-linked route.
  const [routeLinked, setRouteLinked] = useState(false)

  const isOverride = verified !== currentClassification && currentClassification !== "pending"
  const isInfeasible = decision === "NOT_FEASIBLE"
  // Once classification has been saved (either mid-flow or after a later-step failure we're
  // retrying), lock the classification section so a retry never re-submits it.
  const classificationLocked = phase === "classified" || phase === "routing" || phase === "deciding"
  const pending = verifyM.isPending || linkRouteM.isPending || feasibilityM.isPending || submitAndDecideM.isPending

  function resetAll() {
    setPhase("idle")
    setError(null)
    setVerified(initialVerifiedClassification ?? (currentClassification === "pending" ? "existing" : currentClassification))
    setOverrideReason("")
    setDecision("FEASIBLE")
    setNote("")
    setResolvedHeadId(null)
    setRouteLinked(false)
  }

  async function submitFeasibility() {
    setPhase("deciding")
    try {
      await feasibilityM.mutateAsync({
        requestId,
        decision,
        note: isInfeasible ? note.trim() : "",
      })
      setPhase("done")
      setError(null)
      toast.success("Classification & feasibility recorded")
      onOpenChange(false)
    } catch {
      // Classification (and routing, if FEASIBLE) already saved — only feasibility needs a retry.
      setPhase("classified")
      setError("Classification saved. Feasibility decision failed — please retry.")
    }
  }

  async function linkResolvedRouteThenDecide() {
    if (!routeLinked) {
      setPhase("routing")
      if (!resolvedHeadId) {
        // Guarded by canSubmit below — should not be reachable, but keep an explicit message.
        setError("Resolve routing before continuing.")
        return
      }
      try {
        await linkRouteM.mutateAsync({ requestId, routeHeadId: resolvedHeadId })
        setRouteLinked(true)
      } catch {
        // Classification already saved — only the routing link needs a retry.
        setPhase("classified")
        setError("Classification saved. Linking the route failed — please retry.")
        return
      }
    }
    await submitFeasibility()
  }

  // "submit" mode (B3 merge): the entire sequence is one server-side call
  // (SubmitAndDecide) instead of the "review" mode's 3 separately-retryable
  // mutations — so on failure the whole action is simply retried as a whole,
  // there is no partial "classification saved, routing failed" state to track.
  async function submitAndDecide() {
    setPhase("deciding")
    setError(null)
    try {
      await submitAndDecideM.mutateAsync({
        requestId,
        verifiedClassification: verified,
        overrideReason: isOverride ? overrideReason.trim() : "",
        decision,
        note: isInfeasible ? note.trim() : "",
        referenceProductHeadId: !isInfeasible && resolvedHeadId != null ? resolvedHeadId : undefined,
      })
      setPhase("done")
      toast.success("Submitted for review")
      onOpenChange(false)
    } catch {
      setPhase("idle")
      setError("Submit failed — please check the details and try again.")
    }
  }

  async function handleSubmit() {
    if (mode === "submit") {
      await submitAndDecide()
      return
    }
    if (classificationLocked) {
      // Retry path after a later-step failure: classification is already saved. Re-drive
      // whichever step is next — routing (if FEASIBLE and not yet linked) or feasibility.
      if (!isInfeasible && !routeLinked) {
        await linkResolvedRouteThenDecide()
      } else {
        await submitFeasibility()
      }
      return
    }
    if (isInfeasible) {
      await submitFeasibility()
      return
    }
    setPhase("classifying")
    setError(null)
    try {
      await verifyM.mutateAsync({
        requestId,
        verifiedClassification: verified,
        overrideReason: isOverride ? overrideReason.trim() : "",
      })
    } catch {
      setPhase("idle")
      setError("Failed to save classification — please check the details and try again.")
      return
    }
    setPhase("classified")
    await linkResolvedRouteThenDecide()
  }

  const canSubmitClassification = classificationLocked || !isOverride || !!overrideReason.trim()
  const canSubmitFeasibility = !isInfeasible || !!note.trim()
  const canSubmitRouting = isInfeasible || resolvedHeadId != null
  const canSubmit = (isInfeasible || canSubmitClassification) && canSubmitFeasibility && canSubmitRouting

  const submitLabel = classificationLocked
    ? !isInfeasible && !routeLinked
      ? "Retry routing link"
      : "Retry feasibility"
    : isInfeasible
      ? "Reject as infeasible"
      : mode === "submit"
        ? "Submit for review"
        : "Save & continue"

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) resetAll()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "submit" ? "Submit for review" : "Review & decide"}</DialogTitle>
          <DialogDescription>
            {mode === "submit"
              ? "Confirm the product classification, resolve routing, and decide feasibility — submitted directly to review."
              : "Confirm the product classification and decide feasibility for this request."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Feasibility section — always first */}
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Feasibility</div>
            <p className="text-sm text-muted-foreground">
              FEASIBLE moves the request to ROUTING_DEFINED. NOT_FEASIBLE sends it to REJECTED — note is required.
            </p>
            <RadioGroup
              value={decision}
              onValueChange={(v) => setDecision(v as "FEASIBLE" | "NOT_FEASIBLE")}
              className="flex gap-6"
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="FEASIBLE" />
                Feasible
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="NOT_FEASIBLE" />
                Not feasible
              </label>
            </RadioGroup>
            <div className="space-y-2">
              <Label>Note {isInfeasible ? "*" : "(optional)"}</Label>
              <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>

          {/* Classification section — only shown when FEASIBLE */}
          {!isInfeasible && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Classification</div>
                <p className="text-sm text-muted-foreground">
                  {currentClassification === "pending" ? (
                    "This request has not yet been classified. Choose existing or new."
                  ) : (
                    <>
                      Marketing marked this as <strong>{currentClassification}</strong>. Confirm or override; an
                      override requires a reason.
                    </>
                  )}
                </p>
                <RadioGroup
                  value={verified}
                  onValueChange={(v) => setVerified(v as ProductClassification)}
                  className="flex gap-6"
                >
                  <label className={cn("flex items-center gap-2", classificationLocked ? "opacity-60" : "cursor-pointer")}>
                    <RadioGroupItem value="existing" disabled={classificationLocked} />
                    Existing
                  </label>
                  <label className={cn("flex items-center gap-2", classificationLocked ? "opacity-60" : "cursor-pointer")}>
                    <RadioGroupItem value="new" disabled={classificationLocked} />
                    New
                  </label>
                </RadioGroup>
                {isOverride && (
                  <div className="space-y-2">
                    <Label>Override reason *</Label>
                    <Textarea
                      rows={3}
                      value={overrideReason}
                      disabled={classificationLocked}
                      onChange={(e) => setOverrideReason(e.target.value)}
                    />
                  </div>
                )}
                {classificationLocked && (
                  <p className="text-xs text-muted-foreground">Classification saved — read-only.</p>
                )}
              </div>
            </>
          )}

          {/* Routing section (B1) — only when FEASIBLE; resolves + links the request's route
              inline instead of deferring to the separate Routing card. "existing" verified
              classification shows the full picker (existing product / brand-new toggle);
              "new" skips straight to the new-product-master form (design.md §3 B1). */}
          {!isInfeasible && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Routing</div>
                {routeLinked ? (
                  <p className="text-sm text-muted-foreground">
                    Route #{resolvedHeadId} resolved and ready to link.
                  </p>
                ) : (
                  <RoutingResolver
                    requestId={requestId}
                    productSysId={referenceProductSysId}
                    forceNewProduct={verified === "new"}
                    onResolved={setResolvedHeadId}
                  />
                )}
                {resolvedHeadId != null && !routeLinked && (
                  <p className="text-sm text-muted-foreground">
                    Routing resolved — head #{resolvedHeadId} will be linked on submit.
                  </p>
                )}
              </div>
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant={isInfeasible ? "destructive" : "default"}
            disabled={!canSubmit || pending}
            onClick={() => {
              handleSubmit().catch(() => {
                // Both mutateAsync calls already have their own try/catch above; this guards
                // against any unexpected rejection so the promise is never left unhandled.
                setError("Something went wrong — please try again.")
              })
            }}
          >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ----- CloseDialog -----------------------------------------------------------------------
interface CloseProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pending?: boolean
  onConfirm: (substatus: ClosedSubstatus) => void
}

export function CloseDialog({ open, onOpenChange, pending, onConfirm }: CloseProps) {
  const [substatus, setSubstatus] = useState<ClosedSubstatus>("won")
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close request</DialogTitle>
          <DialogDescription>Pick the closed sub-status.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Sub-status *</Label>
          <Select value={substatus} onValueChange={(v) => setSubstatus(v as ClosedSubstatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="on_hold">On hold</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(substatus)} disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ----- UseExistingCostingDialog: requires picking which existing product master's
// costing the request reuses, before transitioning UNDER_REVIEW → QUOTE_READY. ---
interface UseExistingProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pending?: boolean
  onConfirm: (existingProductSysId: number) => void
}

export function UseExistingCostingDialog({ open, onOpenChange, pending, onConfirm }: UseExistingProps) {
  const [productSysId, setProductSysId] = useState<number | undefined>()
  const [search, setSearch] = useState("")
  const { data, isLoading } = useCostProductMasters({ search, activeFilter: "active", pageSize: 30 })
  const { data: product } = useCostProductMaster(productSysId)
  const items = useMemo(() => data?.items ?? [], [data])
  const canSubmit = !!productSysId && productSysId > 0

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) {
          setProductSysId(undefined)
          setSearch("")
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Use existing costing</DialogTitle>
          <DialogDescription>
            Pick the product master whose costing this request will reuse. The request will move
            straight to QUOTE_READY, and the picked product is recorded for traceability.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Existing product *</Label>
            <Command shouldFilter={false} className="rounded border">
              <CommandInput
                placeholder="Search by code or name…"
                value={search}
                onValueChange={setSearch}
              />
              <CommandList className="max-h-40">
                {isLoading && (
                  <div className="py-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                  </div>
                )}
                <CommandEmpty>No products found.</CommandEmpty>
                <CommandGroup>
                  {items.map((p) => (
                    <CommandItem
                      key={p.productSysId}
                      value={`${p.productCode} ${p.productName}`}
                      onSelect={() => setProductSysId(p.productSysId)}
                    >
                      <Check className={cn("mr-2 h-4 w-4", productSysId === p.productSysId ? "opacity-100" : "opacity-0")} />
                      <span className="font-mono text-xs text-muted-foreground mr-2">{p.productCode}</span>
                      {p.productName}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
            <p className="text-xs text-muted-foreground">
              Only products that already have an active product order should be picked here. If
              there&apos;s no match,{" "}
              <a href="/finance/product-master" className="underline" target="_blank" rel="noreferrer">
                check Product Master
              </a>
              .
            </p>
          </div>
          {product && (
            <div className="rounded border bg-muted/40 p-2 text-xs space-y-0.5">
              <div>
                <span className="text-muted-foreground">Code:</span>{" "}
                <span className="font-mono">{product.productCode}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Name:</span> {product.productName}
              </div>
              {product.productTypeName && (
                <div>
                  <span className="text-muted-foreground">Type:</span> {product.productTypeName}
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!canSubmit || pending} onClick={() => productSysId && onConfirm(productSysId)}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Use existing costing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ----- ConfirmActionDialog: pre-action checklist shown before Confirm/Approve/Release ----------
interface ConfirmActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  action: "confirm" | "approve" | "release"
  pending: boolean
  totalParams: number
  filledParams: number
  isLocked: boolean
  onConfirm: () => void
}

export function ConfirmActionDialog({
  open,
  onOpenChange,
  action,
  pending,
  totalParams,
  filledParams,
  isLocked,
  onConfirm,
}: ConfirmActionDialogProps) {
  const allFilled = totalParams > 0 && filledParams >= totalParams
  const label = action.charAt(0).toUpperCase() + action.slice(1)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{label} Request</DialogTitle>
          <DialogDescription>
            You are about to <strong>{action}</strong> this request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2 text-sm">
          <p className="font-medium text-muted-foreground">Quick summary:</p>
          <ul className="space-y-1.5">
            <li
              className={`flex items-center gap-2 ${
                allFilled ? "text-green-600 dark:text-green-400" : "text-destructive"
              }`}
            >
              <span>{allFilled ? "✓" : "✗"}</span>
              {filledParams} / {totalParams} params filled across all products
            </li>
            <li
              className={`flex items-center gap-2 ${
                isLocked
                  ? "text-green-600 dark:text-green-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              <span>{isLocked ? "✓" : "⚠"}</span>
              Route is {isLocked ? "LOCKED" : "not locked"}
            </li>
          </ul>
          <p className="pt-1 text-xs text-muted-foreground">
            This action cannot be undone. The backend will reject if preconditions are not met.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Yes, {label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
