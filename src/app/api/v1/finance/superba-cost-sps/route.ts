// Finance Superba Cost SP routes - List and Create

import { NextRequest, NextResponse } from "next/server"
import { getSuperbaCostSpClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

/** Forward an optional numeric field only when actually provided. */
function optionalNumber(value: unknown): number | undefined {
    if (value === undefined || value === null || value === "") return undefined
    const parsed = Number(value)
    return Number.isNaN(parsed) ? undefined : parsed
}

// GET /api/v1/finance/superba-cost-sps
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const metadata = createMetadataFromRequest(request)
        const client = getSuperbaCostSpClient()

        const response = await client.listSuperbaCostSps(
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
            lastSyncedAt: response.lastSyncedAt,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error fetching superba cost sps:", error)
        return NextResponse.json(
            {
                base: { isSuccess: false, statusCode: "500", message: "Failed to fetch Superba Cost SPs", validationErrors: [] },
                data: [],
                pagination: { currentPage: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
            },
            { status: 500 }
        )
    }
}

// POST /api/v1/finance/superba-cost-sps - Create (MANUAL source)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getSuperbaCostSpClient()

        const response = await client.createSuperbaCostSp(
            {
                legacySysId: Number(body.legacySysId ?? body.legacy_sys_id) || 0,
                shadeCode: body.shadeCode ?? body.shade_code ?? "",
                colourName: body.colourName ?? body.colour_name ?? "",
                oldValue: Number(body.oldValue ?? body.old_value) || 0,
                newValue: optionalNumber(body.newValue ?? body.new_value),
                isActive: body.isActive ?? body.is_active ?? true,
            },
            metadata
        )

        return NextResponse.json({ base: response.base, data: response.data })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error creating superba cost sp:", error)
        return NextResponse.json(
            { base: { isSuccess: false, statusCode: "500", message: "Failed to create Superba Cost SP", validationErrors: [] } },
            { status: 500 }
        )
    }
}
