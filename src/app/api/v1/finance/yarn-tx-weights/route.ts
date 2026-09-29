// Finance Yarn TX Weight master routes - List and Create

import { NextRequest, NextResponse } from "next/server"
import { getYarnTxWeightClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"
import {
  gradeCodeToEnum,
  modeCodeToEnum,
  toGradeCode,
  toModeCode,
} from "@/types/finance/yarn-tx-weight"

// GET /api/v1/finance/yarn-tx-weights - List TX weight rules
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const metadata = createMetadataFromRequest(request)
        const client = getYarnTxWeightClient()

        const response = await client.listYarnTxWeights(
            {
                page: Number(searchParams.get("page")) || 1,
                pageSize: Math.min(Number(searchParams.get("pageSize") || searchParams.get("page_size")) || 100, 100),
                search: searchParams.get("search") || "",
                productTypeId: Number(searchParams.get("productTypeId") || searchParams.get("product_type_id")) || 0,
                grade: gradeCodeToEnum(toGradeCode(searchParams.get("grade") || "")),
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
        console.error("Error fetching TX weight list:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to fetch TX weight list",
                    validationErrors: [],
                },
                data: [],
                pagination: { currentPage: 1, pageSize: 100, totalItems: 0, totalPages: 0 },
            },
            { status: 500 }
        )
    }
}

// POST /api/v1/finance/yarn-tx-weights - Create TX weight rule
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getYarnTxWeightClient()
        const response = await client.createYarnTxWeight(
            {
                productTypeId: Number(body.productTypeId ?? body.product_type_id) || 0,
                grade: gradeCodeToEnum(toGradeCode(body.grade)),
                mode: modeCodeToEnum(toModeCode(body.mode)),
                value: Number(body.value ?? 0),
                description: body.description ?? "",
            },
            metadata
        )

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error creating TX weight:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to create TX weight",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
