// Finance MBHead workflow route - Unrevoke (2026-08-31: REVOKED → DRAFT, Super Admin only)

import { NextRequest, NextResponse } from "next/server"
import { getMBHeadClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type RouteContext = { params: Promise<{ mbhId: string }> }

// POST /api/v1/finance/mb-heads/[mbhId]/unrevoke
export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const { mbhId } = await context.params
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getMBHeadClient()
        // Reason is OPTIONAL — an absent reason is forwarded as "" and the backend
        // preserves the existing stateReason (same semantics as return-to-draft).
        const response = await client.unrevokeMBHead({ mbhId, reason: body.reason ?? "" }, metadata)

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error unrevoking MB Head:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to unrevoke MB head",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
