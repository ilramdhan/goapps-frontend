// Finance Yarn TX Weight group routes - List and Create

import { NextRequest, NextResponse } from "next/server"
import { getYarnTxWeightGroupClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"
import { toYarnTxWeightGroupRequestBody } from "@/types/finance/yarn-tx-weight"

// GET /api/v1/finance/yarn-tx-weight-groups - List TX weight configs
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const metadata = createMetadataFromRequest(request)
        const client = getYarnTxWeightGroupClient()

        const response = await client.listYarnTxWeightGroups(
            {
                page: Number(searchParams.get("page")) || 1,
                pageSize: Math.min(Number(searchParams.get("pageSize") || searchParams.get("page_size")) || 10, 100),
                search: searchParams.get("search") || "",
                productTypeId: Number(searchParams.get("productTypeId") || searchParams.get("product_type_id")) || 0,
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
        console.error("Error fetching TX weight configs:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to fetch TX weight configs",
                    validationErrors: [],
                },
                data: [],
                pagination: { currentPage: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
            },
            { status: 500 }
        )
    }
}

// POST /api/v1/finance/yarn-tx-weight-groups - Create TX weight config
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getYarnTxWeightGroupClient()
        const response = await client.createYarnTxWeightGroup(toYarnTxWeightGroupRequestBody(body), metadata)

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error creating TX weight config:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to create TX weight config",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
