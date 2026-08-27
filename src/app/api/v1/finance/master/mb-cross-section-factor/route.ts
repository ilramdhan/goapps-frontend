// Finance MbCrossSectionFactor routes - List and Create.
// Each row is an ORDERED (from_code -> to_code) conversion factor; the
// operation carries the arithmetic direction and is not derivable from the
// factor alone, so both directions are stored as separate rows.

import { NextRequest, NextResponse } from "next/server"
import {
    getMbCrossSectionFactorClient,
    createMetadataFromRequest,
    isGrpcError,
    handleGrpcError,
} from "@/lib/grpc"

// GET /api/v1/finance/master/mb-cross-section-factor - List conversion factors
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const metadata = createMetadataFromRequest(request)
        const client = getMbCrossSectionFactorClient()

        const response = await client.listMbCrossSectionFactor(
            {
                page: Number(searchParams.get("page")) || 1,
                pageSize: Number(searchParams.get("pageSize") || searchParams.get("page_size")) || 10,
                search: searchParams.get("search") || "",
                sortBy: searchParams.get("sortBy") || searchParams.get("sort_by") || "",
                sortDir: searchParams.get("sortDir") || searchParams.get("sort_dir") || "",
                activeFilter: Number(searchParams.get("activeFilter") || searchParams.get("active_filter")) || 0,
                fromCode: searchParams.get("fromCode") || searchParams.get("from_code") || "",
                toCode: searchParams.get("toCode") || searchParams.get("to_code") || "",
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
        console.error("Error fetching MB Cross Section Factor list:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to fetch MB cross section factor list",
                    validationErrors: [],
                },
                data: [],
                pagination: { currentPage: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
            },
            { status: 500 }
        )
    }
}

// POST /api/v1/finance/master/mb-cross-section-factor - Create conversion factor
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getMbCrossSectionFactorClient()
        const response = await client.createMbCrossSectionFactor(body, metadata)

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error creating MB Cross Section Factor:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to create MB cross section factor",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
