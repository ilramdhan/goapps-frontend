// Finance CostProductLookupSyncService route - apply lookup sync (base.statusCode 409 = plan drifted)

import { NextRequest, NextResponse } from "next/server"
import { getCostProductLookupSyncClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"
import { LookupSyncScope } from "@/types/generated/finance/v1/cost_product_lookup_sync"

// POST /api/v1/finance/lookup-sync/apply
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getCostProductLookupSyncClient()
        const response = await client.applyLookupSync(
            { scope: LookupSyncScope.fromPartial(body.scope ?? {}), planFingerprint: body.planFingerprint ?? "" },
            metadata
        )
        return NextResponse.json({ base: response.base, data: response.data, summary: response.summary })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error in lookup sync: apply lookup sync (base.statusCode 409 = plan drifted)", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed: apply lookup sync (base.statusCode 409 = plan drifted)",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
