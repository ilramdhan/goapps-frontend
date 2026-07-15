// IAM Presence route - Get online user IDs

import { NextRequest, NextResponse } from "next/server"
import { getPresenceClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

// GET /api/v1/iam/presence/online?user_ids=uuid1,uuid2
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const metadata = createMetadataFromRequest(request)
        const client = getPresenceClient()

        const rawUserIds = searchParams.get("userIds") || searchParams.get("user_ids") || ""
        const userIds = rawUserIds
            ? rawUserIds.split(",").map((v) => v.trim()).filter(Boolean)
            : []

        const response = await client.getOnlineUsers({ userIds }, metadata)

        return NextResponse.json({
            base: response.base,
            data: { userIds: response.userIds },
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error fetching online users:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to fetch online users",
                    validationErrors: [],
                },
                data: { userIds: [] },
            },
            { status: 500 }
        )
    }
}
