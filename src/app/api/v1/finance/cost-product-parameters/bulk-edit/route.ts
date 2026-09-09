// Finance CostProductParamBulkService route - Bulk edit params across many products
// Queues an async job; poll bulk-jobs/[jobId]/status for progress.

import { NextRequest, NextResponse } from "next/server"
import { getCostProductParamBulkClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

// POST /api/v1/finance/cost-product-parameters/bulk-edit
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getCostProductParamBulkClient()
        const response = await client.bulkEditProductParams(
            {
                productSysIds: body.productSysIds ?? [],
                operations: body.operations ?? [],
                skipMissingApplicable: body.skipMissingApplicable ?? true,
            },
            metadata
        )

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error queuing bulk product param edit job:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to queue bulk product param edit job",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
