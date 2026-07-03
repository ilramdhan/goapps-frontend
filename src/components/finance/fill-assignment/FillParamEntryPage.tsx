"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/common/empty-state"
import { PageHeader } from "@/components/common/page-header"
import { useFillTasks, useSubmitFillTask } from "@/hooks/finance/use-fill-assignment"
import { useRouteGraph } from "@/hooks/finance/use-cost-route"
import { getProductsAtLevel } from "@/types/finance/cost-route"

import { FillParamProductSection } from "./FillParamProductSection"
import { FillTaskStatusBadge } from "./FillTaskStatusBadge"

interface Props {
  requestId: number
  taskId: number
  onDone?: () => void
}

export function FillParamEntryPage({ requestId, taskId, onDone }: Props) {
  const router = useRouter()
  const { data: tasks = [], isLoading: tasksLoading } = useFillTasks(requestId)
  const task = useMemo(() => tasks.find((t) => t.taskId === taskId), [tasks, taskId])

  const { data: graph, isLoading: graphLoading } = useRouteGraph(task?.routeHeadId)
  const isLocked = graph?.head?.routingStatus === "LOCKED"

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

  const isLoading = tasksLoading || graphLoading
  const backUrl = `/finance/product-requests/${requestId}?tab=fill-tracking`

  function goBack() {
    if (onDone) { onDone(); return }
    router.push(backUrl)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-16 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="space-y-6">
        <PageHeader title="Fill Parameters">
          <Button variant="outline" onClick={goBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </PageHeader>
        <EmptyState
          title="Fill task not found"
          description={`No fill task with id ${taskId} for request ${requestId}.`}
          action={<Button onClick={goBack}>Back to request</Button>}
        />
      </div>
    )
  }

  const isFilling = task.status === "FILL_TASK_STATUS_FILLING"
  const canSubmit = isFilling && allSaved && !submitM.isPending

  function onSubmit() {
    submitM.mutate(task!.taskId, {
      onSuccess: () => onDone ? onDone() : router.push(backUrl),
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Fill Parameters — Level ${task.routeLevel}`}
        subtitle={`Request #${requestId} · Fill Task #${taskId}`}
      >
        <div className="flex items-center gap-3">
          <FillTaskStatusBadge status={task.status} />
          <Button variant="outline" onClick={goBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to request
          </Button>
        </div>
      </PageHeader>

      {!isFilling && (
        <div className="rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
          This fill task is in <strong>{task.status.replace("FILL_TASK_STATUS_", "")}</strong> state.
          {task.status === "FILL_TASK_STATUS_ACTIVE" && " Claim the task first before entering parameters."}
        </div>
      )}

      {productsAtLevel.length === 0 && !graphLoading && (
        <EmptyState
          title="No products at this level"
          description={`Route level ${task.routeLevel} has no products in the routing graph.`}
        />
      )}

      {productsAtLevel.map((seq) => (
        <FillParamProductSection
          key={seq.productSysId}
          productSysId={seq.productSysId}
          productCode={seq.productCode}
          productName={seq.productName}
          onSaved={() => markSaved(seq.productSysId)}
          isLocked={isLocked}
        />
      ))}

      {productsAtLevel.length > 0 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-muted-foreground">
            {savedProducts.size} / {productsAtLevel.length} product(s) saved
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
    </div>
  )
}
