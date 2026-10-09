// Superba Cost SP Types - Re-export from proto-generated types with UI helpers
//
// Domain: per-shade "MB cost marketing" master used by the calc engine for
// SUPERBA products (TOP 73 MB_COST_MKT) and for the colour name shown on
// TOP 64 MB_SP_DYE. Rows are SEED / MANUAL / ORACLE sourced. oldValue is the
// value the calculation uses; newValue is informational only.

export type {
  SuperbaCostSp,
  CreateSuperbaCostSpRequest,
  CreateSuperbaCostSpResponse,
  GetSuperbaCostSpRequest,
  GetSuperbaCostSpResponse,
  UpdateSuperbaCostSpRequest,
  UpdateSuperbaCostSpResponse,
  DeleteSuperbaCostSpRequest,
  DeleteSuperbaCostSpResponse,
  ListSuperbaCostSpsRequest,
  ListSuperbaCostSpsResponse,
  SyncSuperbaCostSpsRequest,
  SyncSuperbaCostSpsResponse,
} from "@/types/generated/finance/v1/superba_cost_sp"

export {
  SuperbaCostSp as SuperbaCostSpParser,
  CreateSuperbaCostSpResponse as CreateSuperbaCostSpResponseParser,
  GetSuperbaCostSpResponse as GetSuperbaCostSpResponseParser,
  UpdateSuperbaCostSpResponse as UpdateSuperbaCostSpResponseParser,
  DeleteSuperbaCostSpResponse as DeleteSuperbaCostSpResponseParser,
  ListSuperbaCostSpsResponse as ListSuperbaCostSpsResponseParser,
  SyncSuperbaCostSpsResponse as SyncSuperbaCostSpsResponseParser,
} from "@/types/generated/finance/v1/superba_cost_sp"

export {
  ActiveFilter,
  activeFilterFromJSON,
  activeFilterToJSON,
} from "@/types/generated/finance/v1/uom"

export type { BaseResponse, PaginationResponse } from "@/types/generated/common/v1/common"

import { ActiveFilter } from "@/types/generated/finance/v1/uom"
import {
  SuperbaCostSp as SuperbaCostSpMessage,
  ListSuperbaCostSpsResponse as ListMessage,
  SyncSuperbaCostSpsResponse as SyncMessage,
} from "@/types/generated/finance/v1/superba_cost_sp"
import type {
  SuperbaCostSp,
  SyncSuperbaCostSpsResponse,
} from "@/types/generated/finance/v1/superba_cost_sp"

// ============================================================================
// Normalizers (camelCase + snake_case tolerant; numbers; optional newValue)
// ============================================================================

/** Normalize a raw (camelCase or snake_case) row into a SuperbaCostSp. */
export function normalizeSuperbaCostSp(raw: unknown): SuperbaCostSp {
  return SuperbaCostSpMessage.fromJSON(raw ?? {})
}

/** Normalized list result including the last Oracle sync timestamp. */
export interface SuperbaCostSpList {
  data: SuperbaCostSp[]
  lastSyncedAt: string
}

export function normalizeSuperbaCostSpList(raw: unknown): SuperbaCostSpList {
  const parsed = ListMessage.fromJSON(raw ?? {})
  return { data: parsed.data ?? [], lastSyncedAt: parsed.lastSyncedAt ?? "" }
}

// ============================================================================
// Sync result / "not configured" handling
// ============================================================================

export type SuperbaSyncOutcome =
  | { kind: "success"; result: SyncSuperbaCostSpsResponse }
  | { kind: "not_configured"; message: string }

const NOT_CONFIGURED_RE = /not\s+configured|belum\s+dikonfigurasi|unimplemented/i

/**
 * True when a failed sync response / error means the legacy source is not
 * configured yet (backend answers FAILED_PRECONDITION/UNIMPLEMENTED/409 or an
 * isSuccess=false BaseResponse whose message says "not configured").
 */
export function isSyncNotConfigured(statusCode: string | number | undefined, message: string | undefined): boolean {
  const code = String(statusCode ?? "")
  const msg = message ?? ""
  if (NOT_CONFIGURED_RE.test(msg)) return true
  return code === "501" && msg !== ""
}

/** Classify a raw BFF sync response body into success or not-configured; other failures throw. */
export function parseSyncOutcome(raw: unknown): SuperbaSyncOutcome {
  const res = SyncMessage.fromJSON(raw ?? {})
  const base = res.base
  if (base && base.isSuccess === false) {
    const message = base.message || "Superba Cost SP sync failed"
    if (isSyncNotConfigured(base.statusCode, message)) {
      return { kind: "not_configured", message }
    }
    throw new Error(message)
  }
  return { kind: "success", result: res }
}

// ============================================================================
// Params, labels
// ============================================================================

export interface ListSuperbaCostSpsParams {
  page?: number
  pageSize?: number
  search?: string
  activeFilter?: ActiveFilter
  /** "" (all) | "SEED" | "MANUAL" | "ORACLE" */
  sourceFilter?: string
  sortBy?: string
  sortOrder?: string
}

export const ACTIVE_FILTER_OPTIONS = [
  { value: ActiveFilter.ACTIVE_FILTER_UNSPECIFIED, label: "All Status" },
  { value: ActiveFilter.ACTIVE_FILTER_ACTIVE, label: "Active" },
  { value: ActiveFilter.ACTIVE_FILTER_INACTIVE, label: "Inactive" },
]

export const SOURCE_FILTER_OPTIONS = [
  { value: "", label: "All Sources" },
  { value: "SEED", label: "Seed" },
  { value: "MANUAL", label: "Manual" },
  { value: "ORACLE", label: "Oracle (Synced)" },
]

export const SORT_BY_OPTIONS = [
  { value: "shade_code", label: "Shade Code" },
  { value: "legacy_sys_id", label: "Legacy Sys Id" },
  { value: "colour_name", label: "Colour Name" },
  { value: "old_value", label: "Old Value" },
  { value: "source", label: "Source" },
  { value: "updated_at", label: "Updated" },
]

// ============================================================================
// Form
// ============================================================================

export interface SuperbaCostSpFormData {
  legacySysId: string
  shadeCode: string
  colourName: string
  oldValue: string
  newValue: string
  isActive: boolean
}

export const DEFAULT_SUPERBA_COST_SP_FORM_VALUES: SuperbaCostSpFormData = {
  legacySysId: "",
  shadeCode: "",
  colourName: "",
  oldValue: "",
  newValue: "",
  isActive: true,
}
