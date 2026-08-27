// Finance MB Dozing impact-preview route — POST only, READ-ONLY (K-18): lists
// the products a dozing change would affect and persists nothing. Spin path.
//
// `totalAffected` / `totalLocked` are int64 and arrive as strings — they are
// forwarded verbatim and Number(...)-ed in the normalizer, not here.

import { NextRequest, NextResponse } from "next/server"
import {
    getMBDozingClient,
    createMetadataFromRequest,
    isGrpcError,
    handleGrpcError,
} from "@/lib/grpc"

// POST /api/v1/finance/mb-dozing/impact-preview - Preview affected products
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getMBDozingClient()

        const response = await client.previewDozingImpact(
            {
                mbsId: body.mbsId ?? body.mbs_id ?? "",
                // 0 means the server default (20).
                limit: Number(body.limit ?? 0) || 0,
            },
            metadata
        )

        return NextResponse.json({
            base: response.base,
            data: response.data,
            totalAffected: response.totalAffected,
            totalLocked: response.totalLocked,
            truncated: response.truncated,
            note: response.note,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error previewing MB dozing impact:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to preview dozing impact",
                    validationErrors: [],
                },
                data: [],
                totalAffected: 0,
                totalLocked: 0,
                truncated: false,
                note: "",
            },
            { status: 500 }
        )
    }
}
