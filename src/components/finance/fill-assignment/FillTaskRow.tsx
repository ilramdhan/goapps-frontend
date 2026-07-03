"use client";

import { useState } from "react";
import Link from "next/link";

import { type FillTask } from "@/types/finance/fill-assignment";
import { useRouteGraph } from "@/hooks/finance/use-cost-route";
import { getProductsAtLevel } from "@/types/finance/cost-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FillTaskStatusBadge } from "./FillTaskStatusBadge";
import { FillTaskProgressBar } from "./FillTaskProgressBar";
import { FillTaskIdentity } from "./FillTaskIdentity";
import { FillApprovalReviewDrawer } from "./FillApprovalReviewDrawer";

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
    <tr className="border-b" data-testid={`fill-task-level-${task.routeLevel}`}>
      <td className="py-3 px-4 text-sm font-medium">
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
      </td>
      <td className="py-3 px-4">
        <FillTaskStatusBadge status={task.status} />
      </td>
      <td className="py-3 px-4 text-sm text-muted-foreground">
        <FillTaskIdentity task={task} />
      </td>
      <td className="py-3 px-4 min-w-[160px]">
        <FillTaskProgressBar task={task} />
      </td>
      <td className="py-3 px-4 text-sm text-muted-foreground">
        {task.slaFillHours}h SLA
      </td>
      <td className="py-3 px-4">
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
            <Button size="sm" asChild>
              <Link href={`/finance/product-requests/${task.requestId}/fill/${task.taskId}`}>
                Fill Parameters
              </Link>
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
      </td>
      {canApproveReject && (
        <FillApprovalReviewDrawer
          requestId={task.requestId}
          taskId={task.taskId}
          open={approvalDrawerOpen}
          onOpenChange={setApprovalDrawerOpen}
        />
      )}
    </tr>
  );
}
