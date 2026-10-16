// Finance CostProductLookupSyncService route - poll lookup sync job status

import { NextRequest, NextResponse } from "next/server"
import { getCostProductLookupSyncClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type RouteContext = { params: Promise<{ jobId: string }> }

// GET /api/v1/finance/lookup-sync/jobs/[jobId]/status
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { jobId } = await context.params
        const metadata = createMetadataFromRequest(request)
        const client = getCostProductLookupSyncClient()
        const response = await client.getLookupSyncJobStatus({ jobId }, metadata)
        return NextResponse.json({
            base: response.base,
            data: response.data,
            skippedChildren: response.skippedChildren,
            valuesWritten: response.valuesWritten,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error in lookup sync: poll lookup sync job status", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed: poll lookup sync job status",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
