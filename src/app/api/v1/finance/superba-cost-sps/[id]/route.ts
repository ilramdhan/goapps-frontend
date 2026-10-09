// Finance Superba Cost SP routes - Get, Update, Delete by ID
//
// legacySysId is immutable and intentionally not forwarded on PUT.

import { NextRequest, NextResponse } from "next/server"
import { getSuperbaCostSpClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type RouteContext = { params: Promise<{ id: string }> }

function optionalNumber(value: unknown): number | undefined {
    if (value === undefined || value === null || value === "") return undefined
    const parsed = Number(value)
    return Number.isNaN(parsed) ? undefined : parsed
}

function errorBody(message: string) {
    return { base: { isSuccess: false, statusCode: "500", message, validationErrors: [] } }
}

// GET /api/v1/finance/superba-cost-sps/[id]
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params
        const metadata = createMetadataFromRequest(request)
        const response = await getSuperbaCostSpClient().getSuperbaCostSp({ id }, metadata)
        return NextResponse.json({ base: response.base, data: response.data })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error fetching superba cost sp:", error)
        return NextResponse.json(errorBody("Failed to fetch Superba Cost SP"), { status: 500 })
    }
}

// PUT /api/v1/finance/superba-cost-sps/[id]
export async function PUT(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const response = await getSuperbaCostSpClient().updateSuperbaCostSp(
            {
                id,
                shadeCode: body.shadeCode ?? body.shade_code,
                colourName: body.colourName ?? body.colour_name,
                oldValue: optionalNumber(body.oldValue ?? body.old_value),
                newValue: optionalNumber(body.newValue ?? body.new_value),
                isActive: body.isActive ?? body.is_active,
            },
            metadata
        )
        return NextResponse.json({ base: response.base, data: response.data })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error updating superba cost sp:", error)
        return NextResponse.json(errorBody("Failed to update Superba Cost SP"), { status: 500 })
    }
}

// DELETE /api/v1/finance/superba-cost-sps/[id]
export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params
        const metadata = createMetadataFromRequest(request)
        const response = await getSuperbaCostSpClient().deleteSuperbaCostSp({ id }, metadata)
        return NextResponse.json({ base: response.base })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error deleting superba cost sp:", error)
        return NextResponse.json(errorBody("Failed to delete Superba Cost SP"), { status: 500 })
    }
}
