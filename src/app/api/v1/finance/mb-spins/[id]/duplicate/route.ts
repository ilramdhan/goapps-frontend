// Finance MBSpin route - Duplicate (P8)
//
// Clones an MB Spin into a fresh "R and D" (draft) child. mbs_orion_item_code is
// ALWAYS null on the clone (decision D19) and mbs_oracle_sys_id / mbs_mb_costing
// are absent from the request for the same reason — the backend enforces this,
// not the BFF. The response also carries a recalc-impact PREVIEW (decision D24):
// nothing is actually recalculated by this call, so `skipped` / `impactPreview` /
// etc. are forwarded verbatim for the UI to display, never interpreted here.

import { NextRequest, NextResponse } from "next/server"
import { getMBSpinClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type RouteContext = { params: Promise<{ id: string }> }

// POST /api/v1/finance/mb-spins/[id]/duplicate
//
// Body: { mbhId: string, mbsMgtName?: string, mbsDenier?: number, mbsFilament?: number }
// `mbhId` is REQUIRED — DuplicateMBSpinRequest carries it so the backend can verify
// the source spin actually belongs to the head the caller believes it does.
export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params
        const body = await request.json().catch(() => ({}))
        const metadata = createMetadataFromRequest(request)
        const client = getMBSpinClient()
        const response = await client.duplicateMBSpin(
            {
                mbhId: body.mbhId ?? "",
                mbsId: id,
                mbsMgtName: body.mbsMgtName,
                mbsDenier: body.mbsDenier,
                mbsFilament: body.mbsFilament,
            },
            metadata
        )

        return NextResponse.json({
            base: response.base,
            data: response.data,
            skipped: response.skipped,
            skippedCount: response.skippedCount,
            impactPreview: response.impactPreview,
            impactTotalAffected: response.impactTotalAffected,
            impactTotalLocked: response.impactTotalLocked,
            impactTruncated: response.impactTruncated,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error duplicating MB Spin:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to duplicate MB spin",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
