"use client"

import type { ReactNode } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { PageHeader } from "@/components/common/page-header"
import { EmptyState } from "@/components/common/empty-state"
import { StatusBadge } from "@/components/common/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import {
  WOParameterPanel,
  WORmPanel,
  WOActualPanel,
  WOActions,
} from "@/components/ppc/work-order"

import { usePlanItem } from "@/hooks/ppc/use-plan-item"
import { useWorkOrder } from "@/hooks/ppc/use-work-order"
import { PROD_CATEGORY_LABELS, woStatusToken } from "@/types/ppc/common"

interface Props {
  woId: number
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

export default function WorkOrderDetailClient({ woId }: Props) {
  const router = useRouter()
  const { data, isLoading } = useWorkOrder(
    Number.isFinite(woId) && woId > 0 ? String(woId) : ""
  )
  const workOrder = data?.data ?? null
  // Shade lives on the plan item, not on the work order — the WO inherits it
  // from the plan item it was released from.
  const { data: planItemData } = usePlanItem(
    workOrder?.planItemId ? String(workOrder.planItemId) : ""
  )
  const shadeCode = planItemData?.data?.shadeCode ?? ""
  const shadeName = planItemData?.data?.shadeName ?? ""
  // A merged WO covers several plan items. The anchor above is still a valid
  // shade source — the merge rule only ever joins compatible shades — but the
  // full set is what the planner needs to see.
  const linkedPlanItems = workOrder?.linkedPlanItems ?? []
  const isMerged = linkedPlanItems.length > 1

  function backToList() {
    router.push("/production-plan/work-orders")
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Loading…" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (!workOrder) {
    return (
      <div className="space-y-6">
        <PageHeader title="Work Order">
          <Button variant="outline" onClick={backToList}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to list
          </Button>
        </PageHeader>
        <EmptyState
          title="Work order not found"
          description={`No work order with id ${woId}.`}
          action={<Button onClick={backToList}>Back to list</Button>}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title={workOrder.woNo} subtitle={workOrder.cpmProductName || undefined}>
        <Button variant="outline" onClick={backToList}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to list
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left column — main content */}
        <div className="space-y-6 lg:col-span-8">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="font-mono text-xs text-muted-foreground">{workOrder.woNo}</div>
                  <div className="text-base font-semibold">
                    {workOrder.cpmProductName || "—"}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {workOrder.cpmProductCode}
                  </div>
                </div>
                <StatusBadge status={woStatusToken(workOrder.status)} type="ppcWo" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Field label="Machine">{workOrder.machineNo || "-"}</Field>
                <Field label="Lot No">
                  <span className="font-mono">{workOrder.lotNo || "-"}</span>
                </Field>
                <Field label="Target Qty (kg)">{workOrder.qtyTarget || "-"}</Field>
                <Field label="Deadline">{workOrder.deadline || "-"}</Field>
                <Field label="Category">
                  {PROD_CATEGORY_LABELS[workOrder.prodCategory] ?? "Normal"}
                </Field>
                <Field label="Grade Req">{workOrder.gradeRequirement || "-"}</Field>
                <Field label="Shade">
                  {shadeCode ? (
                    <>
                      <span className="font-mono">{shadeCode}</span>
                      {shadeName && <span className="text-muted-foreground"> · {shadeName}</span>}
                    </>
                  ) : (
                    "-"
                  )}
                </Field>
                <Field label="Route Version">
                  {workOrder.crhVersion ? `v${workOrder.crhVersion}` : "-"}
                </Field>
                <Field label="Revision">
                  {workOrder.revisionNo > 0 ? `#${workOrder.revisionNo}` : "-"}
                </Field>
              </dl>
              {workOrder.revisionReason && (
                <div className="border-t pt-4">
                  <p className="mb-1 text-xs text-muted-foreground">Revision Reason</p>
                  <p className="text-sm whitespace-pre-wrap">{workOrder.revisionReason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {isMerged && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold">Merged plan items</CardTitle>
                <span className="text-xs text-muted-foreground">
                  {linkedPlanItems.length} items
                </span>
              </CardHeader>
              <CardContent className="space-y-3">
                {linkedPlanItems.map((l) => (
                  <div
                    key={l.planItemId}
                    className="flex items-start justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {l.productName || "—"}
                        {l.isAnchor && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            anchor
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-mono">{l.productCode}</span>
                        {(l.shadeName || l.shadeCode) && ` · ${l.shadeName || l.shadeCode}`}
                        {l.deadline && ` · due ${l.deadline}`}
                      </div>
                    </div>
                    <div className="shrink-0 text-sm">{l.qtyContribution} kg</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <WOParameterPanel workOrder={workOrder} />
          <WORmPanel workOrder={workOrder} />
          <WOActualPanel workOrder={workOrder} />
        </div>

        {/* Right column — actions + approval trace */}
        <div className="space-y-6 lg:col-span-4">
          <WOActions workOrder={workOrder} />
        </div>
      </div>
    </div>
  )
}
