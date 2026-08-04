"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader, StatusBadge, EmptyState } from "@/components/common"
import { PlanItemConfirmDialog } from "@/components/ppc/plan/plan-item-confirm-dialog"

import { usePlanItem } from "@/hooks/ppc/use-plan-item"
import { PLAN_ITEM_TYPE_LABELS, PLAN_CARRY_ACTION_LABELS, PlanItemStatus, planItemStatusToken } from "@/types/ppc/common"

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

export default function PlanItemDetailClient({ planItemId }: { planItemId: number }) {
  const { data, isLoading } = usePlanItem(String(planItemId))
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const item = data?.data
  if (!item) {
    return (
      <EmptyState
        title="Plan item not found"
        description="This plan item may have been deleted or the link is invalid."
        action={
          <Button asChild variant="outline">
            <Link href="/production-plan/plan">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to plan items
            </Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={item.productName || item.productCode || "Product not mapped"}
        subtitle="Production plan item detail"
      >
        <div className="flex flex-wrap items-center gap-2">
          {item.status === PlanItemStatus.PLAN_ITEM_STATUS_DRAFT && (
            <Button onClick={() => setIsConfirmOpen(true)}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Confirm
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href="/production-plan/plan">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
      </PageHeader>

      <PlanItemConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        planItem={item}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          {/* Header card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  {item.productCode && (
                    <div className="font-mono text-xs text-muted-foreground">{item.productCode}</div>
                  )}
                  <CardTitle className="text-sm font-semibold">
                    {item.productName || (
                      <span className="text-muted-foreground font-normal italic">Product not mapped</span>
                    )}
                  </CardTitle>
                </div>
                <StatusBadge status={planItemStatusToken(item.status)} type="ppcPlan" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Field label="Type">{PLAN_ITEM_TYPE_LABELS[item.type] || "-"}</Field>
                <Field label="Month">{item.month || "-"}</Field>
                {item.carryFromItemId > 0 && (
                  <Field label="Source">
                    <Link
                      href={`/production-plan/plan/${item.carryFromItemId}`}
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      {PLAN_CARRY_ACTION_LABELS[item.carryAction] || "Carried"} in {item.month}
                    </Link>
                  </Field>
                )}
                <Field label="Qty Target">{fmtQty(item.qtyTarget)}</Field>
                <Field label="Deadline">{fmtDate(item.deadline)}</Field>
                <Field label="Sequence">{item.sequence || "-"}</Field>
                <Field label="Shade">
                  {item.shadeCode ? (
                    <>
                      <span className="font-mono">{item.shadeCode}</span>
                      {item.shadeName && (
                        <span className="text-muted-foreground"> · {item.shadeName}</span>
                      )}
                    </>
                  ) : (
                    "-"
                  )}
                </Field>
              </dl>
            </CardContent>
          </Card>

          {item.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{item.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6 lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Production</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                <Field label="Machine Group">
                  {item.machineGroupId ? `Group #${item.machineGroupId}` : "-"}
                </Field>
                {!!item.preferredMachineId && (
                  <Field label="Preferred Machine">{`Machine #${item.preferredMachineId}`}</Field>
                )}
                {!!item.demandId && (
                  <Field label="Demand">
                    <Link
                      href={`/production-plan/demand/${item.demandId}`}
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      View demand
                    </Link>
                  </Field>
                )}
                {!!item.parentItemId && (
                  <Field label="Parent Plan Item">
                    <Link
                      href={`/production-plan/plan/${item.parentItemId}`}
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      View parent item
                    </Link>
                  </Field>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
