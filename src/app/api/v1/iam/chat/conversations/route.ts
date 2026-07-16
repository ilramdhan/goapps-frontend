// IAM Chat routes - List conversations, create direct/group conversation

import { NextRequest, NextResponse } from "next/server"
import { getChatClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

// GET /api/v1/iam/chat/conversations - List conversations for current user
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const metadata = createMetadataFromRequest(request)
        const client = getChatClient()

        const response = await client.listConversations(
            {
                page: Number(searchParams.get("page")) || 1,
                pageSize: Number(searchParams.get("pageSize") || searchParams.get("page_size")) || 20,
                search: searchParams.get("search") || "",
            },
            metadata
        )

        return NextResponse.json({
            base: response.base,
            data: response.data,
            pagination: response.pagination,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error listing conversations:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to list conversations",
                    validationErrors: [],
                },
                data: [],
                pagination: { currentPage: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
            },
            { status: 500 }
        )
    }
}

// POST /api/v1/iam/chat/conversations - Create direct (peer_user_id) or group (name+participant_ids) conversation
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getChatClient()

        const peerUserId = body.peerUserId || body.peer_user_id
        if (peerUserId) {
            const response = await client.createDirectConversation({ peerUserId }, metadata)
            return NextResponse.json({
                base: response.base,
                data: response.data,
            })
        }

        const response = await client.createGroupConversation(
            {
                name: body.name || "",
                participantIds: body.participantIds || body.participant_ids || [],
            },
            metadata
        )

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error creating conversation:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to create conversation",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
