// IAM Chat routes - Remove a participant from a group conversation

import { NextRequest, NextResponse } from "next/server"
import { getChatClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type RouteContext = { params: Promise<{ id: string; userId: string }> }

// DELETE /api/v1/iam/chat/conversations/[id]/participants/[userId] - Remove a participant
export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const { id, userId } = await context.params
        const metadata = createMetadataFromRequest(request)
        const client = getChatClient()
        const response = await client.removeParticipant({ conversationId: id, userId }, metadata)

        return NextResponse.json({
            base: response.base,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error removing participant:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to remove participant",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
