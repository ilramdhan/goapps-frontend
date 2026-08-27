// Finance MBHead workflow route - Return to Draft (K-29: REJECTED → DRAFT)

import { NextRequest, NextResponse } from "next/server"
import { getMBHeadClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type RouteContext = { params: Promise<{ mbhId: string }> }

// POST /api/v1/finance/mb-heads/[mbhId]/return-to-draft
export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const { mbhId } = await context.params
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getMBHeadClient()
        // K-29: reason is OPTIONAL — an absent reason is forwarded as "" and the
        // backend preserves the existing stateReason.
        const response = await client.returnMBHeadToDraft({ mbhId, reason: body.reason ?? "" }, metadata)

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error returning MB Head to draft:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to return MB head to draft",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
