// Finance MbLusture master routes - Update, Delete by ID

import { NextRequest, NextResponse } from "next/server"
import { getMbLustureClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type RouteContext = { params: Promise<{ mblId: string }> }

// PUT /api/v1/finance/master/mb-lusture/[mblId]
export async function PUT(request: NextRequest, context: RouteContext) {
    try {
        const { mblId } = await context.params
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getMbLustureClient()
        const response = await client.updateMbLusture({ ...body, mblId }, metadata)

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error updating MB Lusture:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to update MB lusture",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}

// DELETE /api/v1/finance/master/mb-lusture/[mblId]
export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const { mblId } = await context.params
        const metadata = createMetadataFromRequest(request)
        const client = getMbLustureClient()
        const response = await client.deleteMbLusture({ mblId }, metadata)

        return NextResponse.json({
            base: response.base,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error deleting MB Lusture:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to delete MB lusture",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
