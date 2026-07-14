// Finance MBHead workflow route - Un-approve (revert out of approved state)

import { NextRequest, NextResponse } from "next/server"
import { getMBHeadClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type RouteContext = { params: Promise<{ mbhId: string }> }

// POST /api/v1/finance/mb-heads/[mbhId]/unapprove
export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const { mbhId } = await context.params
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getMBHeadClient()
        const response = await client.unApproveMBHead({ mbhId, reason: body.reason ?? "" }, metadata)

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error un-approving MB Head:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to un-approve MB head",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
