// Finance MBHead workflow route - Reject unlock (P10, K-52)

import { NextRequest, NextResponse } from "next/server"
import { getMBHeadClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type RouteContext = { params: Promise<{ mbhId: string }> }

// POST /api/v1/finance/mb-heads/[mbhId]/reject-unlock
//
// The reason is MANDATORY (yarn_master.ts:2014-2022) — consistent with every other
// refusing transition on this service. Forwarded verbatim, same as /reject.
export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const { mbhId } = await context.params
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getMBHeadClient()
        const response = await client.rejectUnlockMBHead({ mbhId, reason: body.reason ?? "" }, metadata)

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error rejecting MB Head unlock:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to reject MB head unlock",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
