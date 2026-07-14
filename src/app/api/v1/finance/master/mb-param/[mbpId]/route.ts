// Finance MbParam master routes - Update, Delete by ID

import { NextRequest, NextResponse } from "next/server"
import { getMbParamClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type RouteContext = { params: Promise<{ mbpId: string }> }

// PUT /api/v1/finance/master/mb-param/[mbpId]
export async function PUT(request: NextRequest, context: RouteContext) {
    try {
        const { mbpId } = await context.params
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getMbParamClient()
        const response = await client.updateMbParam({ ...body, mbpId }, metadata)

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error updating MB Param:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to update MB param",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}

// DELETE /api/v1/finance/master/mb-param/[mbpId]
export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const { mbpId } = await context.params
        const metadata = createMetadataFromRequest(request)
        const client = getMbParamClient()
        const response = await client.deleteMbParam({ mbpId }, metadata)

        return NextResponse.json({
            base: response.base,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error deleting MB Param:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to delete MB param",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
