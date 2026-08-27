// Finance MBHead workflow route - Request unlock (P10)

import { NextRequest, NextResponse } from "next/server"
import { getMBHeadClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"
import { safeUnlockErrorMessage } from "./safe-error-message"

type RouteContext = { params: Promise<{ mbhId: string }> }

// POST /api/v1/finance/mb-heads/[mbhId]/request-unlock
//
// The reason is MANDATORY server-side: the domain rejects an empty or whitespace-only
// value with ErrReasonRequired, and the proto carries min_len = 1. It is forwarded
// verbatim here — ⛔ no client-side default is substituted for a missing one, so an
// empty body still produces the backend's own validation error rather than a silent
// pass.
export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const { mbhId } = await context.params
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getMBHeadClient()
        const response = await client.requestUnlockMBHead({ mbhId, reason: body.reason ?? "" }, metadata)

        return NextResponse.json({
            base: response.base,
            data: response.data,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error requesting MB Head unlock:", error)
        // R19-A: a real (non-gRPC) exception used to be flattened into a bare generic
        // string here, discarding `error.message` entirely — see safe-error-message.ts
        // for why this is scrubbed rather than forwarded verbatim.
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: safeUnlockErrorMessage(error, "Failed to request MB head unlock"),
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
