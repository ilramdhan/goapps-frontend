// Finance MBHead bulk workflow route - Bulk force-unvalidate (Super Admin)
// VALIDATED -> DRAFT directly, bypassing the RequestUnlockMBHead/GrantUnlockMBHead
// two-step flow. Queues an async job; poll bulk-jobs/[jobId]/status for progress.

import { NextRequest, NextResponse } from "next/server"
import { getMBHeadClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

// POST /api/v1/finance/mb-heads/bulk-unvalidate
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getMBHeadClient()
        const response = await client.bulkForceUnvalidateMBHead(
            { mbhIds: body.mbhIds ?? [], reason: body.reason ?? "" },
            metadata
        )

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error bulk force-unvalidating MB Heads:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to bulk force-unvalidate MB heads",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
