"use client"

import { useMemo, useState } from "react"
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"
import { EmptyState } from "@/components/common/empty-state"
import { useFillTasks, useSubmitFillTask } from "@/hooks/finance/use-fill-assignment"
import { useRouteGraph } from "@/hooks/finance/use-cost-route"
import { getProductsAtLevel } from "@/types/finance/cost-route"

import { FillParamProductSection } from "./FillParamProductSection"
import { FillTaskStatusBadge } from "./FillTaskStatusBadge"

interface Props {
  requestId: number
  taskId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function DrawerContent({ requestId, taskId, onClose }: { requestId: number; taskId: number; onClose: () => void }) {
  const { data: tasks = [], isLoading: tasksLoading } = useFillTasks(requestId)
  const task = useMemo(() => tasks.find((t) => t.taskId === taskId), [tasks, taskId])
  const { data: graph, isLoading: graphLoading } = useRouteGraph(task?.routeHeadId)

  const productsAtLevel = useMemo(
    () => getProductsAtLevel(graph, task?.routeLevel),
    [graph, task],
  )

  const submitM = useSubmitFillTask(requestId)
  const [savedProducts, setSavedProducts] = useState<Set<number>>(new Set())

  function markSaved(productSysId: number) {
    setSavedProducts((prev) => new Set([...prev, productSysId]))
  }

  const allSaved =
    productsAtLevel.length > 0 &&
    productsAtLevel.every((s) => savedProducts.has(s.productSysId))

  const isFilling = task?.status === "FILL_TASK_STATUS_FILLING"
  const canSubmit = isFilling && allSaved && !submitM.isPending
  const isLoading = tasksLoading || graphLoading

  function onSubmit() {
    if (!task) return
    submitM.mutate(task.taskId, { onSuccess: onClose })
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
            Fill Parameters{task ? ` — Level ${task.routeLevel}` : ""}
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
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
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

        {!isLoading && task && !isFilling && (
          <div className="rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
            This task is in <strong>{task.status.replace("FILL_TASK_STATUS_", "")}</strong> state.
            {task.status === "FILL_TASK_STATUS_ACTIVE" && " Claim it first before entering parameters."}
          </div>
        )}

        {!isLoading && task && productsAtLevel.length === 0 && (
          <EmptyState
            title="No products at this level"
            description={`Route level ${task.routeLevel} has no products in the routing graph.`}
          />
        )}

        {!isLoading && productsAtLevel.map((seq) => (
          <FillParamProductSection
            key={seq.productSysId}
            productSysId={seq.productSysId}
            productCode={seq.productCode}
            productName={seq.productName}
            onSaved={() => markSaved(seq.productSysId)}
          />
        ))}
      </div>

      {/* ── Sticky footer ── */}
      {!isLoading && task && productsAtLevel.length > 0 && (
        <div className="flex shrink-0 items-center justify-between gap-4 border-t bg-background px-6 py-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{savedProducts.size}</span>
            {" / "}
            {productsAtLevel.length} product(s) saved
          </p>
          <Button onClick={onSubmit} disabled={!canSubmit}>
            {submitM.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Submit Fill
          </Button>
        </div>
      )}
    </>
  )
}

export function FillParamDrawer({ requestId, taskId, open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex flex-col p-0 w-full sm:max-w-2xl gap-0"
      >
        {taskId !== null && (
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
