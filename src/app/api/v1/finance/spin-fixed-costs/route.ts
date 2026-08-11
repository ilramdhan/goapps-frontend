// Finance Spin Fixed Cost routes - List and Create
//
// Spin Fixed Cost holds ONE row per period (YYYYMM): the monthly POY (HOY)
// spinning fixed-cost pool shared by every POY product in the calc engine.

import { NextRequest, NextResponse } from "next/server"
import {
    getSpinFixedCostClient,
    createMetadataFromRequest,
    isGrpcError,
    handleGrpcError,
    grpcErrorToResponse,
    grpcCodeToHttp,
} from "@/lib/grpc"

const EMPTY_PAGINATION = {
    currentPage: 1,
    pageSize: 10,
    totalItems: "0",
    totalPages: 0,
}

/**
 * A live-period unique index guards one row per period. Turn the raw
 * duplicate/constraint error into an instruction the finance user can act on:
 * editing the existing period row is the normal path, not creating a new one.
 */
function isDuplicatePeriodError(message: string): boolean {
    const lower = message.toLowerCase()
    return (
        lower.includes("already exists") ||
        lower.includes("duplicate") ||
        lower.includes("unique constraint") ||
        lower.includes("uniq_") ||
        lower.includes("sqlstate 23505")
    )
}

function duplicatePeriodMessage(period: string): string {
    const label = period ? `Period ${period}` : "That period"
    return `${label} already exists - edit the existing row instead of creating a new one.`
}

// GET /api/v1/finance/spin-fixed-costs
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const metadata = createMetadataFromRequest(request)
        const client = getSpinFixedCostClient()

        const response = await client.listSpinFixedCosts(
            {
                page: Number(searchParams.get("page")) || 1,
                pageSize: Number(searchParams.get("pageSize") || searchParams.get("page_size")) || 10,
                search: searchParams.get("search") || "",
                activeFilter: Number(searchParams.get("activeFilter") || searchParams.get("active_filter")) || 0,
                period: searchParams.get("period") || "",
                sortBy: searchParams.get("sortBy") || searchParams.get("sort_by") || "period",
                sortOrder: searchParams.get("sortOrder") || searchParams.get("sort_order") || "desc",
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
        console.error("Error fetching Spin Fixed Costs:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to fetch spin fixed costs",
                    validationErrors: [],
                },
                data: [],
                pagination: EMPTY_PAGINATION,
            },
            { status: 500 }
        )
    }
}

// POST /api/v1/finance/spin-fixed-costs
export async function POST(request: NextRequest) {
    let period = ""
    try {
        const body = await request.json()
        period = typeof body?.period === "string" ? body.period : ""
        const metadata = createMetadataFromRequest(request)
        const client = getSpinFixedCostClient()

        const response = await client.createSpinFixedCost(
            {
                period,
                commonPoyDenier: Number(body?.commonPoyDenier) || 0,
                poyProduction: Number(body?.poyProduction) || 0,
                spinPowerMonth: Number(body?.spinPowerMonth) || 0,
                spinManpowerMonth: Number(body?.spinManpowerMonth) || 0,
                spinOverheadsMonth: Number(body?.spinOverheadsMonth) || 0,
                spinConssprsMonth: Number(body?.spinConssprsMonth) || 0,
            },
            metadata
        )

        // The backend may also report the duplicate through a non-success base
        // rather than a gRPC error - rewrite it there too.
        if (response.base && !response.base.isSuccess && isDuplicatePeriodError(response.base.message || "")) {
            return NextResponse.json({
                base: { ...response.base, message: duplicatePeriodMessage(period) },
                data: response.data,
            })
        }

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) {
            const mapped = grpcErrorToResponse(error)
            if (isDuplicatePeriodError(mapped.base.message)) {
                mapped.base.message = duplicatePeriodMessage(period)
            }
            return NextResponse.json(mapped, { status: grpcCodeToHttp(error.code) })
        }
        console.error("Error creating Spin Fixed Cost:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to create spin fixed cost",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
