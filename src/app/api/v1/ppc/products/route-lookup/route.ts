import { NextRequest, NextResponse } from "next/server"
import { getCostMasterLookupClient, createInternalMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

// Released route projection for a product (finance cost_route_head). PPC WO
// generation snapshots this head + version. Fed by the route picker.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productSysId = Number(searchParams.get("productSysId") || searchParams.get("product_sys_id")) || 0
    const metadata = createInternalMetadataFromRequest(request)
    const client = getCostMasterLookupClient()
    const response = await client.getProductRouteForPPC({ productSysId }, metadata)
    return NextResponse.json({ base: response.base, data: response.data })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    console.error("Failed to get PPC product route", error)
    return NextResponse.json(
      { base: { isSuccess: false, statusCode: "500", message: "Failed to get PPC product route", validationErrors: [] } },
      { status: 500 }
    )
  }
}
