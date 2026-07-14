// Finance MbPush route - Execute push-to-head batch for a period

import { NextRequest, NextResponse } from "next/server"
import { getMbPushClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

// POST /api/v1/finance/mb-push/execute
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getMbPushClient()
        const response = await client.executePushToHead(
            { period: body.period ?? "", mbHeadIds: body.mbHeadIds ?? [] },
            metadata
        )

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error executing push-to-head:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to execute push-to-head",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
