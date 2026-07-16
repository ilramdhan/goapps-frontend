// IAM Chat routes - Clear conversation history (per-caller view only)

import { NextRequest, NextResponse } from "next/server"
import { getChatClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type RouteContext = { params: Promise<{ id: string }> }

// DELETE /api/v1/iam/chat/conversations/[id]/history - Clear caller's own view of history
export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params
        const metadata = createMetadataFromRequest(request)
        const client = getChatClient()
        const response = await client.clearConversationHistory({ conversationId: id }, metadata)

        return NextResponse.json({
            base: response.base,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error clearing conversation history:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to clear conversation history",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
