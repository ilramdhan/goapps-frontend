// Finance MbWorkflowLog route - List status transition audit trail for an MB Head

import { NextRequest, NextResponse } from "next/server"
import { getMbWorkflowLogClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

// GET /api/v1/finance/mb-workflow-logs?mbhId=...
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const mbhId = searchParams.get("mbhId") || ""
        const metadata = createMetadataFromRequest(request)
        const client = getMbWorkflowLogClient()
        const response = await client.listMbWorkflowLogs({ mbhId }, metadata)

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error fetching MB workflow logs:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to fetch MB workflow logs",
                    validationErrors: [],
                },
                data: [],
            },
            { status: 500 }
        )
    }
}
