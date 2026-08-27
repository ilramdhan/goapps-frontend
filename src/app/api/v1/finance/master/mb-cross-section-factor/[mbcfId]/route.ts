// Finance MbCrossSectionFactor routes - Get, Update, Delete by ID

import { NextRequest, NextResponse } from "next/server"
import {
    getMbCrossSectionFactorClient,
    createMetadataFromRequest,
    isGrpcError,
    handleGrpcError,
} from "@/lib/grpc"

type RouteContext = { params: Promise<{ mbcfId: string }> }

// GET /api/v1/finance/master/mb-cross-section-factor/[mbcfId]
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { mbcfId } = await context.params
        const metadata = createMetadataFromRequest(request)
        const client = getMbCrossSectionFactorClient()
        const response = await client.getMbCrossSectionFactor({ mbcfId }, metadata)

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error fetching MB Cross Section Factor:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to fetch MB cross section factor",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}

// PUT /api/v1/finance/master/mb-cross-section-factor/[mbcfId]
export async function PUT(request: NextRequest, context: RouteContext) {
    try {
        const { mbcfId } = await context.params
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getMbCrossSectionFactorClient()
        const response = await client.updateMbCrossSectionFactor({ ...body, mbcfId }, metadata)

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error updating MB Cross Section Factor:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to update MB cross section factor",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}

// DELETE /api/v1/finance/master/mb-cross-section-factor/[mbcfId]
export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const { mbcfId } = await context.params
        const metadata = createMetadataFromRequest(request)
        const client = getMbCrossSectionFactorClient()
        const response = await client.deleteMbCrossSectionFactor({ mbcfId }, metadata)

        return NextResponse.json({
            base: response.base,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error deleting MB Cross Section Factor:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to delete MB cross section factor",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
