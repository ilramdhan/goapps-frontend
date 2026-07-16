// IAM Chat routes - Get, update (group), leave conversation by ID

import { NextRequest, NextResponse } from "next/server"
import { getChatClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/v1/iam/chat/conversations/[id]
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params
        const metadata = createMetadataFromRequest(request)
        const client = getChatClient()
        const response = await client.getConversation({ conversationId: id }, metadata)

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error fetching conversation:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to fetch conversation",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}

// PUT /api/v1/iam/chat/conversations/[id] - Update group conversation (name, avatarUrl)
export async function PUT(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getChatClient()
        const response = await client.updateGroupConversation(
            {
                conversationId: id,
                name: body.name || "",
                avatarUrl: body.avatarUrl || body.avatar_url || "",
            },
            metadata
        )

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error updating conversation:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to update conversation",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}

// DELETE /api/v1/iam/chat/conversations/[id] - Leave conversation
export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params
        const metadata = createMetadataFromRequest(request)
        const client = getChatClient()
        const response = await client.leaveConversation({ conversationId: id }, metadata)

        return NextResponse.json({
            base: response.base,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error leaving conversation:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to leave conversation",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
