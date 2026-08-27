// Finance Shade routes - List and Create

import { NextRequest, NextResponse } from "next/server"
import { getShadeClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

// GET /api/v1/finance/shades - List Shades with filters
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const metadata = createMetadataFromRequest(request)
        const client = getShadeClient()

        const response = await client.listShades(
            {
                page: Number(searchParams.get("page")) || 1,
                pageSize: Number(searchParams.get("pageSize") || searchParams.get("page_size")) || 10,
                search: searchParams.get("search") || "",
                activeFilter: Number(searchParams.get("activeFilter") || searchParams.get("active_filter")) || 0,
                sourceFilter: searchParams.get("sourceFilter") || searchParams.get("source_filter") || "",
                sortBy: searchParams.get("sortBy") || searchParams.get("sort_by") || "",
                sortOrder: searchParams.get("sortOrder") || searchParams.get("sort_order") || "",
            },
            metadata
        )

        return NextResponse.json({
            base: response.base,
            data: response.data,
            pagination: response.pagination,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error fetching shades:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to fetch shades",
                    validationErrors: [],
                },
                data: [],
                pagination: { currentPage: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
            },
            { status: 500 }
        )
    }
}

// POST /api/v1/finance/shades - Create Shade (hand-authored, MANUAL source)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getShadeClient()

        const response = await client.createShade(body, metadata)

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error creating shade:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to create shade",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
