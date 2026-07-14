// Finance MbComposition routes - Update, Delete by ID

import { NextRequest, NextResponse } from "next/server"
import { getMbCompositionClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type RouteContext = { params: Promise<{ mbcmId: string }> }

// PUT /api/v1/finance/mb-compositions/[mbcmId]
export async function PUT(request: NextRequest, context: RouteContext) {
    try {
        const { mbcmId } = await context.params
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getMbCompositionClient()
        const response = await client.updateMbComposition({ ...body, mbcmId }, metadata)

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error updating MB composition:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to update MB composition",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}

// DELETE /api/v1/finance/mb-compositions/[mbcmId]
export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const { mbcmId } = await context.params
        const metadata = createMetadataFromRequest(request)
        const client = getMbCompositionClient()
        const response = await client.deleteMbComposition({ mbcmId }, metadata)

        return NextResponse.json({
            base: response.base,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error deleting MB composition:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to delete MB composition",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
