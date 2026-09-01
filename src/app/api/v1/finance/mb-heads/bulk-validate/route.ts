// Finance MBHead bulk workflow route - Bulk validate (Super Admin)
// Freezes cost/param snapshot for each approved MB Head. Queues an async job;
// poll bulk-jobs/[jobId]/status for progress.

import { NextRequest, NextResponse } from "next/server"
import { getMBHeadClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

// POST /api/v1/finance/mb-heads/bulk-validate
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getMBHeadClient()
        const response = await client.bulkValidateMBHead({ mbhIds: body.mbhIds ?? [] }, metadata)

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error bulk validating MB Heads:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to bulk validate MB heads",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
