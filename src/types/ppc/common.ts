// PPC common types — enums, labels, and shared helpers.
// Re-exports proto-generated enums and adds UI label maps + select options.

export {
  AreaCode,
  DemandType,
  DemandSubType,
  DemandSource,
  DemandStatus,
  CarryAction,
  GradeReq,
  PlanItemType,
  PlanItemStatus,
  WOStatus,
  WORefType,
  ProdCategory,
  ShiftLogNoteType,
  QtyAxisSource,
  RMSource,
  QtySource,
  ParamResolutionSource,
  ThresholdLevel,
  ThresholdUnit,
  ActiveFilter,
} from "@/types/generated/ppc/v1/common"

export type {
  BaseResponse,
  PaginationResponse,
  ValidationError,
  AuditInfo,
} from "@/types/generated/common/v1/common"

export {
  BaseResponse as BaseResponseParser,
  PaginationResponse as PaginationResponseParser,
  AuditInfo as AuditInfoParser,
} from "@/types/generated/common/v1/common"

import {
  AreaCode,
  DemandType,
  DemandStatus,
  DemandSubType,
  DemandSource,
  CarryAction,
  GradeReq,
  PlanItemType,
  PlanItemStatus,
  WOStatus,
  WORefType,
  ProdCategory,
  ShiftLogNoteType,
  ThresholdLevel,
  ThresholdUnit,
  ActiveFilter,
} from "@/types/generated/ppc/v1/common"

// ============================================================================
// Label maps (enum → human string)
// ============================================================================

export const AREA_LABELS: Record<number, string> = {
  [AreaCode.AREA_CODE_UNSPECIFIED]: "All Areas",
  [AreaCode.AREA_CODE_TXT]: "TXT",
  [AreaCode.AREA_CODE_SPG]: "SPG",
  [AreaCode.AREA_CODE_TWT]: "TWT",
}

export const DEMAND_TYPE_LABELS: Record<number, string> = {
  [DemandType.DEMAND_TYPE_UNSPECIFIED]: "All Types",
  [DemandType.DEMAND_TYPE_CONTRACT]: "Contract",
  [DemandType.DEMAND_TYPE_MTS]: "MTS",
  [DemandType.DEMAND_TYPE_SAMPLE]: "Sample",
}

export const DEMAND_SUB_TYPE_LABELS: Record<number, string> = {
  [DemandSubType.DEMAND_SUB_TYPE_UNSPECIFIED]: "—",
  [DemandSubType.DEMAND_SUB_TYPE_CF_EXPORT]: "CF Export",
  [DemandSubType.DEMAND_SUB_TYPE_NEW_EXPORT]: "New Export",
  [DemandSubType.DEMAND_SUB_TYPE_LOCAL]: "Local",
  [DemandSubType.DEMAND_SUB_TYPE_INTERNAL]: "Internal",
}

export const DEMAND_SOURCE_LABELS: Record<number, string> = {
  [DemandSource.DEMAND_SOURCE_UNSPECIFIED]: "—",
  [DemandSource.DEMAND_SOURCE_ORION_PULL]: "Orion Pull",
  [DemandSource.DEMAND_SOURCE_MANUAL]: "Manual",
  [DemandSource.DEMAND_SOURCE_MTS_APPROVED]: "MTS Approved",
  [DemandSource.DEMAND_SOURCE_CARRY_FORWARD]: "Carry Forward",
}

export const DEMAND_STATUS_LABELS: Record<number, string> = {
  [DemandStatus.DEMAND_STATUS_UNSPECIFIED]: "All Status",
  [DemandStatus.DEMAND_STATUS_PENDING_PRODUCT_LINK]: "Pending Product Link",
  [DemandStatus.DEMAND_STATUS_PENDING_CONFIRMATION]: "Pending Confirmation",
  [DemandStatus.DEMAND_STATUS_CONFIRMED]: "Confirmed",
  [DemandStatus.DEMAND_STATUS_IN_PRODUCTION]: "In Production",
  [DemandStatus.DEMAND_STATUS_PARTIAL]: "Partial",
  [DemandStatus.DEMAND_STATUS_FULFILLED]: "Fulfilled",
  [DemandStatus.DEMAND_STATUS_CANCELLED]: "Cancelled",
  [DemandStatus.DEMAND_STATUS_CARRIED_OVER]: "Carried Over",
  [DemandStatus.DEMAND_STATUS_DEFERRED]: "Deferred",
  [DemandStatus.DEMAND_STATUS_SPLIT]: "Split",
}

// Why a demand is still unlinked. AUTO_MATCH_FAILED and AMBIGUOUS come from an
// Orion pull; NO_MASTER_YET is an MTS/SAMPLE raised before its finance master
// exists — deliberately unresolved, not a failure.
export const PRODUCT_LINK_REASON_LABELS: Record<string, string> = {
  AUTO_MATCH_FAILED: "No matching product was found automatically",
  AMBIGUOUS: "Several products matched — pick the right one",
  NO_MASTER_YET: "Raised before the product master existed",
}

export const productLinkReasonLabel = (reason: string): string =>
  PRODUCT_LINK_REASON_LABELS[reason] ?? "Product not linked yet"

export const CARRY_ACTION_LABELS: Record<number, string> = {
  [CarryAction.CARRY_ACTION_UNSPECIFIED]: "—",
  [CarryAction.CARRY_ACTION_CARRY_AS_IS]: "Carry As Is",
  [CarryAction.CARRY_ACTION_SPLIT]: "Split",
  [CarryAction.CARRY_ACTION_DEFER]: "Defer",
  [CarryAction.CARRY_ACTION_PARTIAL_CARRY]: "Partial Carry",
  [CarryAction.CARRY_ACTION_CANCEL]: "Cancel",
}

export const GRADE_REQ_LABELS: Record<number, string> = {
  [GradeReq.GRADE_REQ_UNSPECIFIED]: "—",
  [GradeReq.GRADE_REQ_AX_ONLY]: "AX Only",
  [GradeReq.GRADE_REQ_AX_AM_CLAUSE]: "AX + AM Clause",
  [GradeReq.GRADE_REQ_NONE]: "No Requirement",
}

export const PLAN_ITEM_TYPE_LABELS: Record<number, string> = {
  [PlanItemType.PLAN_ITEM_TYPE_UNSPECIFIED]: "All Types",
  [PlanItemType.PLAN_ITEM_TYPE_FG_DELIVERY]: "FG Delivery",
  [PlanItemType.PLAN_ITEM_TYPE_INTERMEDIATE]: "Intermediate",
  [PlanItemType.PLAN_ITEM_TYPE_MTS]: "MTS",
}

export const PLAN_ITEM_STATUS_LABELS: Record<number, string> = {
  [PlanItemStatus.PLAN_ITEM_STATUS_UNSPECIFIED]: "All Status",
  [PlanItemStatus.PLAN_ITEM_STATUS_DRAFT]: "Draft",
  [PlanItemStatus.PLAN_ITEM_STATUS_ACTIVE]: "Active",
  [PlanItemStatus.PLAN_ITEM_STATUS_IN_PRODUCTION]: "In Production",
  [PlanItemStatus.PLAN_ITEM_STATUS_COMPLETED]: "Completed",
  [PlanItemStatus.PLAN_ITEM_STATUS_CANCELLED]: "Cancelled",
}

export const WO_STATUS_LABELS: Record<number, string> = {
  [WOStatus.WO_STATUS_UNSPECIFIED]: "All Status",
  [WOStatus.WO_STATUS_DRAFT]: "Draft",
  [WOStatus.WO_STATUS_SUBMITTED]: "Submitted",
  [WOStatus.WO_STATUS_PC_APPROVED]: "PC Approved",
  [WOStatus.WO_STATUS_APPROVED]: "Approved",
  [WOStatus.WO_STATUS_SCHEDULED]: "Scheduled",
  [WOStatus.WO_STATUS_CHANGEOVER]: "Changeover",
  [WOStatus.WO_STATUS_RUNNING]: "Running",
  [WOStatus.WO_STATUS_COMPLETED]: "Completed",
  [WOStatus.WO_STATUS_CLOSED]: "Closed",
  [WOStatus.WO_STATUS_REJECTED]: "Rejected",
  [WOStatus.WO_STATUS_CANCELLED]: "Cancelled",
}

export const WO_REF_TYPE_LABELS: Record<number, string> = {
  [WORefType.WO_REF_TYPE_UNSPECIFIED]: "—",
  [WORefType.WO_REF_TYPE_TEMPLATE]: "Template (Duplicate)",
  [WORefType.WO_REF_TYPE_CONTINUATION]: "Continuation",
}

export const PROD_CATEGORY_LABELS: Record<number, string> = {
  [ProdCategory.PROD_CATEGORY_UNSPECIFIED]: "Normal",
  [ProdCategory.PROD_CATEGORY_NORMAL]: "Normal",
  [ProdCategory.PROD_CATEGORY_B_TO_B]: "Back-to-Back",
  [ProdCategory.PROD_CATEGORY_APQ]: "APQ",
  [ProdCategory.PROD_CATEGORY_TRIAL]: "Trial",
  [ProdCategory.PROD_CATEGORY_SMALL_LOT]: "Small Lot",
}

export const SHIFT_LOG_NOTE_TYPE_LABELS: Record<number, string> = {
  [ShiftLogNoteType.SHIFT_LOG_NOTE_TYPE_UNSPECIFIED]: "All",
  [ShiftLogNoteType.SHIFT_LOG_NOTE_TYPE_INSTRUKSI]: "Instruksi",
  [ShiftLogNoteType.SHIFT_LOG_NOTE_TYPE_ACTIVITY]: "Activity",
}

export const THRESHOLD_LEVEL_LABELS: Record<number, string> = {
  [ThresholdLevel.THRESHOLD_LEVEL_UNSPECIFIED]: "All Levels",
  [ThresholdLevel.THRESHOLD_LEVEL_SYSTEM]: "System",
  [ThresholdLevel.THRESHOLD_LEVEL_MACHINE_GROUP]: "Machine Group",
  [ThresholdLevel.THRESHOLD_LEVEL_PRODUCT_TYPE]: "Product Type",
  [ThresholdLevel.THRESHOLD_LEVEL_PRODUCT]: "Product",
  [ThresholdLevel.THRESHOLD_LEVEL_WO]: "Work Order",
}

export const THRESHOLD_UNIT_LABELS: Record<number, string> = {
  [ThresholdUnit.THRESHOLD_UNIT_UNSPECIFIED]: "—",
  [ThresholdUnit.THRESHOLD_UNIT_PCT]: "Percent",
  [ThresholdUnit.THRESHOLD_UNIT_DOFF]: "Doff (kg)",
}

// ============================================================================
// Select option builders
// ============================================================================

function toOptions(labels: Record<number, string>): { value: number; label: string }[] {
  return Object.entries(labels).map(([value, label]) => ({ value: Number(value), label }))
}

export const AREA_OPTIONS = toOptions(AREA_LABELS)
export const DEMAND_TYPE_OPTIONS = toOptions(DEMAND_TYPE_LABELS)
export const DEMAND_SUB_TYPE_OPTIONS = toOptions(DEMAND_SUB_TYPE_LABELS)
export const DEMAND_STATUS_OPTIONS = toOptions(DEMAND_STATUS_LABELS)
export const GRADE_REQ_OPTIONS = toOptions(GRADE_REQ_LABELS)
export const PLAN_ITEM_TYPE_OPTIONS = toOptions(PLAN_ITEM_TYPE_LABELS)
export const PLAN_ITEM_STATUS_OPTIONS = toOptions(PLAN_ITEM_STATUS_LABELS)
export const WO_STATUS_OPTIONS = toOptions(WO_STATUS_LABELS)
export const PROD_CATEGORY_OPTIONS = toOptions(PROD_CATEGORY_LABELS)
export const THRESHOLD_LEVEL_OPTIONS = toOptions(THRESHOLD_LEVEL_LABELS)
export const THRESHOLD_UNIT_OPTIONS = toOptions(THRESHOLD_UNIT_LABELS).filter(
  (o) => o.value !== ThresholdUnit.THRESHOLD_UNIT_UNSPECIFIED
)

export const ACTIVE_FILTER_OPTIONS = [
  { value: ActiveFilter.ACTIVE_FILTER_UNSPECIFIED, label: "All Status" },
  { value: ActiveFilter.ACTIVE_FILTER_ACTIVE, label: "Active" },
  { value: ActiveFilter.ACTIVE_FILTER_INACTIVE, label: "Inactive" },
]

/** Shift options (TXT/SPG/TWT all run 3 shifts). */
export const SHIFT_OPTIONS = [
  { value: "1", label: "Shift 1" },
  { value: "2", label: "Shift 2" },
  { value: "3", label: "Shift 3" },
]

/**
 * Humanize an ALL_CAPS enum string to Title Case, e.g. "UNDER_REVIEW" → "Under Review".
 * Use for string-typed enums that arrive as raw codes (category, rmType, flag).
 */
export function humanizeEnumValue(value: string): string {
  if (!value) return ""
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Current month as "YYYY-MM" (used as default filter for month-scoped pages). */
export function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

/** Today as ISO date "YYYY-MM-DD". */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Month "YYYY-MM" projected from an ISO date. The server derives the stored
 * month the same way, so forms show this read-only instead of asking for it.
 */
export function monthOfDate(isoDate: string): string {
  return isoDate ? isoDate.slice(0, 7) : ""
}

/** Inclusive day span between two ISO dates, or 0 when either is missing. */
export function inclusiveDays(startIso: string, endIso: string): number {
  if (!startIso || !endIso) return 0
  const start = Date.parse(`${startIso.slice(0, 10)}T00:00:00Z`)
  const end = Date.parse(`${endIso.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(start) || Number.isNaN(end) || start > end) return 0
  return Math.round((end - start) / 86_400_000) + 1
}

/**
 * ISO start date that ends on `endIso` after `days` inclusive days, or "" when
 * the inputs are incomplete.
 */
export function startDateForDuration(endIso: string, days: number): string {
  if (!endIso || !Number.isFinite(days) || days < 1) return ""
  const end = Date.parse(`${endIso.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(end)) return ""
  return new Date(end - (days - 1) * 86_400_000).toISOString().slice(0, 10)
}

// ============================================================================
// StatusBadge tokens — map numeric enum → short token used by status-colors
// registry (ppcDemand / ppcPlan / ppcWo). Keeps StatusBadge string-based.
// ============================================================================

const DEMAND_STATUS_TOKENS: Record<number, string> = {
  [DemandStatus.DEMAND_STATUS_PENDING_PRODUCT_LINK]: "PENDING_PRODUCT_LINK",
  [DemandStatus.DEMAND_STATUS_PENDING_CONFIRMATION]: "PENDING_CONFIRMATION",
  [DemandStatus.DEMAND_STATUS_CONFIRMED]: "CONFIRMED",
  [DemandStatus.DEMAND_STATUS_IN_PRODUCTION]: "IN_PRODUCTION",
  [DemandStatus.DEMAND_STATUS_PARTIAL]: "PARTIAL",
  [DemandStatus.DEMAND_STATUS_FULFILLED]: "FULFILLED",
  [DemandStatus.DEMAND_STATUS_CANCELLED]: "CANCELLED",
  [DemandStatus.DEMAND_STATUS_CARRIED_OVER]: "CARRIED_OVER",
  [DemandStatus.DEMAND_STATUS_DEFERRED]: "DEFERRED",
  [DemandStatus.DEMAND_STATUS_SPLIT]: "SPLIT",
}

const PLAN_ITEM_STATUS_TOKENS: Record<number, string> = {
  [PlanItemStatus.PLAN_ITEM_STATUS_DRAFT]: "DRAFT",
  [PlanItemStatus.PLAN_ITEM_STATUS_ACTIVE]: "ACTIVE",
  [PlanItemStatus.PLAN_ITEM_STATUS_IN_PRODUCTION]: "IN_PRODUCTION",
  [PlanItemStatus.PLAN_ITEM_STATUS_COMPLETED]: "COMPLETED",
  [PlanItemStatus.PLAN_ITEM_STATUS_CANCELLED]: "CANCELLED",
}

const WO_STATUS_TOKENS: Record<number, string> = {
  [WOStatus.WO_STATUS_DRAFT]: "DRAFT",
  [WOStatus.WO_STATUS_SUBMITTED]: "SUBMITTED",
  [WOStatus.WO_STATUS_PC_APPROVED]: "PC_APPROVED",
  [WOStatus.WO_STATUS_APPROVED]: "APPROVED",
  [WOStatus.WO_STATUS_SCHEDULED]: "SCHEDULED",
  [WOStatus.WO_STATUS_CHANGEOVER]: "CHANGEOVER",
  [WOStatus.WO_STATUS_RUNNING]: "RUNNING",
  [WOStatus.WO_STATUS_COMPLETED]: "COMPLETED",
  [WOStatus.WO_STATUS_CLOSED]: "CLOSED",
  [WOStatus.WO_STATUS_REJECTED]: "REJECTED",
  [WOStatus.WO_STATUS_CANCELLED]: "CANCELLED",
}

export const demandStatusToken = (s: DemandStatus): string => DEMAND_STATUS_TOKENS[s] ?? ""
export const planItemStatusToken = (s: PlanItemStatus): string => PLAN_ITEM_STATUS_TOKENS[s] ?? ""
export const woStatusToken = (s: WOStatus): string => WO_STATUS_TOKENS[s] ?? ""
