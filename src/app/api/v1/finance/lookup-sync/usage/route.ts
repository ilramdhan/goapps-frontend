// Finance CostProductLookupSyncService route - count lookup usage

import { NextRequest, NextResponse } from "next/server"
import { getCostProductLookupSyncClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

// GET /api/v1/finance/lookup-sync/usage
export async function GET(request: NextRequest) {
    try {
        const sp = request.nextUrl.searchParams
        const metadata = createMetadataFromRequest(request)
        const client = getCostProductLookupSyncClient()
        const response = await client.countLookupUsage(
            {
                lookupMasterCode: sp.get("lookupMasterCode") ?? "",
                masterKey: sp.get("masterKey") ?? "",
            },
            metadata
        )
        return NextResponse.json({ base: response.base, data: response.data })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error in lookup sync: count lookup usage", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed: count lookup usage",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
