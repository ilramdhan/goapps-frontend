// Finance MbComposition routes - List frozen version snapshots for an MB Head

import { NextRequest, NextResponse } from "next/server"
import { getMbCompositionClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

// GET /api/v1/finance/mb-compositions/versions?mbhId=...&version=...
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const mbhId = searchParams.get("mbhId") || ""
        const version = Number(searchParams.get("version")) || 0
        const metadata = createMetadataFromRequest(request)
        const client = getMbCompositionClient()
        const response = await client.listMbCompositionVersions({ mbhId, version }, metadata)

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error fetching MB composition versions:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to fetch MB composition versions",
                    validationErrors: [],
                },
                data: [],
            },
            { status: 500 }
        )
    }
}
