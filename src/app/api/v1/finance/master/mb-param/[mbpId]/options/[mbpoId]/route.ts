// Finance MbParamOption routes - Update, Delete picklist option by ID

import { NextRequest, NextResponse } from "next/server"
import { getMbParamClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type RouteContext = { params: Promise<{ mbpId: string; mbpoId: string }> }

// PUT /api/v1/finance/master/mb-param/[mbpId]/options/[mbpoId]
export async function PUT(request: NextRequest, context: RouteContext) {
    try {
        const { mbpoId } = await context.params
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getMbParamClient()
        const response = await client.updateMbParamOption({ ...body, mbpoId }, metadata)

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error updating MB Param option:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to update MB param option",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}

// DELETE /api/v1/finance/master/mb-param/[mbpId]/options/[mbpoId]
export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const { mbpoId } = await context.params
        const metadata = createMetadataFromRequest(request)
        const client = getMbParamClient()
        const response = await client.deleteMbParamOption({ mbpoId }, metadata)

        return NextResponse.json({
            base: response.base,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error deleting MB Param option:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to delete MB param option",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
