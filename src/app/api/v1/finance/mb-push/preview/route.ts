// Finance MbPush route - Preview pushable/skipped MB Heads for a period

import { NextRequest, NextResponse } from "next/server"
import { getMbPushClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

// POST /api/v1/finance/mb-push/preview
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getMbPushClient()
        const response = await client.previewPushToHead({ period: body.period ?? "" }, metadata)

        return NextResponse.json({
            base: response.base,
            data: { pushable: response.pushable, skipped: response.skipped },
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error previewing push-to-head:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to preview push-to-head",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
