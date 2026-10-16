// Finance CostProductLookupSyncService route - preview lookup sync

import { NextRequest, NextResponse } from "next/server"
import { getCostProductLookupSyncClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"
import { LookupSyncScope } from "@/types/generated/finance/v1/cost_product_lookup_sync"

// POST /api/v1/finance/lookup-sync/preview
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getCostProductLookupSyncClient()
        const response = await client.previewLookupSync(
            {
                scope: LookupSyncScope.fromPartial(body.scope ?? {}),
                pagination: body.pagination ?? { page: 1, pageSize: 20 },
                onlyActionable: body.onlyActionable ?? false,
            },
            metadata
        )
        return NextResponse.json({
            base: response.base,
            summary: response.summary,
            items: response.items,
            pagination: response.pagination,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error in lookup sync: preview lookup sync", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed: preview lookup sync",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
