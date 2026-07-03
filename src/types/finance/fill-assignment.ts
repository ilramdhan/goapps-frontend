// Normalized types for the fill-assignment feature.
// Generated proto source: finance/v1/cost_fill_assignment.proto

export type FillTaskStatus =
  | "FILL_TASK_STATUS_INACTIVE"
  | "FILL_TASK_STATUS_ACTIVE"
  | "FILL_TASK_STATUS_FILLING"
  | "FILL_TASK_STATUS_FILLED"
  | "FILL_TASK_STATUS_APPROVAL_PENDING"
  | "FILL_TASK_STATUS_APPROVED"
  | "FILL_TASK_STATUS_REJECTED"

export type FillActorType = "FILL_ACTOR_TYPE_USER" | "FILL_ACTOR_TYPE_DEPT"

export type LevelAssignmentTier = "GLOBAL" | "PRODUCT" | "REQUEST"

export interface FillApproval {
  approvalId: number
  taskId: number
  decision: string
  decidedBy: string
  decidedAt: string
  note: string
  trigger: string
}

export interface FillTask {
  taskId: number
  requestId: number
  routeHeadId: number
  routeLevel: number
  fillerType: string
  fillerValue: string
  approverType: string
  approverValue: string
  status: FillTaskStatus | string
  claimedBy: string
  reapproveOnChange: boolean
  slaFillHours: number
  slaApproveHours: number
  totalParams: number
  filledParams: number
  activatedAt: string
  approvals: FillApproval[]
}

export interface LevelAssignmentConfig {
  configId: number
  tier: LevelAssignmentTier | string
  routeLevel: number
  productSysId: number
  requestId: number
  fillerType: string
  fillerValue: string
  approverType: string
  approverValue: string
  reapproveOnChange: boolean
  slaFillHours: number
  slaApproveHours: number
}

// --- internal helpers for raw → proto-style enum normalization ---

/** Backend stores short strings ("USER", "DEPT"); frontend types use proto-style ("FILL_ACTOR_TYPE_USER"). */
function normalizeActorType(raw: unknown): string {
  const v = String(raw ?? "")
  if (v === "USER") return "FILL_ACTOR_TYPE_USER"
  if (v === "DEPT") return "FILL_ACTOR_TYPE_DEPT"
  return v // already prefixed or empty
}

/** Backend stores short status strings ("ACTIVE", "FILLING"); frontend types use proto-style. */
function normalizeTaskStatus(raw: unknown): string {
  const v = String(raw ?? "")
  if (!v.startsWith("FILL_TASK_STATUS_") && v !== "") return `FILL_TASK_STATUS_${v}`
  return v
}

// --- normalizers ---

function normalizeApproval(raw: Record<string, unknown>): FillApproval {
  return {
    approvalId: Number(raw.approvalId ?? raw.approval_id ?? 0),
    taskId: Number(raw.taskId ?? raw.task_id ?? 0),
    decision: String(raw.decision ?? ""),
    decidedBy: String(raw.decidedBy ?? raw.decided_by ?? ""),
    decidedAt: String(raw.decidedAt ?? raw.decided_at ?? ""),
    note: String(raw.note ?? ""),
    trigger: String(raw.trigger ?? ""),
  }
}

export function normalizeFillTask(raw: Record<string, unknown>): FillTask {
  const approvals = Array.isArray(raw.approvals)
    ? (raw.approvals as Record<string, unknown>[]).map(normalizeApproval)
    : []
  return {
    taskId: Number(raw.taskId ?? raw.task_id ?? 0),
    requestId: Number(raw.requestId ?? raw.request_id ?? 0),
    routeHeadId: Number(raw.routeHeadId ?? raw.route_head_id ?? 0),
    routeLevel: Number(raw.routeLevel ?? raw.route_level ?? 0),
    fillerType: normalizeActorType(raw.fillerType ?? raw.filler_type),
    fillerValue: String(raw.fillerValue ?? raw.filler_value ?? ""),
    approverType: normalizeActorType(raw.approverType ?? raw.approver_type),
    approverValue: String(raw.approverValue ?? raw.approver_value ?? ""),
    status: normalizeTaskStatus(raw.status) as FillTaskStatus,
    claimedBy: String(raw.claimedBy ?? raw.claimed_by ?? ""),
    reapproveOnChange: Boolean(raw.reapproveOnChange ?? raw.reapprove_on_change ?? false),
    slaFillHours: Number(raw.slaFillHours ?? raw.sla_fill_hours ?? 0),
    slaApproveHours: Number(raw.slaApproveHours ?? raw.sla_approve_hours ?? 0),
    totalParams: Number(raw.totalParams ?? raw.total_params ?? 0),
    filledParams: Number(raw.filledParams ?? raw.filled_params ?? 0),
    activatedAt: String(raw.activatedAt ?? raw.activated_at ?? ""),
    approvals,
  }
}

export function normalizeLevelConfig(raw: Record<string, unknown>): LevelAssignmentConfig {
  return {
    configId: Number(raw.configId ?? raw.config_id ?? 0),
    tier: String(raw.tier ?? "GLOBAL") as LevelAssignmentTier,
    routeLevel: Number(raw.routeLevel ?? raw.route_level ?? 0),
    productSysId: Number(raw.productSysId ?? raw.product_sys_id ?? 0),
    requestId: Number(raw.requestId ?? raw.request_id ?? 0),
    fillerType: String(raw.fillerType ?? raw.filler_type ?? ""),
    fillerValue: String(raw.fillerValue ?? raw.filler_value ?? ""),
    approverType: String(raw.approverType ?? raw.approver_type ?? ""),
    approverValue: String(raw.approverValue ?? raw.approver_value ?? ""),
    reapproveOnChange: Boolean(raw.reapproveOnChange ?? raw.reapprove_on_change ?? false),
    slaFillHours: Number(raw.slaFillHours ?? raw.sla_fill_hours ?? 0),
    slaApproveHours: Number(raw.slaApproveHours ?? raw.sla_approve_hours ?? 0),
  }
}

// --- helpers ---

const FILL_TASK_STATUS_LABELS: Record<string, string> = {
  FILL_TASK_STATUS_INACTIVE: "Inactive",
  FILL_TASK_STATUS_ACTIVE: "Active",
  FILL_TASK_STATUS_FILLING: "Filling",
  FILL_TASK_STATUS_FILLED: "Filled",
  FILL_TASK_STATUS_APPROVAL_PENDING: "Approval Pending",
  FILL_TASK_STATUS_APPROVED: "Approved",
  FILL_TASK_STATUS_REJECTED: "Rejected",
}

/** Returns a human-readable label for a fill task status string. */
export function fillTaskStatusLabel(status: string): string {
  return FILL_TASK_STATUS_LABELS[status] ?? status
}

/** Returns the fill-progress percentage (0-100) for a task. */
export function fillTaskProgress(task: FillTask): number {
  if (task.totalParams === 0) return 0
  return Math.round((task.filledParams / task.totalParams) * 100)
}

/**
 * Returns the most recent approval-history entry matching `decision`
 * (e.g. "APPROVED"), or undefined if none exists. `task.approvals` is
 * always ordered newest-first by the backend (ListApprovals), so the first
 * match is the latest one.
 */
export function findApproval(task: FillTask, decision: string): FillApproval | undefined {
  return task.approvals.find((a) => a.decision === decision)
}
