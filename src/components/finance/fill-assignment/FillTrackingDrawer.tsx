"use client"

import { ArrowLeft, ListChecks } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"
import { DeptName } from "@/components/common/dept-name"
import { UserName } from "@/components/common/user-name"
import { useFillTasks } from "@/hooks/finance/use-fill-assignment"
import { useRouteGraph } from "@/hooks/finance/use-cost-route"
import { getProductsAtLevel } from "@/types/finance/cost-route"
import { type FillTask } from "@/types/finance/fill-assignment"

import { FillTaskProgressBar } from "./FillTaskProgressBar"
import { FillTaskStatusBadge } from "./FillTaskStatusBadge"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  requestId: number
  requestNo: string
}

function FillTrackingDrawerRow({ task }: { task: FillTask }) {
  const { data: graph } = useRouteGraph(task.routeHeadId || undefined)
  const productsAtLevel = getProductsAtLevel(graph, task.routeLevel)

  return (
    <li className="rounded-md border bg-muted/20 px-3 py-2.5 space-y-2">
      {/* Level + status */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold">Level {task.routeLevel}</span>
        <FillTaskStatusBadge status={task.status} />
      </div>

      {/* Product codes at this level */}
      {productsAtLevel.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {productsAtLevel.map((s) => (
            <Badge
              key={s.productSysId}
              variant="outline"
              className="font-mono text-[10px] font-normal"
            >
              {s.productCode || `#${s.productSysId}`}
            </Badge>
          ))}
        </div>
      )}

      {/* Filler + SLA */}
      <div className="text-xs text-muted-foreground">
        {task.fillerType === "FILL_ACTOR_TYPE_USER" ? (
          <UserName userId={task.fillerValue} />
        ) : task.fillerType === "FILL_ACTOR_TYPE_DEPT" ? (
          <DeptName deptCode={task.fillerValue} />
        ) : (
          task.fillerValue || "—"
        )}
        <span className="ml-2 opacity-60">{task.slaFillHours}h SLA</span>
      </div>

      {/* Progress bar */}
      <FillTaskProgressBar task={task} />

      {/* Claimed by */}
      {task.claimedBy && (
        <div className="text-xs text-muted-foreground">
          <span className="opacity-60">Claimed by </span>
          <UserName userId={task.claimedBy} />
        </div>
      )}
    </li>
  )
}

function DrawerContent({
  requestId,
  requestNo,
  onClose,
}: {
  requestId: number
  requestNo: string
  onClose: () => void
}) {
  const { data: tasks = [], isLoading } = useFillTasks(requestId)
  const approved = tasks.filter((t) => t.status === "FILL_TASK_STATUS_APPROVED").length

  return (
    <>
      {/* Sticky header */}
      <div className="flex shrink-0 items-start gap-3 border-b bg-background px-6 py-4">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="font-mono text-xs font-normal">
              {requestNo}
            </Badge>
            {!isLoading && tasks.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {approved}/{tasks.length} approved
              </span>
            )}
          </div>
          <SheetTitle className="text-base font-semibold leading-tight">
            Fill Tracking
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {isLoading
              ? "Loading tasks…"
              : tasks.length === 0
                ? "No fill tasks for this request"
                : `${tasks.length} fill task${tasks.length !== 1 ? "s" : ""}`}
          </SheetDescription>
        </div>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs shrink-0" onClick={onClose}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        )}

        {!isLoading && tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <ListChecks className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No fill tasks yet</p>
          </div>
        )}

        {!isLoading && tasks.length > 0 && (
          <ol className="space-y-3">
            {tasks.map((task) => (
              <FillTrackingDrawerRow key={task.taskId} task={task} />
            ))}
          </ol>
        )}
      </div>
    </>
  )
}

export function FillTrackingDrawer({ open, onOpenChange, requestId, requestNo }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex flex-col p-0 w-full sm:max-w-lg gap-0"
      >
        <DrawerContent
          requestId={requestId}
          requestNo={requestNo}
          onClose={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  )
}
