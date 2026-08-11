// Spin Fixed Cost Types - Re-export from proto-generated types with UI helpers
//
// Domain: ONE row per period (YYYYMM) holding the monthly POY (HOY) spinning
// fixed-cost pool shared by every POY product in the costing calc engine.

// ============================================================================
// Re-export proto-generated types
// ============================================================================

export type {
  SpinFixedCost,
  CreateSpinFixedCostRequest,
  CreateSpinFixedCostResponse,
  GetSpinFixedCostRequest,
  GetSpinFixedCostResponse,
  UpdateSpinFixedCostRequest,
  UpdateSpinFixedCostResponse,
  DeleteSpinFixedCostRequest,
  DeleteSpinFixedCostResponse,
  ListSpinFixedCostsRequest,
  ListSpinFixedCostsResponse,
} from "@/types/generated/finance/v1/spin_fixed_cost"

// Message functions for parsing (named exports as Parsers)
export {
  SpinFixedCost as SpinFixedCostParser,
  CreateSpinFixedCostResponse as CreateSpinFixedCostResponseParser,
  GetSpinFixedCostResponse as GetSpinFixedCostResponseParser,
  UpdateSpinFixedCostResponse as UpdateSpinFixedCostResponseParser,
  DeleteSpinFixedCostResponse as DeleteSpinFixedCostResponseParser,
  ListSpinFixedCostsResponse as ListSpinFixedCostsResponseParser,
} from "@/types/generated/finance/v1/spin_fixed_cost"

// Re-export shared enums/types from UOM (same proto package)
export {
  ActiveFilter,
  activeFilterFromJSON,
  activeFilterToJSON,
} from "@/types/generated/finance/v1/uom"

// Re-export common types from proto
export type {
  BaseResponse,
  PaginationResponse,
} from "@/types/generated/common/v1/common"

// ============================================================================
// Import for local use
// ============================================================================

import { ActiveFilter } from "@/types/generated/finance/v1/uom"

// ============================================================================
// Simplified Params Types for Hooks
// ============================================================================

export interface ListSpinFixedCostsParams {
  page?: number
  pageSize?: number
  search?: string
  activeFilter?: ActiveFilter
  period?: string
  sortBy?: string
  sortOrder?: string
}

// ============================================================================
// Form Types
// ============================================================================

export interface SpinFixedCostFormData {
  period: string
  commonPoyDenier: number
  poyProduction: number
  spinPowerMonth: number
  spinManpowerMonth: number
  spinOverheadsMonth: number
  spinConssprsMonth: number
  isActive: boolean
}

export const DEFAULT_SPIN_FIXED_COST_FORM_VALUES: SpinFixedCostFormData = {
  period: "",
  commonPoyDenier: 0,
  poyProduction: 0,
  spinPowerMonth: 0,
  spinManpowerMonth: 0,
  spinOverheadsMonth: 0,
  spinConssprsMonth: 0,
  isActive: true,
}

// ============================================================================
// Period helpers (YYYYMM <-> friendly display)
// ============================================================================

/** Matches a raw period value, e.g. "202604" */
export const PERIOD_PATTERN = /^[0-9]{6}$/

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

/**
 * "202604" -> "April 2026". Returns the raw value when it is not a valid period.
 */
export function formatPeriod(period: string): string {
  if (!PERIOD_PATTERN.test(period)) return period
  const year = period.slice(0, 4)
  const month = Number(period.slice(4, 6))
  if (month < 1 || month > 12) return period
  return `${MONTH_NAMES[month - 1]} ${year}`
}

/**
 * "202604" -> "2026-04" (the value used by <input type="month" />).
 * Returns "" when the period is not valid.
 */
export function periodToMonthInput(period: string): string {
  if (!PERIOD_PATTERN.test(period)) return ""
  const month = Number(period.slice(4, 6))
  if (month < 1 || month > 12) return ""
  return `${period.slice(0, 4)}-${period.slice(4, 6)}`
}

/**
 * "2026-04" -> "202604". Returns "" for empty/invalid input.
 */
export function monthInputToPeriod(value: string): string {
  const match = /^([0-9]{4})-([0-9]{2})$/.exec(value)
  if (!match) return ""
  return `${match[1]}${match[2]}`
}

// ============================================================================
// Number formatting for display
// ============================================================================

/**
 * Format a NUMERIC(20,6) value with thousand separators.
 * Returns null when the value is missing so callers can render a dash.
 */
export function formatNumeric(value: number | undefined | null, maximumFractionDigits = 4): string | null {
  if (value === undefined || value === null || Number.isNaN(value)) return null
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  })
}
