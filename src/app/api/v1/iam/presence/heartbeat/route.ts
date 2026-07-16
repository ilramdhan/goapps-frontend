// IAM Presence route - Heartbeat to keep current user marked online

import { NextRequest, NextResponse } from "next/server"
import { getPresenceClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

// POST /api/v1/iam/presence/heartbeat
export async function POST(request: NextRequest) {
    try {
        const metadata = createMetadataFromRequest(request)
        const client = getPresenceClient()

        const response = await client.heartbeat({}, metadata)

        return NextResponse.json({
            base: response.base,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error sending heartbeat:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to send heartbeat",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
