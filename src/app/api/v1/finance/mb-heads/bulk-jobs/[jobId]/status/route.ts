// Finance MBHead bulk workflow route - Poll bulk job status/progress
// GetBulkMBHeadJobStatusResponse carries its fields (jobId/jobCode/status/...)
// directly on the response, not nested under `data` — mirrored here as-is.

import { NextRequest, NextResponse } from "next/server"
import { getMBHeadClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type RouteContext = { params: Promise<{ jobId: string }> }

// GET /api/v1/finance/mb-heads/bulk-jobs/[jobId]/status
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { jobId } = await context.params
        const metadata = createMetadataFromRequest(request)
        const client = getMBHeadClient()
        const response = await client.getBulkMBHeadJobStatus({ jobId }, metadata)

        return NextResponse.json({
            base: response.base,
            jobId: response.jobId,
            jobCode: response.jobCode,
            status: response.status,
            totalChildren: response.totalChildren,
            completedChildren: response.completedChildren,
            failedChildren: response.failedChildren,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error fetching bulk MB Head job status:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to fetch bulk MB Head job status",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
