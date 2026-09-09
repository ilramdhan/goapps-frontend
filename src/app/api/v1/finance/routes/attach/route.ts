// CostRoute — AttachRoute (F3): copies an existing route's full graph onto a
// different (target) product, reusing the same upstream products as the
// source. See docs/superpowers/specs/2026-09-08-product-route-fork-attach-bulk-design.md §3.
//
// Note: the backend never returns a gRPC error for the "target already has a
// live route" case -- it returns Base{isSuccess:false, statusCode:"409"} with
// a nil error (see cost_route_handler.go AttachRoute + routeErrToBase), so
// this route always responds 200 and lets the caller inspect `base` --
// mirroring the pattern used by /routes/[headId]/duplicate.
import { NextRequest, NextResponse } from "next/server"
import { getCostRouteClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const metadata = createMetadataFromRequest(request)
    const client = getCostRouteClient()
    const response = await client.attachRoute(
      {
        sourceHeadId: Number(body.sourceHeadId ?? 0),
        targetProductSysId: Number(body.targetProductSysId ?? 0),
        linkedRequestId: Number(body.linkedRequestId ?? 0),
      },
      metadata,
    )
    return NextResponse.json({
      base: response.base,
      newHeadId: String(response.newHeadId ?? 0),
    })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    return NextResponse.json(
      { base: { isSuccess: false, statusCode: "500", message: "Failed to attach route", validationErrors: [] } },
      { status: 500 },
    )
  }
}
