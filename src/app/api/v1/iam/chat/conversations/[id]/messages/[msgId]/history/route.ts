// IAM Chat route - Get message edit history

import { NextRequest, NextResponse } from "next/server"
import { getChatClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type RouteContext = { params: Promise<{ id: string; msgId: string }> }

// GET /api/v1/iam/chat/conversations/[id]/messages/[msgId]/history
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { id, msgId } = await context.params
        const metadata = createMetadataFromRequest(request)
        const client = getChatClient()

        const response = await client.getMessageEditHistory(
            { conversationId: id, messageId: msgId },
            metadata
        )

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error fetching message edit history:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to fetch message edit history",
                    validationErrors: [],
                },
                data: [],
            },
            { status: 500 }
        )
    }
}
