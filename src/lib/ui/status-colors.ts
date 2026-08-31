// Single source of truth for status → display (badge variant + label).
// Keyed by (type, status) so adding a new status is a one-line change and
// every page renders the same color + label for the same status.

export type StatusType =
  | "request"
  | "route"
  | "job"
  | "chunk"
  | "cost"
  | "product"
  | "mbhead"
  | "ppcDemand"
  | "ppcPlan"
  | "ppcWo"
  | "generic";

// Base shadcn badge variants + two semantic extensions (success, warning) that
// StatusBadge renders via className overrides (shadcn badge has no such
// variants and components/ui must not be modified).
export type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "ghost"
  | "success"
  | "warning";

export interface StatusDisplay {
  variant: BadgeVariant;
  label: string;
}

// Tailwind class overrides for the two semantic variants not in shadcn's badge.
export const semanticBadgeClasses: Partial<Record<BadgeVariant, string>> = {
  success:
    "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  warning:
    "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
};

// Variant passed to the shadcn Badge: success/warning fall back to "outline"
// as the base then get colored by semanticBadgeClasses.
export function baseBadgeVariant(v: BadgeVariant): "default" | "secondary" | "destructive" | "outline" | "ghost" {
  if (v === "success" || v === "warning") return "outline";
  return v;
}

export const statusRegistry: Record<StatusType, Record<string, StatusDisplay>> = {
  request: {
    DRAFT: { variant: "secondary", label: "Draft" },
    SUBMITTED: { variant: "default", label: "Submitted" },
    UNDER_REVIEW: { variant: "warning", label: "Under Review" },
    ROUTING_DEFINED: { variant: "default", label: "Routing Defined" },
    PARAMETER_PENDING: { variant: "warning", label: "Parameter Pending" },
    PARAMETER_COMPLETE: { variant: "default", label: "Parameter Complete" },
    CONFIRMED: { variant: "success", label: "Confirmed" },
    APPROVED: { variant: "success", label: "Approved" },
    RELEASED: { variant: "success", label: "Released" },
    COSTING_DONE: { variant: "success", label: "Costing Done" },
    QUOTED: { variant: "default", label: "Quoted" },
    QUOTE_READY: { variant: "success", label: "Quote Ready" },
    CLOSED: { variant: "outline", label: "Closed" },
    REJECTED: { variant: "destructive", label: "Rejected" },
  },
  route: {
    DRAFT: { variant: "secondary", label: "Draft" },
    COMPLETE: { variant: "success", label: "Complete" },
    LOCKED: { variant: "default", label: "Locked" },
  },
  job: {
    QUEUED: { variant: "secondary", label: "Queued" },
    PLANNING: { variant: "default", label: "Planning" },
    PROCESSING: { variant: "warning", label: "Processing" },
    SUCCESS: { variant: "success", label: "Success" },
    PARTIAL_FAILED: { variant: "warning", label: "Partial Failed" },
    FAILED: { variant: "destructive", label: "Failed" },
    CANCELLED: { variant: "outline", label: "Cancelled" },
  },
  chunk: {
    QUEUED: { variant: "secondary", label: "Queued" },
    DISPATCHED: { variant: "default", label: "Dispatched" },
    PROCESSING: { variant: "warning", label: "Processing" },
    SUCCESS: { variant: "success", label: "Success" },
    PARTIAL_FAILED: { variant: "warning", label: "Partial Failed" },
    FAILED: { variant: "destructive", label: "Failed" },
    PENDING: { variant: "secondary", label: "Pending" },
    READY: { variant: "default", label: "Ready" },
    CALCULATING: { variant: "warning", label: "Calculating" },
    BLOCKED: { variant: "warning", label: "Blocked" },
    SKIPPED: { variant: "outline", label: "Skipped" },
  },
  cost: {
    CALCULATED: { variant: "default", label: "Calculated" },
    VERIFIED: { variant: "success", label: "Verified" },
    APPROVED: { variant: "success", label: "Approved" },
    SUPERSEDED: { variant: "outline", label: "Superseded" },
  },
  product: {
    ACTIVE: { variant: "success", label: "Active" },
    INACTIVE: { variant: "secondary", label: "Inactive" },
  },
  mbhead: {
    DRAFT: { variant: "secondary", label: "Draft" },
    SUBMITTED: { variant: "default", label: "Submitted" },
    APPROVED: { variant: "success", label: "Approved" },
    VALIDATED: { variant: "success", label: "Validated" },
    UN_APPROVED: { variant: "warning", label: "Un-Approved" },
    REVOKED: { variant: "destructive", label: "Revoked" },
    REJECTED: { variant: "destructive", label: "Rejected" },
    // P10: a locked recipe parked awaiting an unlock decision.
    UNLOCK_REQUESTED: { variant: "warning", label: "Unlock Requested" },
  },
  // PPC — keyed by the short status token (see ppcStatusToken in types/ppc).
  ppcDemand: {
    PENDING_PRODUCT_LINK: { variant: "warning", label: "Pending Product Link" },
    PENDING_CONFIRMATION: { variant: "warning", label: "Pending Confirmation" },
    CONFIRMED: { variant: "default", label: "Confirmed" },
    IN_PRODUCTION: { variant: "default", label: "In Production" },
    PARTIAL: { variant: "warning", label: "Partial" },
    FULFILLED: { variant: "success", label: "Fulfilled" },
    CANCELLED: { variant: "outline", label: "Cancelled" },
    CARRIED_OVER: { variant: "outline", label: "Carried Over" },
    DEFERRED: { variant: "secondary", label: "Deferred" },
    SPLIT: { variant: "secondary", label: "Split" },
  },
  ppcPlan: {
    DRAFT: { variant: "secondary", label: "Draft" },
    ACTIVE: { variant: "default", label: "Active" },
    IN_PRODUCTION: { variant: "warning", label: "In Production" },
    COMPLETED: { variant: "success", label: "Completed" },
    CANCELLED: { variant: "outline", label: "Cancelled" },
  },
  ppcWo: {
    DRAFT: { variant: "secondary", label: "Draft" },
    SUBMITTED: { variant: "default", label: "Submitted" },
    PC_APPROVED: { variant: "warning", label: "PC Approved" },
    APPROVED: { variant: "success", label: "Approved" },
    SCHEDULED: { variant: "default", label: "Scheduled" },
    CHANGEOVER: { variant: "warning", label: "Changeover" },
    RUNNING: { variant: "default", label: "Running" },
    COMPLETED: { variant: "success", label: "Completed" },
    CLOSED: { variant: "outline", label: "Closed" },
    REJECTED: { variant: "destructive", label: "Rejected" },
    CANCELLED: { variant: "outline", label: "Cancelled" },
  },
  // ⭐ DITAMBAHKAN 2026-08-31 (P7-T2) — MB Spin's LDR tri-state (mbs_ldr_type),
  // used by StatusBadge in mb-spin-form-dialog.tsx's "Status LDR" badge. Kept
  // under "generic" rather than a new StatusType since this is the only
  // consumer today; promote to a dedicated type if a second one appears.
  generic: {
    NOT_CALCULATED: { variant: "secondary", label: "Belum Dihitung" },
    CALCULATED: { variant: "default", label: "Terhitung Otomatis" },
    ACTUAL: { variant: "success", label: "Terkunci (Aktual)" },
  },
};

// getStatusDisplay normalizes the status (uppercase, trim) and returns the
// registered display, falling back to a neutral pill that shows the raw value.
export function getStatusDisplay(type: StatusType, status: string | null | undefined): StatusDisplay {
  const key = (status ?? "").trim().toUpperCase();
  const found = statusRegistry[type]?.[key];
  if (found) return found;
  return { variant: "secondary", label: status ? prettify(status) : "—" };
}

// prettify turns SNAKE_CASE / lowercase into Title Case for unknown statuses.
function prettify(s: string): string {
  return s
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
