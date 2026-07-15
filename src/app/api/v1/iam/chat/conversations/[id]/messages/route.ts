// IAM Chat routes - List messages, send message in a conversation

import { NextRequest, NextResponse } from "next/server"
import { getChatClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/v1/iam/chat/conversations/[id]/messages - Cursor-paginated message list
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params
        const { searchParams } = new URL(request.url)
        const metadata = createMetadataFromRequest(request)
        const client = getChatClient()

        const response = await client.listMessages(
            {
                conversationId: id,
                pageSize: Number(searchParams.get("pageSize") || searchParams.get("page_size")) || 30,
                beforeCursor: searchParams.get("beforeCursor") || searchParams.get("before_cursor") || "",
            },
            metadata
        )

        return NextResponse.json({
            base: response.base,
            data: {
                messages: response.data,
                nextCursor: response.nextCursor,
                hasMore: response.hasMore,
            },
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error listing messages:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to list messages",
                    validationErrors: [],
                },
                data: { messages: [], nextCursor: "", hasMore: false },
            },
            { status: 500 }
        )
    }
}

// POST /api/v1/iam/chat/conversations/[id]/messages - Send a message
export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getChatClient()

        const response = await client.sendMessage(
            {
                conversationId: id,
                body: body.body || "",
                replyToId: body.replyToId || body.reply_to_id || "",
            },
            metadata
        )

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error sending message:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to send message",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
