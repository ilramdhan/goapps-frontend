// Finance Yarn TX Weight group routes - Get, Update, Delete by ID

import { NextRequest, NextResponse } from "next/server"
import { getYarnTxWeightGroupClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"
import { toYarnTxWeightGroupRequestBody } from "@/types/finance/yarn-tx-weight"

type RouteContext = { params: Promise<{ id: string }> }

function errorResponse(message: string) {
    return NextResponse.json(
        {
            base: { isSuccess: false, statusCode: "500", message, validationErrors: [] },
        },
        { status: 500 }
    )
}

// GET /api/v1/finance/yarn-tx-weight-groups/[id]
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params
        const metadata = createMetadataFromRequest(request)
        const client = getYarnTxWeightGroupClient()
        const response = await client.getYarnTxWeightGroup({ groupId: id }, metadata)

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error fetching TX weight config:", error)
        return errorResponse("Failed to fetch TX weight config")
    }
}

// PUT /api/v1/finance/yarn-tx-weight-groups/[id]
// Full replacement: the product type set and the rules are replaced in one transaction.
export async function PUT(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getYarnTxWeightGroupClient()
        const response = await client.updateYarnTxWeightGroup(
            { groupId: id, ...toYarnTxWeightGroupRequestBody(body) },
            metadata
        )

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error updating TX weight config:", error)
        return errorResponse("Failed to update TX weight config")
    }
}

// DELETE /api/v1/finance/yarn-tx-weight-groups/[id]
// Soft delete; its product types become free and fall back to the ratio formula.
export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params
        const metadata = createMetadataFromRequest(request)
        const client = getYarnTxWeightGroupClient()
        const response = await client.deleteYarnTxWeightGroup({ groupId: id }, metadata)

        return NextResponse.json({
            base: response.base,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error deleting TX weight config:", error)
        return errorResponse("Failed to delete TX weight config")
    }
}
