// Shared batch-size guard for the three MB Head bulk workflow routes.
//
// BulkForceUnvalidateMBHeadRequest / BulkSubmitMBHeadRequest /
// BulkValidateMBHeadRequest each cap `mbh_ids` at `max_items: 500`
// (goapps-shared-proto/finance/v1/yarn_master.proto). protovalidate rejects an
// oversized batch at the interceptor, BEFORE the handler runs — so there is no
// job, no job code, and no per-item failure list, just a generic validation
// message that says nothing about which cap was hit or by how much.
//
// This guard turns that into a self-explaining 400 naming both the cap and the
// actual count. It does NOT replace the proto rule (which is still the real
// enforcement point for any caller that bypasses this BFF) — it exists so the
// failure is diagnosable from the UI.

import { NextResponse } from "next/server"

/** Mirrors `max_items: 500` on all three bulk MB Head requests. */
export const BULK_MB_HEAD_MAX_ITEMS = 500

/**
 * Returns a ready-to-send 400 response when `mbhIds` exceeds the proto cap, or
 * null when the batch is within limits and the caller should proceed.
 *
 * Deliberately does NOT reject an EMPTY batch: `min_items: 1` is the proto's
 * business, and the existing routes already pass `[]` straight through, so
 * adding that check here would change behaviour beyond the stated fix.
 */
export function checkBulkBatchLimit(mbhIds: unknown[], action: string): NextResponse | null {
  if (mbhIds.length <= BULK_MB_HEAD_MAX_ITEMS) return null

  return NextResponse.json(
    {
      base: {
        isSuccess: false,
        statusCode: "400",
        message:
          `Cannot bulk ${action} ${mbhIds.length} MB Heads in one request — ` +
          `the limit is ${BULK_MB_HEAD_MAX_ITEMS} per batch. ` +
          `Split the selection into batches of at most ${BULK_MB_HEAD_MAX_ITEMS}.`,
        validationErrors: [],
      },
    },
    { status: 400 }
  )
}
