// Finance MBHead workflow route - Grant unlock (P10)

import { NextRequest, NextResponse } from "next/server"
import { getMBHeadClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type RouteContext = { params: Promise<{ mbhId: string }> }

// POST /api/v1/finance/mb-heads/[mbhId]/grant-unlock
//
// ⛔ GrantUnlockMBHeadRequest carries NO reason field (yarn_master.ts:1997-2001):
// granting is an assent, not a refusal, and the ORIGINAL request reason stays on
// record. The request body is deliberately not read.
export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const { mbhId } = await context.params
        const metadata = createMetadataFromRequest(request)
        const client = getMBHeadClient()
        const response = await client.grantUnlockMBHead({ mbhId }, metadata)

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error granting MB Head unlock:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to grant MB head unlock",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
