// Finance MBSpin routes - Get, Update, Delete by ID

import { NextRequest, NextResponse } from "next/server"
import { getMBSpinClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/v1/finance/mb-spins/[id]?mbhId=<uuid>
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params
        const mbhId = new URL(request.url).searchParams.get("mbhId") || ""
        const metadata = createMetadataFromRequest(request)
        const client = getMBSpinClient()
        const response = await client.getMBSpin({ mbhId, mbsId: id }, metadata)

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error fetching MB Spin:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to fetch MB spin",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}

// PUT /api/v1/finance/mb-spins/[id]
//
// ⭐ DIPERBARUI 2026-08-31 (P7-T5) — the response also carries a child-recalc
// cascade result (skipped/impactPreview/etc.) when a denier/filament/dozing
// change triggers the parent's direct children to be recalculated (A6/A7).
// Same shape as DuplicateMBSpinResponse's PREVIEW-only fields (see that
// route's own comment) except this one reflects an ACTUAL recalc that ran,
// not a preview — forwarded verbatim for the UI to display, never
// interpreted here.
export async function PUT(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getMBSpinClient()
        const response = await client.updateMBSpin({ ...body, mbsId: id }, metadata)

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
        console.error("Error updating MB Spin:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to update MB spin",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}

// DELETE /api/v1/finance/mb-spins/[id]?mbhId=<uuid>
export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params
        const mbhId = new URL(request.url).searchParams.get("mbhId") || ""
        const metadata = createMetadataFromRequest(request)
        const client = getMBSpinClient()
        const response = await client.deleteMBSpin({ mbhId, mbsId: id }, metadata)

        return NextResponse.json({
            base: response.base,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error deleting MB Spin:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to delete MB spin",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
