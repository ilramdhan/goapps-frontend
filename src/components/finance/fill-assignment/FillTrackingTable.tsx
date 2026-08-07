"use client";

import { type FillTask } from "@/types/finance/fill-assignment";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Level</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Filler</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>SLA</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
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
        </TableBody>
      </Table>
    </div>
  );
}
