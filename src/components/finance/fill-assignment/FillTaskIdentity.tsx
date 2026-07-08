"use client";

import { UserName } from "@/components/common/user-name";
import { DeptName } from "@/components/common/dept-name";
import { type FillTask, findApproval } from "@/types/finance/fill-assignment";

interface Props {
  task: FillTask;
  className?: string;
}

function renderActor(actorType: string, actorValue: string) {
  if (actorType === "FILL_ACTOR_TYPE_USER") return <UserName userId={actorValue} />;
  if (actorType === "FILL_ACTOR_TYPE_DEPT") return <DeptName deptCode={actorValue} />;
  return <>{actorValue || "—"}</>;
}

/**
 * Renders "who's responsible" for a fill task — shared by FillTaskRow and
 * FillTrackingCompact so the identity logic lives in exactly one place.
 *
 * - ACTIVE / FILLING: the assigned filler ("Assigned to: X"), shown even
 *   before anyone has claimed the task.
 * - APPROVAL_PENDING: the assigned approver ("Assigned to: X") — this is
 *   who's actually blocking progress once filling is done.
 * - APPROVED: the historical "Approved by X" line, from the most recent
 *   APPROVED entry in the task's already-fetched approval history.
 * - Any other status (INACTIVE / FILLED / REJECTED): falls back to the
 *   filler, matching prior behavior.
 */
export function FillTaskIdentity({ task, className }: Props) {
  if (task.status === "FILL_TASK_STATUS_APPROVED") {
    const approval = findApproval(task, "APPROVED");
    if (approval?.decidedBy) {
      return (
        <span className={className}>
          <span className="opacity-60">Approved by </span>
          <UserName userId={approval.decidedBy} />
        </span>
      );
    }
  }

  if (task.status === "FILL_TASK_STATUS_APPROVAL_PENDING") {
    return (
      <span className={className}>
        <span className="opacity-60">Assigned to </span>
        {renderActor(task.approverType, task.approverValue)}
      </span>
    );
  }

  if (
    task.status === "FILL_TASK_STATUS_ACTIVE" ||
    task.status === "FILL_TASK_STATUS_FILLING"
  ) {
    return (
      <span className={className}>
        <span className="opacity-60">Assigned to </span>
        {renderActor(task.fillerType, task.fillerValue)}
      </span>
    );
  }

  return <span className={className}>{renderActor(task.fillerType, task.fillerValue)}</span>;
}
