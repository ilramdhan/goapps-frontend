// Finance MbComposition routes - List by MB Head and Create

import { NextRequest, NextResponse } from "next/server"
import { getMbCompositionClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

// GET /api/v1/finance/mb-compositions?mbhId=...
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const mbhId = searchParams.get("mbhId") || ""
        const metadata = createMetadataFromRequest(request)
        const client = getMbCompositionClient()
        const response = await client.listMbCompositions({ mbhId }, metadata)

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error fetching MB compositions:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to fetch MB compositions",
                    validationErrors: [],
                },
                data: [],
            },
            { status: 500 }
        )
    }
}

// POST /api/v1/finance/mb-compositions - Create composition line
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getMbCompositionClient()
        const response = await client.createMbComposition(body, metadata)

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error creating MB composition:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to create MB composition",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
