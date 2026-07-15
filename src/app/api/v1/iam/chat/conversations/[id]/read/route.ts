// IAM Chat route - Mark conversation as read

import { NextRequest, NextResponse } from "next/server"
import { getChatClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type RouteContext = { params: Promise<{ id: string }> }

// POST /api/v1/iam/chat/conversations/[id]/read
export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params
        const metadata = createMetadataFromRequest(request)
        const client = getChatClient()

        const response = await client.markConversationRead({ conversationId: id }, metadata)

        return NextResponse.json({
            base: response.base,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error marking conversation as read:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to mark conversation as read",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
