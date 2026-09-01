// Finance MBHead bulk workflow route - List per-item failures for a bulk job

import { NextRequest, NextResponse } from "next/server"
import { getMBHeadClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type RouteContext = { params: Promise<{ jobId: string }> }

// GET /api/v1/finance/mb-heads/bulk-jobs/[jobId]/failures
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { jobId } = await context.params
        const metadata = createMetadataFromRequest(request)
        const client = getMBHeadClient()
        const response = await client.listBulkMBHeadJobFailures({ jobId }, metadata)

        return NextResponse.json({
            base: response.base,
            failures: response.failures,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error listing bulk MB Head job failures:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to list bulk MB Head job failures",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
