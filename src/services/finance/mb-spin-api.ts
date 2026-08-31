// MB Spin API service — non-CRUD action(s): Duplicate (P8), Update-with-cascade (P7-T5)

import type { MBSpin } from "@/types/finance/mb-spin"
import {
  normalizeMBSpinDuplicateImpact,
  type NormalizedMBSpinDuplicateImpact,
  type RawMBSpinDuplicateImpact,
} from "@/types/finance/mb-spin"

interface BFFEnvelope<T> {
  base?: { isSuccess?: boolean; message?: string }
  data?: T
}

// ⭐ DIPERBARUI 2026-08-31 (P7-T6) — the BFF route
// (/api/v1/finance/mb-spins/[id]/duplicate) already forwards skipped/
// impactPreview/impactTotal* verbatim from DuplicateMBSpinResponse (see that
// route's own comment), but this service previously only read `data` and
// threw the rest away. Now it returns the full shape.
export interface DuplicateMBSpinResult {
  spin: MBSpin
  impact: NormalizedMBSpinDuplicateImpact
}

export interface DuplicateMBSpinInput {
  mbhId: string
  mbsId: string
  // ⭐ DIPERBARUI 2026-08-31 (P4-T5, D6) — optional overrides collected from the
  // duplicate dialog. All three are OPTIONAL on DuplicateMBSpinRequest (proto
  // yarn_master.proto ~line 2151 / generated finance/v1/yarn_master.ts ~line
  // 2475-2496): absent means the backend derives mbsMgtName as "<source> (copy)"
  // and copies mbsDenier/mbsFilament as-is. Passing them lets the user override
  // instead of blindly cloning.
  mbsMgtName?: string
  mbsDenier?: number
  mbsFilament?: number
}

// Clones mbsId into a fresh "R and D" draft child under mbhId. mbsMgtName/
// mbsDenier/mbsFilament are forwarded when the caller provides overrides
// (P4-T5); when omitted, the backend falls back to "<source> (copy)" and the
// source's own denier/filament, same as before.
export async function duplicateMBSpin({
  mbhId,
  mbsId,
  mbsMgtName,
  mbsDenier,
  mbsFilament,
}: DuplicateMBSpinInput): Promise<DuplicateMBSpinResult> {
  const res = await fetch(`/api/v1/finance/mb-spins/${mbsId}/duplicate`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mbhId, mbsMgtName, mbsDenier, mbsFilament }),
  })
  const json = (await res.json()) as BFFEnvelope<MBSpin> & RawMBSpinDuplicateImpact
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Failed to duplicate MB Spin")
  }
  return {
    spin: json.data as MBSpin,
    impact: normalizeMBSpinDuplicateImpact(json),
  }
}

// ⭐ DITAMBAHKAN 2026-08-31 (P7-T5) — PUT /api/v1/finance/mb-spins/[id] now
// forwards the same skipped/impactPreview/impactTotal* fields as the duplicate
// route (see that route's own comment) whenever a denier/filament/dozing
// change triggers a child-recalc cascade (A6/A7). Reuses the exact same
// `{ spin, impact }` shape and normalizer as duplicateMBSpin() above — the
// wire shape is identical, so there is no separate "UpdateMBSpinResult" type.
export interface UpdateMBSpinResult {
  spin: MBSpin
  impact: NormalizedMBSpinDuplicateImpact
}

export interface UpdateMBSpinInput {
  mbhId: string
  mbsId: string
  mbsMgtName?: string
  mbsDenier?: number
  mbsFilament?: number
  mbsDozing?: number
  mbsMbCosting?: string
  mbsCc?: string
  mbsCostRateMkt?: number
  mbsStatus?: string
  mbsLdrPrsn?: number
  mbsRunLdrPct?: number
  mbsFinalProduct?: string
  mbsIsActive?: boolean
  mbsLdrAdjustmentPct?: number
  mbsLdrLockActual?: boolean
}

// Updates mbsId and returns the saved spin plus whatever cascade result the
// backend ran (skip list + D24 impact preview), so the caller can show a
// summary instead of silently discarding it, same as duplicateMBSpin().
export async function updateMBSpin({ mbsId, ...body }: UpdateMBSpinInput): Promise<UpdateMBSpinResult> {
  const res = await fetch(`/api/v1/finance/mb-spins/${mbsId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mbsId, ...body }),
  })
  const json = (await res.json()) as BFFEnvelope<MBSpin> & RawMBSpinDuplicateImpact
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Failed to update MB Spin")
  }
  return {
    spin: json.data as MBSpin,
    impact: normalizeMBSpinDuplicateImpact(json),
  }
}
