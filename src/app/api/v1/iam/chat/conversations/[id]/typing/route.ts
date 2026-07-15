// IAM Chat route - Set typing indicator

import { NextRequest, NextResponse } from "next/server"
import { getChatClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type RouteContext = { params: Promise<{ id: string }> }

// POST /api/v1/iam/chat/conversations/[id]/typing
export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getChatClient()

        const response = await client.setTyping(
            {
                conversationId: id,
                isTyping: Boolean(body.isTyping ?? body.is_typing ?? false),
            },
            metadata
        )

        return NextResponse.json({
            base: response.base,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error setting typing indicator:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to set typing indicator",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
