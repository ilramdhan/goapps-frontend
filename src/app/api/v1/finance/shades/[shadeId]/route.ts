// Finance Shade routes - Get, Update, Deactivate by ID
//
// shadeId is an int64 in proto (numeric primary key ces_shade_id), so it must
// be converted with Number() before calling the gRPC client — unlike UUID-keyed
// entities (e.g. Machine) whose id is passed through as-is.

import { NextRequest, NextResponse } from "next/server"
import { getShadeClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type RouteContext = { params: Promise<{ shadeId: string }> }

// GET /api/v1/finance/shades/[shadeId]
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { shadeId } = await context.params
        const metadata = createMetadataFromRequest(request)
        const client = getShadeClient()
        const response = await client.getShade({ shadeId: Number(shadeId) }, metadata)

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error fetching shade:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to fetch shade",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}

// PUT /api/v1/finance/shades/[shadeId]
export async function PUT(request: NextRequest, context: RouteContext) {
    try {
        const { shadeId } = await context.params
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getShadeClient()
        const response = await client.updateShade({ ...body, shadeId: Number(shadeId) }, metadata)

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error updating shade:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to update shade",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}

// DELETE /api/v1/finance/shades/[shadeId] - Deactivate (NOT a hard delete).
// Calls DeactivateShade, which only flips ces_is_active to false — the row
// and its history are retained. There is deliberately no hard-delete RPC.
export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const { shadeId } = await context.params
        const metadata = createMetadataFromRequest(request)
        const client = getShadeClient()
        const response = await client.deactivateShade({ shadeId: Number(shadeId) }, metadata)

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error deactivating shade:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to deactivate shade",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
