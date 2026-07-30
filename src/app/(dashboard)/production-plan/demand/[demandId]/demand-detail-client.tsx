"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, ThumbsUp, ThumbsDown, Loader2, Link2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { PageHeader, StatusBadge, EmptyState } from "@/components/common"
import { MapProductDialog } from "@/components/ppc/demand/map-product-dialog"
import { ConfirmDemandDialog } from "@/components/ppc/demand/confirm-demand-dialog"

import { useDemand, useApproveMTSDemand } from "@/hooks/ppc/use-demand"
import {
  DemandType,
  DemandStatus,
  DEMAND_TYPE_LABELS,
  DEMAND_SUB_TYPE_LABELS,
  DEMAND_SOURCE_LABELS,
  CARRY_ACTION_LABELS,
  CarryAction,
  GRADE_REQ_LABELS,
  GradeReq,
  demandStatusToken,
  productLinkReasonLabel,
} from "@/types/ppc/common"

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

function fmtQty(value: string): string {
  const n = Number(value)
  return Number.isFinite(n) && value ? n.toLocaleString() : value || "-"
}

function fmtDate(value: string): string {
  return value ? value.slice(0, 10) : "-"
}

export default function DemandDetailClient({ demandId }: { demandId: number }) {
  const { data, isLoading } = useDemand(String(demandId))
  const approveMutation = useApproveMTSDemand()
  const [note, setNote] = useState("")
  const [linkOpen, setLinkOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const demand = data?.data
  if (!demand) {
    return (
      <EmptyState
        title="Demand not found"
        description="This demand may have been deleted or the link is invalid."
        action={
          <Button asChild variant="outline">
            <Link href="/production-plan/demand">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to demands
            </Link>
          </Button>
        }
      />
    )
  }

  const isPending = demand.status === DemandStatus.DEMAND_STATUS_PENDING_CONFIRMATION
  const isPendingMTS = demand.type === DemandType.DEMAND_TYPE_MTS && isPending
  const isUnlinked = demand.status === DemandStatus.DEMAND_STATUS_PENDING_PRODUCT_LINK
  const hasAmClause = demand.gradeRequirement === GradeReq.GRADE_REQ_AX_AM_CLAUSE

  return (
    <div className="space-y-6">
      <PageHeader
        // An unlinked demand has no product to name it by, so it is named by the
        // Orion item code it was pulled from — its only human-readable identity.
        title={
          demand.productName ||
          demand.productCode ||
          (demand.cpmProductSysId
            ? "Product name unavailable"
            : demand.orionItemCode || "Product not mapped")
        }
        subtitle={
          !demand.cpmProductSysId && demand.orionItemCode
            ? "Orion item — product not linked yet"
            : "Production demand detail"
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/production-plan/demand">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          {isUnlinked && (
            <Button onClick={() => setLinkOpen(true)}>
              <Link2 className="mr-2 h-4 w-4" />
              Link Product
            </Button>
          )}
          {isPending && !isPendingMTS && (
            <Button onClick={() => setConfirmOpen(true)}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Confirm
            </Button>
          )}
        </div>
      </PageHeader>

      {/* An unlinked demand cannot be planned; say why and what to do about it. */}
      {isUnlinked && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-500/40 dark:bg-amber-500/10">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            {productLinkReasonLabel(demand.productLinkReason)}
          </p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
            Planning is blocked until a Finance CPM product is linked to this demand.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          {/* Header card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  {demand.productCode ? (
                    <div className="font-mono text-xs text-muted-foreground">{demand.productCode}</div>
                  ) : (
                    demand.orionItemCode && (
                      <div className="font-mono text-xs text-muted-foreground">
                        {demand.orionItemCode}
                        <span className="ml-1.5 not-italic">(Orion item code)</span>
                      </div>
                    )
                  )}
                  {/* A blank label does not mean "unlinked": the product code
                      and name are resolved from finance over gRPC and come back
                      empty whenever that lookup degrades. cpmProductSysId is
                      the field that actually says whether a product is linked. */}
                  <CardTitle className="text-sm font-semibold">
                    {demand.productName || (
                      <span className="text-muted-foreground font-normal italic">
                        {demand.cpmProductSysId
                          ? "Product name unavailable"
                          : "Product not mapped"}
                      </span>
                    )}
                  </CardTitle>
                </div>
                <StatusBadge status={demandStatusToken(demand.status)} type="ppcDemand" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Field label="Type">{DEMAND_TYPE_LABELS[demand.type] || "-"}</Field>
                <Field label="Sub Type">{DEMAND_SUB_TYPE_LABELS[demand.subType] || "-"}</Field>
                <Field label="Source">{DEMAND_SOURCE_LABELS[demand.source] || "-"}</Field>
                <Field label="Month">{demand.month || "-"}</Field>
                <Field label="Qty Original">{fmtQty(demand.qtyOriginal)}</Field>
                <Field label="Qty Remaining">{fmtQty(demand.qtyRemaining)}</Field>
                <Field label="Deadline">{fmtDate(demand.deadline)}</Field>
                {demand.carryAction !== CarryAction.CARRY_ACTION_UNSPECIFIED && (
                  <Field label="Carry Action">{CARRY_ACTION_LABELS[demand.carryAction]}</Field>
                )}
              </dl>

              {(demand.customerCode ||
                demand.customerName ||
                demand.contractNo ||
                demand.contractDate ||
                demand.incoterm ||
                demand.lcStatus ||
                demand.stuffAdvanceNo) && (
                <div className="border-t pt-4">
                  <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">Commercial</p>
                  <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {(demand.customerCode || demand.customerName) && (
                      <Field label="Customer">
                        <span className="font-mono text-xs">{demand.customerCode}</span>
                        {demand.customerName && <span className="ml-2">{demand.customerName}</span>}
                      </Field>
                    )}
                    {demand.contractNo && <Field label="Contract No">{demand.contractNo}</Field>}
                    {demand.contractDate && <Field label="Contract Date">{fmtDate(demand.contractDate)}</Field>}
                    {demand.incoterm && <Field label="Incoterm">{demand.incoterm}</Field>}
                    {demand.lcStatus && <Field label="LC Status">{demand.lcStatus}</Field>}
                    {demand.stuffAdvanceNo && <Field label="Stuffing Advance No">{demand.stuffAdvanceNo}</Field>}
                  </dl>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Grade requirement card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Grade Requirement</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Field label="Requirement">{GRADE_REQ_LABELS[demand.gradeRequirement] || "-"}</Field>
                {hasAmClause && (
                  <>
                    {demand.axMinPct && <Field label="AX Min %">{demand.axMinPct}</Field>}
                    {demand.amMaxPct && <Field label="AM Max %">{demand.amMaxPct}</Field>}
                  </>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6 lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Production</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                <Field label="Est. Production Needed">{fmtQty(demand.estProdNeeded)}</Field>
                <Field label="Confirmed At">{demand.confirmedAt ? fmtDate(demand.confirmedAt) : "-"}</Field>
              </dl>
            </CardContent>
          </Card>

          {isPendingMTS && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">MTS Approval</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="mts-note" className="text-xs">
                    Note (optional)
                  </Label>
                  <Textarea
                    id="mts-note"
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add an approval or rejection note..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() =>
                      approveMutation.mutate({
                        demandId: demand.demandId,
                        approved: true,
                        note: note || undefined,
                      })
                    }
                    disabled={approveMutation.isPending}
                  >
                    {approveMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ThumbsUp className="mr-2 h-4 w-4" />
                    )}
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() =>
                      approveMutation.mutate({
                        demandId: demand.demandId,
                        approved: false,
                        note: note || undefined,
                      })
                    }
                    disabled={approveMutation.isPending}
                  >
                    <ThumbsDown className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <MapProductDialog open={linkOpen} onOpenChange={setLinkOpen} demand={demand} />
      <ConfirmDemandDialog open={confirmOpen} onOpenChange={setConfirmOpen} demand={demand} />
    </div>
  )
}
