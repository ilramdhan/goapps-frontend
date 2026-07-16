// IAM Chat routes - Add participants to a group conversation

import { NextRequest, NextResponse } from "next/server"
import { getChatClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type RouteContext = { params: Promise<{ id: string }> }

// POST /api/v1/iam/chat/conversations/[id]/participants - Add participants to group conversation
export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getChatClient()
        const response = await client.addParticipants(
            {
                conversationId: id,
                userIds: body.userIds || body.user_ids || [],
            },
            metadata
        )

        return NextResponse.json({
            base: response.base,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error adding participants:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to add participants",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
