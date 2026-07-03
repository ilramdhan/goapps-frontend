"use client";

import {
  useFillTasks,
  useClaimFillTask,
  useRejectFillTask,
} from "@/hooks/finance/use-fill-assignment";
import { useUser } from "@/providers/auth-provider";
import { FillTrackingTable } from "./FillTrackingTable";
import { FillBlockerAlert } from "./FillBlockerAlert";

interface Props {
  requestId: number;
}

export function FillTrackingTab({ requestId }: Props) {
  const user = useUser();
  const currentUserId = user?.userId ?? "";
  const isSuperAdmin = user?.roles?.includes("SUPER_ADMIN") ?? false;

  // Use departmentCode and sectionCode from AuthUser (populated server-side via company mapping).
  const currentUserDepts: string[] = [
    user?.departmentCode,
    user?.sectionCode,
  ].filter((c): c is string => Boolean(c));

  const { data: tasks = [], isLoading } = useFillTasks(requestId);
  const claim = useClaimFillTask(requestId);
  const reject = useRejectFillTask(requestId);

  const myBlockerTask = tasks.find(
    (t) =>
      (t.status === "FILL_TASK_STATUS_ACTIVE" ||
        t.status === "FILL_TASK_STATUS_FILLING") &&
      ((t.fillerType === "FILL_ACTOR_TYPE_USER" &&
        t.fillerValue === currentUserId) ||
        (t.fillerType === "FILL_ACTOR_TYPE_DEPT" &&
          currentUserDepts.includes(t.fillerValue))),
  );

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground p-4">
        Loading fill tasks...
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {myBlockerTask && <FillBlockerAlert task={myBlockerTask} />}
      <FillTrackingTable
        tasks={tasks}
        currentUserId={currentUserId}
        isSuperAdmin={isSuperAdmin}
        currentUserDepts={currentUserDepts}
        onClaim={(taskId) => claim.mutate(taskId)}
        onReject={(taskId) => reject.mutate({ taskId, reason: "Rejected" })}
      />
    </div>
  );
}
