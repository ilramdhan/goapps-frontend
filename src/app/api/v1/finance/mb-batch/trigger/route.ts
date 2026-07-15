// Finance MbBatch route - Trigger MB_BATCH cost compute for all VALIDATED MB heads in a period

import { NextRequest, NextResponse } from "next/server"
import { getMbBatchClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

// POST /api/v1/finance/mb-batch/trigger
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getMbBatchClient()
        const response = await client.triggerMbBatch({ period: body.period ?? "" }, metadata)

        return NextResponse.json({
            base: response.base,
            data: {
                jobId: response.jobId,
                period: response.period,
                successCount: response.successCount,
                failedCount: response.failedCount,
                rowsInserted: response.rowsInserted,
                durationMs: response.durationMs,
                errors: response.errors,
            },
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error triggering MB batch:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to trigger MB batch",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
