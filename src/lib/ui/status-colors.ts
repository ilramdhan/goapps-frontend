// Single source of truth for status → display (badge variant + label).
// Keyed by (type, status) so adding a new status is a one-line change and
// every page renders the same color + label for the same status.

export type StatusType = "request" | "route" | "job" | "chunk" | "cost" | "product" | "mbhead" | "generic";

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
  },
  generic: {},
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
