// MBSpin Types - Re-export from proto-generated types with UI helpers

// ============================================================================
// Re-export proto-generated types
// ============================================================================

// Entity and Request/Response types (as type-only exports)
export type {
  MBSpin,
  CreateMBSpinRequest,
  CreateMBSpinResponse,
  GetMBSpinRequest,
  GetMBSpinResponse,
  UpdateMBSpinRequest,
  UpdateMBSpinResponse,
  DeleteMBSpinRequest,
  DeleteMBSpinResponse,
  ListMBSpinsRequest,
  ListMBSpinsResponse,
  ExportMBSpinsRequest,
  ExportMBSpinsResponse,
  ImportMBSpinsRequest,
  ImportMBSpinsResponse,
  DownloadMBSpinTemplateRequest,
  DownloadMBSpinTemplateResponse,
} from "@/types/generated/finance/v1/yarn_master"

// Message functions for parsing (named exports as Parsers)
export {
  MBSpin as MBSpinParser,
  CreateMBSpinResponse as CreateMBSpinResponseParser,
  GetMBSpinResponse as GetMBSpinResponseParser,
  UpdateMBSpinResponse as UpdateMBSpinResponseParser,
  DeleteMBSpinResponse as DeleteMBSpinResponseParser,
  ListMBSpinsResponse as ListMBSpinsResponseParser,
  ExportMBSpinsResponse as ExportMBSpinsResponseParser,
  ImportMBSpinsResponse as ImportMBSpinsResponseParser,
  DownloadMBSpinTemplateResponse as DownloadMBSpinTemplateResponseParser,
} from "@/types/generated/finance/v1/yarn_master"

// Re-export shared enums/types from UOM (same package)
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

// ⭐ DIPERBARUI 2026-08-31 (P7-T6) — DuplicateMBSpinResponse's cascade/preview
// fields (proto yarn_master.proto ~2200-2230). Re-exported as type-only so the
// duplicate dialog can surface "N affected, M locked, K skipped" instead of
// silently discarding this data (the backend already populates it — see
// applyRecalcToDuplicateResponse in mb_spin_handler.go).
export type { MBSpinRecalcSkipped } from "@/types/generated/finance/v1/yarn_master"

// ============================================================================
// Import for local use
// ============================================================================

import { ActiveFilter } from "@/types/generated/finance/v1/uom"
import type { MBSpinRecalcSkipped } from "@/types/generated/finance/v1/yarn_master"
import {
  normalizeDozingImpactRow,
  type NormalizedDozingImpactRow,
} from "@/types/finance/mb-dozing"

// ============================================================================
// Simplified Params Types for Hooks
// ============================================================================

export interface ListMBSpinsParams {
  page?: number
  pageSize?: number
  search?: string
  // ⭐ DIPERBARUI 2026-08-22 (P11 E1) — widened from `number` to `string | number`.
  // mbh_id is a UUID; the BFF route already reads this param as a string
  // (`searchParams.get("mbhId") || ""`), so `number` was never the wire shape.
  // Widening, not replacing — existing numeric callers still type-check.
  mbhId?: string | number
  activeFilter?: ActiveFilter
  sortBy?: string
  sortOrder?: string
}

export interface ExportMBSpinsParams {
  mbhId?: number
  activeFilter?: ActiveFilter
}

// ============================================================================
// Form Types
// ============================================================================

// ⭐ DIPERBARUI 2026-08-31 (P4-T4) — this shape was stale (mbsCode/mbsName/description/
// isActive never matched the real form). Rewritten to mirror the actual zod schema in
// mb-spin-form-dialog.tsx (formSchema, lines 56-78) field-for-field.
export interface MBSpinFormData {
  mbhId: string
  mbsMgtName: string
  mbsOracleSysId?: string
  mbsDenier?: number | ""
  mbsFilament?: number | ""
  // D30: retired legacy column, kept only so the value round-trips — not rendered in the form.
  mbsDozing?: number | ""
  mbsMbCosting?: string
  mbsCc?: string
  mbsCostRateMkt?: number | null
  mbsStatus?: string
  mbsLdrPrsn?: number | null
  mbsRunLdrPct?: number | null
  mbsFinalProduct?: string
  mbsIsActive: boolean
  mbsLdrAdjustmentPct?: number | null
  mbsLdrLockActual: boolean
}

export const DEFAULT_MB_SPIN_FORM_VALUES: MBSpinFormData = {
  mbhId: "",
  mbsMgtName: "",
  mbsOracleSysId: "",
  mbsDenier: "",
  mbsFilament: "",
  mbsDozing: "",
  mbsMbCosting: "",
  mbsCc: "",
  mbsCostRateMkt: null,
  mbsStatus: "",
  mbsLdrPrsn: null,
  mbsRunLdrPct: null,
  mbsFinalProduct: "",
  mbsIsActive: true,
  mbsLdrAdjustmentPct: null,
  mbsLdrLockActual: false,
}

// ============================================================================
// UI Options
// ============================================================================

export const ACTIVE_FILTER_OPTIONS = [
  { value: ActiveFilter.ACTIVE_FILTER_UNSPECIFIED, label: "All Status" },
  { value: ActiveFilter.ACTIVE_FILTER_ACTIVE, label: "Active" },
  { value: ActiveFilter.ACTIVE_FILTER_INACTIVE, label: "Inactive" },
]

// ============================================================================
// Duplicate MB Spin — cascade/impact preview (P7-T6)
// ============================================================================
//
// ⚠ Same PREVIEW-ONLY caveat as DuplicateMBSpinResponse itself (decision D24):
// duplicating a spin NEVER recalculates yarn products. impactPreview only
// tells the user which products WOULD be affected.

export interface NormalizedMBSpinRecalcSkipped {
  mbsId: string
  mbsMgtName: string
  mbsStatus?: string
  reason: string
}

export interface NormalizedMBSpinDuplicateImpact {
  skipped: NormalizedMBSpinRecalcSkipped[]
  skippedCount: number
  // Reuses NormalizedDozingImpactRow — same row shape PreviewDozingImpact
  // returns (see mb-dozing.ts), so a future shared renderer can handle both.
  impactPreview: NormalizedDozingImpactRow[]
  impactTotalAffected: number
  impactTotalLocked: number
  impactTruncated: boolean
}

// Raw wire shape — accepts both camelCase (grpc-js/ts-proto, what the BFF
// route actually forwards today) and snake_case, same defensive pattern as
// mb-dozing.ts's Raw* types, in case that ever changes.
type RawMBSpinRecalcSkipped = {
  mbsId?: string
  mbs_id?: string
  mbsMgtName?: string
  mbs_mgt_name?: string
  mbsStatus?: string
  mbs_status?: string
  reason?: string
}

export type RawMBSpinDuplicateImpact = {
  skipped?: (MBSpinRecalcSkipped | RawMBSpinRecalcSkipped)[]
  skippedCount?: number | string
  skipped_count?: number | string
  impactPreview?: Parameters<typeof normalizeDozingImpactRow>[0][]
  impact_preview?: Parameters<typeof normalizeDozingImpactRow>[0][]
  impactTotalAffected?: number | string
  impact_total_affected?: number | string
  impactTotalLocked?: number | string
  impact_total_locked?: number | string
  impactTruncated?: boolean
  impact_truncated?: boolean
}

function normalizeMBSpinRecalcSkipped(raw: RawMBSpinRecalcSkipped): NormalizedMBSpinRecalcSkipped {
  return {
    mbsId: raw.mbsId ?? raw.mbs_id ?? "",
    mbsMgtName: raw.mbsMgtName ?? raw.mbs_mgt_name ?? "",
    mbsStatus: raw.mbsStatus ?? raw.mbs_status,
    reason: raw.reason ?? "",
  }
}

export function normalizeMBSpinDuplicateImpact(
  raw: RawMBSpinDuplicateImpact
): NormalizedMBSpinDuplicateImpact {
  return {
    skipped: (raw.skipped ?? []).map(normalizeMBSpinRecalcSkipped),
    skippedCount: Number(raw.skippedCount ?? raw.skipped_count ?? 0),
    impactPreview: (raw.impactPreview ?? raw.impact_preview ?? []).map(normalizeDozingImpactRow),
    impactTotalAffected: Number(raw.impactTotalAffected ?? raw.impact_total_affected ?? 0),
    impactTotalLocked: Number(raw.impactTotalLocked ?? raw.impact_total_locked ?? 0),
    impactTruncated: raw.impactTruncated ?? raw.impact_truncated ?? false,
  }
}
