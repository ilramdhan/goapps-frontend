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
import { useCostProductMaster, useCostProductMasters } from "@/hooks/finance/use-cost-product-master"
import { useDecideFeasibility, useVerifyClassification } from "@/hooks/finance/use-cost-product-request"
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
// (item #2, 2026-07-03 CPR UX batch). Submits sequentially — classification first, then
// feasibility — reusing the two existing mutations/RPCs unchanged. See design.md §2.
//
// Local state machine: "idle" (both sections editable) -> "classifying" (step 1 in flight)
// -> "classified" (step 1 saved; either about to auto-run step 2, or step 2 failed and the
// user is retrying just feasibility, with classification now read-only) -> "deciding" (step 2
// in flight) -> "done" (both succeeded, dialog closes). `error` carries the latest inline
// message; it is distinct from the toasts the underlying hooks already fire on their own
// success/failure.
type ReviewPhase = "idle" | "classifying" | "classified" | "deciding" | "done"

interface ClassificationAndFeasibilityProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  requestId: number
  /** productClassification — the system/marketing-predicted value. */
  currentClassification: ProductClassification
  /** request.verifiedClassification, if already set — used to pre-fill instead of the prediction. */
  initialVerifiedClassification?: ProductClassification
}

export function ClassificationAndFeasibilityDialog({
  open,
  onOpenChange,
  requestId,
  currentClassification,
  initialVerifiedClassification,
}: ClassificationAndFeasibilityProps) {
  const verifyM = useVerifyClassification()
  const feasibilityM = useDecideFeasibility()

  const [phase, setPhase] = useState<ReviewPhase>("idle")
  const [error, setError] = useState<string | null>(null)

  const [verified, setVerified] = useState<ProductClassification>(
    initialVerifiedClassification ?? currentClassification,
  )
  const [overrideReason, setOverrideReason] = useState("")
  const [decision, setDecision] = useState<"FEASIBLE" | "NOT_FEASIBLE">("FEASIBLE")
  const [note, setNote] = useState("")

  const isOverride = verified !== currentClassification
  const isInfeasible = decision === "NOT_FEASIBLE"
  // Once classification has been saved (either mid-flow or after a step-2 failure we're
  // retrying), lock the classification section so a retry never re-submits it.
  const classificationLocked = phase === "classified" || phase === "deciding"
  const pending = verifyM.isPending || feasibilityM.isPending

  function resetAll() {
    setPhase("idle")
    setError(null)
    setVerified(initialVerifiedClassification ?? currentClassification)
    setOverrideReason("")
    setDecision("FEASIBLE")
    setNote("")
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
      // Classification already saved — only feasibility needs a retry.
      setPhase("classified")
      setError("Classification saved. Feasibility decision failed — please retry.")
    }
  }

  async function handleSubmit() {
    if (classificationLocked) {
      // Retry path after a step-2 failure: classification is already saved.
      await submitFeasibility()
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
    await submitFeasibility()
  }

  const canSubmitClassification = classificationLocked || !isOverride || !!overrideReason.trim()
  const canSubmitFeasibility = !isInfeasible || !!note.trim()
  const canSubmit = (isInfeasible || canSubmitClassification) && canSubmitFeasibility

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
          <DialogTitle>Review &amp; decide</DialogTitle>
          <DialogDescription>
            Confirm the product classification and decide feasibility for this request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {!isInfeasible && (
            <>
              {/* Classification section */}
              <div className="space-y-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Classification</div>
                <p className="text-sm text-muted-foreground">
                  Marketing marked this as <strong>{currentClassification}</strong>. Confirm or override; an override
                  requires a reason.
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

              <Separator />
            </>
          )}

          {/* Feasibility section */}
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
            {classificationLocked ? "Retry feasibility" : isInfeasible ? "Reject as infeasible" : "Save & continue"}
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
