// Finance MBHead workflow route - Validate (freezes cost/param snapshot)

import { NextRequest, NextResponse } from "next/server"
import { getMBHeadClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type RouteContext = { params: Promise<{ mbhId: string }> }

// POST /api/v1/finance/mb-heads/[mbhId]/validate
export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const { mbhId } = await context.params
        const metadata = createMetadataFromRequest(request)
        const client = getMBHeadClient()
        const response = await client.validateMBHead({ mbhId }, metadata)

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error validating MB Head:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to validate MB head",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
