// IAM Chat routes - Edit, delete a message

import { NextRequest, NextResponse } from "next/server"
import { getChatClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type RouteContext = { params: Promise<{ id: string; msgId: string }> }

// PUT /api/v1/iam/chat/conversations/[id]/messages/[msgId] - Edit message body
export async function PUT(request: NextRequest, context: RouteContext) {
    try {
        const { id, msgId } = await context.params
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getChatClient()

        const response = await client.editMessage(
            {
                conversationId: id,
                messageId: msgId,
                body: body.body || "",
            },
            metadata
        )

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error editing message:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to edit message",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}

// DELETE /api/v1/iam/chat/conversations/[id]/messages/[msgId] - Soft-delete message
export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const { id, msgId } = await context.params
        const metadata = createMetadataFromRequest(request)
        const client = getChatClient()

        const response = await client.deleteMessage({ conversationId: id, messageId: msgId }, metadata)

        return NextResponse.json({
            base: response.base,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error deleting message:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to delete message",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
