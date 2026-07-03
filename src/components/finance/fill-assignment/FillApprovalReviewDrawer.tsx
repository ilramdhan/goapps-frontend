"use client"

import { useMemo } from "react"
import { ArrowLeft, CheckCircle2, Loader2, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"
import { EmptyState } from "@/components/common/empty-state"
import {
  useFillTasks,
  useApproveFillTask,
  useApprovalVisibleParams,
} from "@/hooks/finance/use-fill-assignment"
import { useProductRequiredParams } from "@/hooks/finance/use-cost-product-parameter"
import { useRouteGraph } from "@/hooks/finance/use-cost-route"
import { getProductsAtLevel } from "@/types/finance/cost-route"
import type { RequiredParamEntry } from "@/types/finance/cost-product-parameter"
import type { Parameter } from "@/types/finance/parameter"

import { FillTaskStatusBadge } from "./FillTaskStatusBadge"

interface Props {
  requestId: number
  taskId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatParamValue(param: RequiredParamEntry): string {
  if (!param.hasValue) return "—"
  if (param.dataType === "BOOLEAN") return param.valueFlag ? "Yes" : "No"
  if (param.dataType === "NUMBER") return param.valueNumeric || "—"
  return param.valueText || "—"
}

/**
 * One product's read-only summary — intersects the approval-visible param
 * list (is_approval_visible = true, ordered by approval_display_order) with
 * the params actually applicable to THIS product (cost_product_applicable_param,
 * same source `useProductRequiredParams` the fill-entry drawer already reads —
 * shares its React Query cache entry, so no duplicate network call when this
 * drawer is opened for a product already visited during filling).
 */
function ApprovalReviewProductSection({
  productSysId,
  productCode,
  productName,
  visibleParams,
}: {
  productSysId: number
  productCode?: string
  productName?: string
  visibleParams: Parameter[]
}) {
  const { data: applicable = [], isLoading } = useProductRequiredParams(productSysId)

  const rows = useMemo(() => {
    const byParamId = new Map(applicable.map((p) => [p.paramId, p]))
    return visibleParams
      .map((vp) => byParamId.get(vp.paramId))
      .filter((p): p is RequiredParamEntry => Boolean(p))
  }, [applicable, visibleParams])

  const title = productCode ?? productName ?? `Product ${productSysId}`

  if (isLoading) {
    return <div className="h-16 animate-pulse rounded-md bg-muted" />
  }

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2.5">
        <span className="text-sm font-semibold">{title}</span>
        {productName && productCode && (
          <span className="text-xs text-muted-foreground truncate">{productName}</span>
        )}
      </div>
      <div className="divide-y">
        {rows.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">
            No summary parameters apply to this product.
          </p>
        ) : (
          rows.map((p) => (
            <div key={p.paramId} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium truncate">{p.paramName || p.paramCode}</span>
                {p.uomCode && (
                  <Badge variant="outline" className="text-[10px] px-1.5 shrink-0 font-normal">
                    {p.uomCode}
                  </Badge>
                )}
              </div>
              <span className="text-sm text-muted-foreground shrink-0">{formatParamValue(p)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function DrawerContent({
  requestId,
  taskId,
  onClose,
}: {
  requestId: number
  taskId: number
  onClose: () => void
}) {
  const { data: tasks = [], isLoading: tasksLoading } = useFillTasks(requestId)
  const task = useMemo(() => tasks.find((t) => t.taskId === taskId), [tasks, taskId])
  const { data: graph, isLoading: graphLoading } = useRouteGraph(task?.routeHeadId)
  const { data: visibleParams, isLoading: paramsLoading } = useApprovalVisibleParams()

  const productsAtLevel = useMemo(
    () => getProductsAtLevel(graph, task?.routeLevel),
    [graph, task],
  )

  const approveM = useApproveFillTask(requestId)

  const isLoading = tasksLoading || graphLoading || paramsLoading
  const isApprovalPending = task?.status === "FILL_TASK_STATUS_APPROVAL_PENDING"

  function onApprove() {
    if (!task) return
    approveM.mutate({ taskId: task.taskId }, { onSuccess: onClose })
  }

  return (
    <>
      {/* ── Sticky header ── */}
      <div className="flex shrink-0 items-start gap-3 border-b bg-background px-6 py-4">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="font-mono text-xs font-normal">
              REQ-{requestId}
            </Badge>
            {task && <FillTaskStatusBadge status={task.status} />}
          </div>
          <SheetTitle className="text-base font-semibold leading-tight">
            Review Before Approving{task ? ` — Level ${task.routeLevel}` : ""}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {task
              ? `Fill task #${task.taskId} · ${productsAtLevel.length} product(s) at this level`
              : "Loading task…"}
          </SheetDescription>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={onClose}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to request
          </Button>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </SheetClose>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {isLoading && (
          <div className="space-y-4">
            <div className="h-12 animate-pulse rounded-lg bg-muted" />
            <div className="h-48 animate-pulse rounded-lg bg-muted" />
          </div>
        )}

        {!isLoading && !task && (
          <EmptyState
            title="Fill task not found"
            description={`No fill task #${taskId} for request ${requestId}.`}
            action={<Button onClick={onClose}>Back to request</Button>}
          />
        )}

        {!isLoading && task && !isApprovalPending && (
          <div className="rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
            This task is in <strong>{task.status.replace("FILL_TASK_STATUS_", "")}</strong> state
            and is no longer pending approval.
          </div>
        )}

        {!isLoading && task && isApprovalPending && visibleParams.length === 0 && (
          <div className="rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
            No summary parameters configured — showing full approval is still enabled.
          </div>
        )}

        {!isLoading && task && isApprovalPending && productsAtLevel.length === 0 && (
          <EmptyState
            title="No products at this level"
            description={`Route level ${task.routeLevel} has no products in the routing graph.`}
          />
        )}

        {!isLoading &&
          task &&
          isApprovalPending &&
          visibleParams.length > 0 &&
          productsAtLevel.map((seq) => (
            <ApprovalReviewProductSection
              key={seq.productSysId}
              productSysId={seq.productSysId}
              productCode={seq.productCode}
              productName={seq.productName}
              visibleParams={visibleParams}
            />
          ))}
      </div>

      {/* ── Sticky footer ── */}
      {!isLoading && task && isApprovalPending && (
        <div className="flex shrink-0 items-center justify-between gap-4 border-t bg-background px-6 py-4">
          <p className="text-sm text-muted-foreground">
            Review the values above, then approve to move this level forward.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={approveM.isPending}>
              Cancel
            </Button>
            <Button onClick={onApprove} disabled={approveM.isPending}>
              {approveM.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Approve
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Review-before-approve drawer for a fill task (item #4). Opened in place of
 * the old one-click `ApproveFillTask` call — shows a read-only, per-product
 * summary of the params flagged `is_approval_visible` in Parameter Master,
 * intersected with what's actually applicable to each product at this route
 * level. The footer's Approve button calls the SAME unchanged
 * `useApproveFillTask` mutation as before; this component adds a review step,
 * it does not change the approve RPC contract.
 */
export function FillApprovalReviewDrawer({ requestId, taskId, open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex flex-col p-0 w-full sm:max-w-2xl gap-0"
      >
        {open && taskId !== null && (
          <DrawerContent
            requestId={requestId}
            taskId={taskId}
            onClose={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
