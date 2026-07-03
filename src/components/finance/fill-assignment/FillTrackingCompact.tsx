"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import {
  useFillTasks,
  useClaimFillTask,
  useRejectFillTask,
} from "@/hooks/finance/use-fill-assignment";
import { useUser } from "@/providers/auth-provider";
import { useRouteGraph } from "@/hooks/finance/use-cost-route";
import { getProductsAtLevel } from "@/types/finance/cost-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FillTaskStatusBadge } from "./FillTaskStatusBadge";
import { FillTaskProgressBar } from "./FillTaskProgressBar";
import { FillTaskIdentity } from "./FillTaskIdentity";
import { FillParamDrawer } from "./FillParamDrawer";
import { FillApprovalReviewDrawer } from "./FillApprovalReviewDrawer";

interface Props {
  requestId: number;
}

export function FillTrackingCompact({ requestId }: Props) {
  const user = useUser();
  const [drawerTaskId, setDrawerTaskId] = useState<number | null>(null);
  const [approvalDrawerTaskId, setApprovalDrawerTaskId] = useState<number | null>(null);
  const currentUserId = user?.userId ?? "";
  const isSuperAdmin = user?.roles?.includes("SUPER_ADMIN") ?? false;
  const currentUserDepts: string[] = [user?.departmentCode, user?.sectionCode].filter(
    (c): c is string => Boolean(c),
  );

  const { data: tasks = [], isLoading } = useFillTasks(requestId);
  const claim = useClaimFillTask(requestId);
  const reject = useRejectFillTask(requestId);

  // All fill tasks for a request share the same route head (generated in one
  // batch), so a single graph fetch covers every task's "products at level".
  const { data: graph } = useRouteGraph(tasks[0]?.routeHeadId || undefined);

  if (!isLoading && tasks.length === 0) return null;

  const myBlockerTask = tasks.find(
    (t) =>
      (t.status === "FILL_TASK_STATUS_ACTIVE" || t.status === "FILL_TASK_STATUS_FILLING") &&
      ((t.fillerType === "FILL_ACTOR_TYPE_USER" && t.fillerValue === currentUserId) ||
        (t.fillerType === "FILL_ACTOR_TYPE_DEPT" && currentUserDepts.includes(t.fillerValue))),
  );

  const approved = tasks.filter((t) => t.status === "FILL_TASK_STATUS_APPROVED").length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold">Fill tracking</CardTitle>
        {!isLoading && (
          <span className="text-xs text-muted-foreground">
            {approved}/{tasks.length} approved
          </span>
        )}
      </CardHeader>
      <CardContent className="pt-0 space-y-1">
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-2">Loading…</p>
        ) : (
          <>
            {myBlockerTask && (
              <div className="flex items-start gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 mb-3 text-xs text-orange-800">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" />
                <span>
                  Level {myBlockerTask.routeLevel} fill required —{" "}
                  {myBlockerTask.filledParams}/{myBlockerTask.totalParams} params
                </span>
              </div>
            )}
            <ol className="space-y-3">
              {tasks.map((task) => {
                const isActive = task.status === "FILL_TASK_STATUS_ACTIVE";
                const isFilling = task.status === "FILL_TASK_STATUS_FILLING";
                const isApprovalPending = task.status === "FILL_TASK_STATUS_APPROVAL_PENDING";

                const isUserFiller =
                  task.fillerType === "FILL_ACTOR_TYPE_USER" && task.fillerValue === currentUserId;
                const isDeptFiller =
                  task.fillerType === "FILL_ACTOR_TYPE_DEPT" &&
                  currentUserDepts.includes(task.fillerValue);
                const isUserApprover =
                  task.approverType === "FILL_ACTOR_TYPE_USER" &&
                  task.approverValue === currentUserId;
                const isDeptApprover =
                  task.approverType === "FILL_ACTOR_TYPE_DEPT" &&
                  currentUserDepts.includes(task.approverValue);

                const canClaim = isActive && (isSuperAdmin || isUserFiller || isDeptFiller);
                const canSubmit = isFilling && (isSuperAdmin || task.claimedBy === currentUserId);
                const canApproveReject =
                  isApprovalPending && (isSuperAdmin || isUserApprover || isDeptApprover);

                const hasActions = canClaim || canSubmit || canApproveReject;
                const productsAtLevel = getProductsAtLevel(graph, task.routeLevel);

                return (
                  <li
                    key={task.taskId}
                    className="relative rounded-md border bg-muted/20 px-3 py-2.5 space-y-2"
                    data-testid={`fill-task-level-${task.routeLevel}`}
                  >
                    {/* Level + status */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold">Level {task.routeLevel}</span>
                      <FillTaskStatusBadge status={task.status} />
                    </div>

                    {/* Products at this level */}
                    {productsAtLevel.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {productsAtLevel.map((s) => (
                          <div key={s.productSysId} className="flex flex-col min-w-0">
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px] font-normal"
                            >
                              {s.productCode || `#${s.productSysId}`}
                            </Badge>
                            {s.productName && (
                              <span className="text-[10px] text-muted-foreground truncate max-w-[140px] mt-0.5 px-0.5">
                                {s.productName}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Filler / approver identity */}
                    <div className="text-xs text-muted-foreground">
                      <FillTaskIdentity task={task} />
                      <span className="ml-2 opacity-60">{task.slaFillHours}h SLA</span>
                    </div>

                    {/* Progress bar */}
                    <FillTaskProgressBar task={task} />

                    {/* Actions */}
                    {hasActions && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {canClaim && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => claim.mutate(task.taskId)}
                          >
                            Claim
                          </Button>
                        )}
                        {canSubmit && (
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setDrawerTaskId(task.taskId)}
                          >
                            Fill Parameters →
                          </Button>
                        )}
                        {canApproveReject && (
                          <>
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => setApprovalDrawerTaskId(task.taskId)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs"
                              onClick={() => reject.mutate({ taskId: task.taskId, reason: "Rejected" })}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </CardContent>
      <FillParamDrawer
        requestId={requestId}
        taskId={drawerTaskId}
        open={drawerTaskId !== null}
        onOpenChange={(o) => { if (!o) setDrawerTaskId(null) }}
      />
      <FillApprovalReviewDrawer
        requestId={requestId}
        taskId={approvalDrawerTaskId}
        open={approvalDrawerTaskId !== null}
        onOpenChange={(o) => { if (!o) setApprovalDrawerTaskId(null) }}
      />
    </Card>
  );
}
