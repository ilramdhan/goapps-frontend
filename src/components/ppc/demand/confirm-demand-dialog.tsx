"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ProductCombobox } from "@/components/ppc/comboboxes"

import type { Demand, UpdateDemandRequest } from "@/types/ppc/demand"
import {
  DemandType,
  GradeReq,
  GRADE_REQ_LABELS,
  GRADE_REQ_OPTIONS,
  productLinkReasonLabel,
} from "@/types/ppc/common"
import { useConfirmDemandWithFills } from "@/hooks/ppc/use-demand"

interface ConfirmDemandDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  demand: Demand | null
}

/**
 * ConfirmDemandDialog gates the Confirm action behind a pre-check for the data a
 * confirmed demand is expected to carry, letting the planner fill the gaps in
 * the same action instead of bouncing through the edit dialog first.
 *
 * The outer component only owns the Dialog shell; the body is keyed on the
 * demand id so switching rows remounts it with fresh state rather than
 * resetting it from an effect.
 */
export function ConfirmDemandDialog({ open, onOpenChange, demand }: ConfirmDemandDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ConfirmDemandDialogBody
        key={demand?.demandId ?? "none"}
        demand={demand}
        onOpenChange={onOpenChange}
      />
    </Dialog>
  )
}

/**
 * A confirmation-relevant gap. `key` is stable so the submit handler can decide
 * which request each answer belongs to without re-deriving the list.
 */
type GapKey =
  | "product"
  | "grade"
  | "clausePct"
  | "contractNo"
  | "incoterm"
  | "lcStatus"
  | "stuffAdvanceNo"

function ConfirmDemandDialogBody({
  demand,
  onOpenChange,
}: {
  demand: Demand | null
  onOpenChange: (open: boolean) => void
}) {
  const confirmMutation = useConfirmDemandWithFills()

  // Seeded from the demand once at mount; the body remounts per demand, so no
  // effect is needed to keep these in sync with the selected row.
  const [productSysId, setProductSysId] = useState<number | undefined>(undefined)
  const [gradeReq, setGradeReq] = useState<GradeReq>(
    demand?.gradeRequirement ?? GradeReq.GRADE_REQ_UNSPECIFIED
  )
  const [axMinPct, setAxMinPct] = useState(demand?.axMinPct ?? "")
  const [amMaxPct, setAmMaxPct] = useState(demand?.amMaxPct ?? "")
  const [contractNo, setContractNo] = useState(demand?.contractNo ?? "")
  const [incoterm, setIncoterm] = useState(demand?.incoterm ?? "")
  const [lcStatus, setLcStatus] = useState(demand?.lcStatus ?? "")
  const [stuffAdvanceNo, setStuffAdvanceNo] = useState(demand?.stuffAdvanceNo ?? "")

  const gaps = useMemo(() => detectGaps(demand), [demand])

  // The AX/AM clause pair is only required once the planner has actually chosen
  // AX_AM_CLAUSE, which they may do inside this dialog — so it is derived from
  // the live selection, not only from the stored grade.
  const needsClausePct =
    gradeReq === GradeReq.GRADE_REQ_AX_AM_CLAUSE && (!axMinPct.trim() || !amMaxPct.trim())

  const showProduct = gaps.has("product")
  const showGrade = gaps.has("grade")
  const showClausePct = gaps.has("clausePct") || gradeReq === GradeReq.GRADE_REQ_AX_AM_CLAUSE
  const showContractNo = gaps.has("contractNo")
  const showIncoterm = gaps.has("incoterm")
  const showLcStatus = gaps.has("lcStatus")
  const showStuffAdvanceNo = gaps.has("stuffAdvanceNo")

  const hasAnyField =
    showProduct ||
    showGrade ||
    showClausePct ||
    showContractNo ||
    showIncoterm ||
    showLcStatus ||
    showStuffAdvanceNo

  const productMissing = showProduct && !productSysId
  const gradeMissing = showGrade && gradeReq === GradeReq.GRADE_REQ_UNSPECIFIED
  const canSubmit = !productMissing && !gradeMissing && !needsClausePct

  const handleSubmit = async () => {
    if (!demand || !canSubmit) return

    // Only changed / newly-filled values are sent: UpdateDemand treats every
    // present field as an intentional write, so echoing unchanged values back
    // would rewrite them (and, for quantity, re-derive remaining).
    const update: Omit<UpdateDemandRequest, "demandId"> = {}
    if (showGrade && gradeReq !== demand.gradeRequirement) {
      update.gradeRequirement = gradeReq
    }
    if (showClausePct) {
      if (axMinPct.trim() && axMinPct.trim() !== demand.axMinPct) update.axMinPct = axMinPct.trim()
      if (amMaxPct.trim() && amMaxPct.trim() !== demand.amMaxPct) update.amMaxPct = amMaxPct.trim()
      // A grade the planner left untouched still has to travel with the clause
      // percentages: the backend validates the pair against the grade it is
      // given, and omitting the grade would not re-assert AX_AM_CLAUSE.
      if (gradeReq !== demand.gradeRequirement) update.gradeRequirement = gradeReq
    }
    if (showContractNo && contractNo.trim()) update.contractNo = contractNo.trim()
    if (showIncoterm && incoterm.trim()) update.incoterm = incoterm.trim()
    if (showLcStatus && lcStatus.trim()) update.lcStatus = lcStatus.trim()
    if (showStuffAdvanceNo && stuffAdvanceNo.trim()) {
      update.stuffAdvanceNo = stuffAdvanceNo.trim()
    }

    try {
      await confirmMutation.mutateAsync({
        demandId: demand.demandId,
        cpmProductSysId: showProduct ? productSysId : undefined,
        update: Object.keys(update).length > 0 ? update : undefined,
      })
      onOpenChange(false)
    } catch (error) {
      // The mutation's onError already surfaced the failure as a toast; the
      // dialog deliberately stays open so the planner can correct and retry.
      console.error("Failed to confirm demand:", error)
    }
  }

  const isPending = confirmMutation.isPending

  return (
    <DialogContent className="sm:max-w-[520px]">
      <DialogHeader>
        <DialogTitle>Confirm Demand</DialogTitle>
        <DialogDescription>
          {hasAnyField
            ? "This demand is missing information needed to confirm it. Fill it in below and it will be saved before the demand is confirmed."
            : "Confirm this demand? It becomes a committed production requirement and can then be planned."}
        </DialogDescription>
      </DialogHeader>

      {hasAnyField && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-500/40 dark:bg-amber-500/10">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              {showProduct
                ? productLinkReasonLabel(demand?.productLinkReason ?? "")
                : "Some fields a confirmed demand normally carries are still blank."}
            </p>
          </div>

          {showProduct && (
            <div className="space-y-1.5">
              <Label>
                Product <span className="text-destructive">*</span>
              </Label>
              <ProductCombobox
                value={productSysId}
                onChange={setProductSysId}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                Links the Finance CPM product. This can only be done once.
              </p>
            </div>
          )}

          {showGrade && (
            <div className="space-y-1.5">
              <Label>
                Grade Requirement <span className="text-destructive">*</span>
              </Label>
              <Select
                value={String(gradeReq)}
                onValueChange={(v) => setGradeReq(Number(v) as GradeReq)}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select grade requirement" />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_REQ_OPTIONS.filter(
                    (o) => o.value !== GradeReq.GRADE_REQ_UNSPECIFIED
                  ).map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showClausePct && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="confirm-ax-min">
                  AX Min % <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="confirm-ax-min"
                  inputMode="decimal"
                  placeholder="e.g., 80"
                  value={axMinPct}
                  onChange={(e) => setAxMinPct(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-am-max">
                  AM Max % <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="confirm-am-max"
                  inputMode="decimal"
                  placeholder="e.g., 20"
                  value={amMaxPct}
                  onChange={(e) => setAmMaxPct(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Only used by {GRADE_REQ_LABELS[GradeReq.GRADE_REQ_AX_AM_CLAUSE]}, and required
                while it is selected. Pick another grade requirement above and these are
                ignored.
              </p>
            </div>
          )}

          {showContractNo && (
            <div className="space-y-1.5">
              <Label htmlFor="confirm-contract-no">Contract No</Label>
              <Input
                id="confirm-contract-no"
                placeholder="Optional"
                value={contractNo}
                onChange={(e) => setContractNo(e.target.value)}
                disabled={isPending}
              />
            </div>
          )}

          {(showIncoterm || showLcStatus) && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {showIncoterm && (
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-incoterm">Incoterm</Label>
                  <Input
                    id="confirm-incoterm"
                    placeholder="Optional"
                    value={incoterm}
                    onChange={(e) => setIncoterm(e.target.value)}
                    disabled={isPending}
                  />
                </div>
              )}
              {showLcStatus && (
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-lc-status">LC Status</Label>
                  <Input
                    id="confirm-lc-status"
                    placeholder="Optional"
                    value={lcStatus}
                    onChange={(e) => setLcStatus(e.target.value)}
                    disabled={isPending}
                  />
                </div>
              )}
            </div>
          )}

          {showStuffAdvanceNo && (
            <div className="space-y-1.5">
              <Label htmlFor="confirm-stuff-advance-no">Stuffing Advance No</Label>
              <Input
                id="confirm-stuff-advance-no"
                placeholder="Optional"
                maxLength={50}
                value={stuffAdvanceNo}
                onChange={(e) => setStuffAdvanceNo(e.target.value)}
                disabled={isPending}
              />
            </div>
          )}
        </div>
      )}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={!canSubmit || isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {hasAnyField ? "Save & Confirm" : "Confirm"}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

/**
 * detectGaps lists the confirmation-relevant fields a demand is missing.
 *
 * Scope is deliberately limited to fields that are (a) blank on real rows and
 * (b) writable through an RPC reachable before ConfirmDemand — i.e. the product
 * (MapDemandProduct) and the UpdateDemand field set. Quantity and deadline are
 * excluded because the domain already rejects a demand without them at creation
 * time, so they are never blank here. Customer, contract date and sub-type are
 * excluded because UpdateDemand cannot write them: filling them would need a
 * proto change.
 */
function detectGaps(demand: Demand | null): Set<GapKey> {
  const gaps = new Set<GapKey>()
  if (!demand) return gaps

  // Blocking: PENDING_PRODUCT_LINK cannot transition to CONFIRMED at all — its
  // only legal successor is PENDING_CONFIRMATION, reached by linking a product.
  if (!demand.cpmProductSysId) gaps.add("product")

  // Blocking in practice: an Orion pull hard-codes GRADE_REQ NONE and a demand
  // may carry UNSPECIFIED, neither of which states an actual requirement.
  if (
    demand.gradeRequirement === GradeReq.GRADE_REQ_UNSPECIFIED ||
    demand.gradeRequirement === GradeReq.GRADE_REQ_NONE
  ) {
    gaps.add("grade")
  }

  // Blocking: the domain refuses an AX_AM_CLAUSE demand whose percentages are
  // absent, so a stored clause grade with a missing pair cannot be confirmed.
  if (
    demand.gradeRequirement === GradeReq.GRADE_REQ_AX_AM_CLAUSE &&
    (!demand.axMinPct || !demand.amMaxPct)
  ) {
    gaps.add("clausePct")
  }

  // Advisory, contract demands only: commercial fields the planner is expected
  // to have on hand at confirmation. Blank is accepted — these never block, and
  // an MTS or sample demand has no contract to carry them in the first place.
  if (demand.type === DemandType.DEMAND_TYPE_CONTRACT) {
    if (!demand.contractNo) gaps.add("contractNo")
    if (!demand.incoterm) gaps.add("incoterm")
    if (!demand.lcStatus) gaps.add("lcStatus")
    if (!demand.stuffAdvanceNo) gaps.add("stuffAdvanceNo")
  }

  return gaps
}
