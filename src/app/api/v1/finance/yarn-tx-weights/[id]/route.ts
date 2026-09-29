// Finance Yarn TX Weight master routes - Get, Update, Delete by ID

import { NextRequest, NextResponse } from "next/server"
import { getYarnTxWeightClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"
import { modeCodeToEnum, toModeCode } from "@/types/finance/yarn-tx-weight"

type RouteContext = { params: Promise<{ id: string }> }

function errorResponse(message: string) {
    return NextResponse.json(
        {
            base: { isSuccess: false, statusCode: "500", message, validationErrors: [] },
        },
        { status: 500 }
    )
}

// GET /api/v1/finance/yarn-tx-weights/[id]
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params
        const metadata = createMetadataFromRequest(request)
        const client = getYarnTxWeightClient()
        const response = await client.getYarnTxWeight({ id }, metadata)

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error fetching TX weight:", error)
        return errorResponse("Failed to fetch TX weight")
    }
}

// PUT /api/v1/finance/yarn-tx-weights/[id]
// product_type_id and grade are immutable — only mode/value/description are forwarded.
export async function PUT(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getYarnTxWeightClient()

        const modeCode = toModeCode(body.mode)
        const response = await client.updateYarnTxWeight(
            {
                id,
                mode: modeCode ? modeCodeToEnum(modeCode) : undefined,
                value: body.value === undefined || body.value === null ? undefined : Number(body.value),
                description: body.description === undefined ? undefined : String(body.description ?? ""),
            },
            metadata
        )

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error updating TX weight:", error)
        return errorResponse("Failed to update TX weight")
    }
}

// DELETE /api/v1/finance/yarn-tx-weights/[id]
export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params
        const metadata = createMetadataFromRequest(request)
        const client = getYarnTxWeightClient()
        const response = await client.deleteYarnTxWeight({ id }, metadata)

        return NextResponse.json({
            base: response.base,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error deleting TX weight:", error)
        return errorResponse("Failed to delete TX weight")
    }
}
