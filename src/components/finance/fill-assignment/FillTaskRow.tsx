"use client";

import { useState } from "react";

import { type FillTask } from "@/types/finance/fill-assignment";
import { useRouteGraph } from "@/hooks/finance/use-cost-route";
import { getProductsAtLevel } from "@/types/finance/cost-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { FillTaskStatusBadge } from "./FillTaskStatusBadge";
import { FillTaskProgressBar } from "./FillTaskProgressBar";
import { FillTaskIdentity } from "./FillTaskIdentity";
import { FillApprovalReviewDrawer } from "./FillApprovalReviewDrawer";
import { FillParamDrawer } from "./FillParamDrawer";

interface FillTaskRowProps {
  task: FillTask;
  currentUserId: string;
  /** Whether the current user is a super-admin (bypasses all assignment checks). */
  isSuperAdmin?: boolean;
  /**
   * Department codes the current user belongs to (e.g. ["COSTING", "ENGINEERING"]).
   * Used to determine eligibility for DEPT-type tasks.
   */
  currentUserDepts?: string[];
  onClaim?: (taskId: number) => void;
  onReject?: (taskId: number) => void;
}

export function FillTaskRow({
  task,
  currentUserId,
  isSuperAdmin = false,
  currentUserDepts = [],
  onClaim,
  onReject,
}: FillTaskRowProps) {
  const [fillDrawerOpen, setFillDrawerOpen] = useState(false);
  const isActive = task.status === "FILL_TASK_STATUS_ACTIVE";
  const isFilling = task.status === "FILL_TASK_STATUS_FILLING";
  const isApprovalPending = task.status === "FILL_TASK_STATUS_APPROVAL_PENDING";
  const [approvalDrawerOpen, setApprovalDrawerOpen] = useState(false);

  const { data: graph } = useRouteGraph(task.routeHeadId || undefined);
  const productsAtLevel = getProductsAtLevel(graph, task.routeLevel);

  const isUserFiller =
    task.fillerType === "FILL_ACTOR_TYPE_USER" &&
    task.fillerValue === currentUserId;
  const isDeptFiller =
    task.fillerType === "FILL_ACTOR_TYPE_DEPT" &&
    currentUserDepts.includes(task.fillerValue);

  const isUserApprover =
    task.approverType === "FILL_ACTOR_TYPE_USER" &&
    task.approverValue === currentUserId;
  const isDeptApprover =
    task.approverType === "FILL_ACTOR_TYPE_DEPT" &&
    currentUserDepts.includes(task.approverValue);

  const canClaim =
    isActive &&
    (isSuperAdmin || isUserFiller || isDeptFiller);

  const canSubmit =
    isFilling &&
    (isSuperAdmin || task.claimedBy === currentUserId);

  const canApproveReject =
    isApprovalPending &&
    (isSuperAdmin || isUserApprover || isDeptApprover);

  return (
    <TableRow data-testid={`fill-task-level-${task.routeLevel}`}>
      <TableCell className="font-medium">
        <div className="space-y-1">
          <div>Level {task.routeLevel}</div>
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
        </div>
      </TableCell>
      <TableCell>
        <FillTaskStatusBadge status={task.status} />
      </TableCell>
      <TableCell className="text-muted-foreground">
        <FillTaskIdentity task={task} />
      </TableCell>
      <TableCell className="min-w-[160px]">
        <FillTaskProgressBar task={task} />
      </TableCell>
      <TableCell className="text-muted-foreground">
        {task.slaFillHours}h SLA
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          {canClaim && onClaim && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onClaim(task.taskId)}
            >
              Claim
            </Button>
          )}
          {canSubmit && (
            <Button size="sm" onClick={() => setFillDrawerOpen(true)}>
              Fill Parameters
            </Button>
          )}
          {canApproveReject && (
            <>
              <Button size="sm" onClick={() => setApprovalDrawerOpen(true)}>
                Approve
              </Button>
              {onReject && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onReject(task.taskId)}
                >
                  Reject
                </Button>
              )}
            </>
          )}
        </div>
      </TableCell>
      {canApproveReject && (
        <FillApprovalReviewDrawer
          requestId={task.requestId}
          taskId={task.taskId}
          open={approvalDrawerOpen}
          onOpenChange={setApprovalDrawerOpen}
        />
      )}
      {canSubmit && (
        <FillParamDrawer
          requestId={task.requestId}
          taskId={task.taskId}
          open={fillDrawerOpen}
          onOpenChange={setFillDrawerOpen}
        />
      )}
    </TableRow>
  );
}
