// Finance MbCrossSection master routes - Get, Update, Delete by ID

import { NextRequest, NextResponse } from "next/server"
import { getMbCrossSectionClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type RouteContext = { params: Promise<{ mbcsId: string }> }

// GET /api/v1/finance/master/mb-cross-section/[mbcsId]
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { mbcsId } = await context.params
        const metadata = createMetadataFromRequest(request)
        const client = getMbCrossSectionClient()
        const response = await client.getMbCrossSection({ mbcsId }, metadata)

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error fetching MB Cross Section:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to fetch MB cross section",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}

// PUT /api/v1/finance/master/mb-cross-section/[mbcsId]
export async function PUT(request: NextRequest, context: RouteContext) {
    try {
        const { mbcsId } = await context.params
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getMbCrossSectionClient()
        const response = await client.updateMbCrossSection({ ...body, mbcsId }, metadata)

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error updating MB Cross Section:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to update MB cross section",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}

// DELETE /api/v1/finance/master/mb-cross-section/[mbcsId]
export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const { mbcsId } = await context.params
        const metadata = createMetadataFromRequest(request)
        const client = getMbCrossSectionClient()
        const response = await client.deleteMbCrossSection({ mbcsId }, metadata)

        return NextResponse.json({
            base: response.base,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error deleting MB Cross Section:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to delete MB cross section",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
