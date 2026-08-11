// Finance Spin Fixed Cost routes - Get, Update, Delete by ID
//
// NOTE: `period` is immutable and is intentionally not forwarded on PUT.
// The backend refuses a delete/deactivate that would leave the calc engine
// with no pool row - that message is passed through verbatim.

import { NextRequest, NextResponse } from "next/server"
import { getSpinFixedCostClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type RouteContext = { params: Promise<{ id: string }> }

/** Only forward a numeric field when the client actually sent a value. */
function optionalNumber(value: unknown): number | undefined {
    if (value === undefined || value === null || value === "") return undefined
    const parsed = Number(value)
    return Number.isNaN(parsed) ? undefined : parsed
}

// GET /api/v1/finance/spin-fixed-costs/[id]
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params
        const metadata = createMetadataFromRequest(request)
        const client = getSpinFixedCostClient()
        const response = await client.getSpinFixedCost({ id }, metadata)

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error fetching Spin Fixed Cost:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to fetch spin fixed cost",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}

// PUT /api/v1/finance/spin-fixed-costs/[id]
export async function PUT(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getSpinFixedCostClient()

        const response = await client.updateSpinFixedCost(
            {
                id,
                commonPoyDenier: optionalNumber(body?.commonPoyDenier),
                poyProduction: optionalNumber(body?.poyProduction),
                spinPowerMonth: optionalNumber(body?.spinPowerMonth),
                spinManpowerMonth: optionalNumber(body?.spinManpowerMonth),
                spinOverheadsMonth: optionalNumber(body?.spinOverheadsMonth),
                spinConssprsMonth: optionalNumber(body?.spinConssprsMonth),
                isActive: typeof body?.isActive === "boolean" ? body.isActive : undefined,
            },
            metadata
        )

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error updating Spin Fixed Cost:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to update spin fixed cost",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}

// DELETE /api/v1/finance/spin-fixed-costs/[id]
export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params
        const metadata = createMetadataFromRequest(request)
        const client = getSpinFixedCostClient()
        const response = await client.deleteSpinFixedCost({ id }, metadata)

        return NextResponse.json({
            base: response.base,
        })
    } catch (error) {
        // Passed through untouched: the backend's "would leave the calc engine
        // with no pool row" refusal must reach the user as written.
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error deleting Spin Fixed Cost:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to delete spin fixed cost",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
