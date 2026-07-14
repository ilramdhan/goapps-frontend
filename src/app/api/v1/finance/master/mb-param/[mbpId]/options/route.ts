// Finance MbParamOption routes - Create picklist option

import { NextRequest, NextResponse } from "next/server"
import { getMbParamClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

// POST /api/v1/finance/master/mb-param/[mbpId]/options
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getMbParamClient()
        const response = await client.createMbParamOption(body, metadata)

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error creating MB Param option:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to create MB param option",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
