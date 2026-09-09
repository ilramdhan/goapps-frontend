import { NextRequest, NextResponse } from "next/server"
import { getCostRouteClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"
import { DuplicateRouteTargetMode } from "@/types/generated/finance/v1/cost_route"

function toTargetMode(value: unknown): DuplicateRouteTargetMode {
  if (value === "SAME_PRODUCT" || value === DuplicateRouteTargetMode.DUPLICATE_ROUTE_TARGET_MODE_SAME_PRODUCT) {
    return DuplicateRouteTargetMode.DUPLICATE_ROUTE_TARGET_MODE_SAME_PRODUCT
  }
  return DuplicateRouteTargetMode.DUPLICATE_ROUTE_TARGET_MODE_NEW_PRODUCT
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ headId: string }> }) {
  try {
    const { headId } = await params
    const body = await request.json()
    const metadata = createMetadataFromRequest(request)
    const client = getCostRouteClient()
    const response = await client.duplicateRoute(
      {
        headId: Number(headId),
        includeRouting: !!body.includeRouting,
        includeUpstream: !!body.includeUpstream,
        includeApplicability: !!body.includeApplicability,
        includeValues: !!body.includeValues,
        newCodePrefix: String(body.newCodePrefix ?? ""),
        linkedRequestId: Number(body.linkedRequestId ?? 0),
        targetMode: toTargetMode(body.targetMode),
      },
      metadata,
    )
    return NextResponse.json({
      base: response.base,
      newHeadId: String(response.newHeadId ?? 0),
      newProductSysId: String(response.newProductSysId ?? 0),
      newProductCode: response.newProductCode ?? "",
    })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    return NextResponse.json(
      { base: { isSuccess: false, statusCode: "500", message: "Failed to duplicate route", validationErrors: [] } },
      { status: 500 },
    )
  }
}
