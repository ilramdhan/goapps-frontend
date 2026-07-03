"use client";

import { type FillTask } from "@/types/finance/fill-assignment";
import { FillTaskRow } from "./FillTaskRow";

interface FillTrackingTableProps {
  tasks: FillTask[];
  currentUserId: string;
  /** Whether the current user is a super-admin (bypasses assignment checks). */
  isSuperAdmin?: boolean;
  /**
   * Department codes the current user belongs to.
   * Used for DEPT-type task eligibility checks.
   */
  currentUserDepts?: string[];
  onClaim?: (taskId: number) => void;
  onReject?: (taskId: number) => void;
}

export function FillTrackingTable({
  tasks,
  currentUserId,
  isSuperAdmin = false,
  currentUserDepts = [],
  onClaim,
  onReject,
}: FillTrackingTableProps) {
  if (tasks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No fill tasks for this request.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="py-3 px-4 text-left font-medium">Level</th>
            <th className="py-3 px-4 text-left font-medium">Status</th>
            <th className="py-3 px-4 text-left font-medium">Filler</th>
            <th className="py-3 px-4 text-left font-medium">Progress</th>
            <th className="py-3 px-4 text-left font-medium">SLA</th>
            <th className="py-3 px-4 text-left font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <FillTaskRow
              key={task.taskId}
              task={task}
              currentUserId={currentUserId}
              isSuperAdmin={isSuperAdmin}
              currentUserDepts={currentUserDepts}
              onClaim={onClaim}
              onReject={onReject}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
