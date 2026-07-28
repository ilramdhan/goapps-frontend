import { NextRequest, NextResponse } from "next/server"
import { getCostMasterLookupClient, createInternalMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

// Product picker source for PPC — proxies finance CostMasterLookupService's
// PPC projection (item / grade / shade). Read-only; PPC never mutates masters.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const metadata = createInternalMetadataFromRequest(request)
    const client = getCostMasterLookupClient()
    const response = await client.listCostProductMasterForPPC(
      {
        page: Number(searchParams.get("page")) || 1,
        pageSize: Number(searchParams.get("pageSize") || searchParams.get("page_size")) || 50,
        search: searchParams.get("search") || "",
        productTypeId: Number(searchParams.get("productTypeId") || searchParams.get("product_type_id")) || 0,
        shadeCode: searchParams.get("shadeCode") || searchParams.get("shade_code") || "",
        activeFilter: searchParams.get("activeFilter") || searchParams.get("active_filter") || "active",
      },
      metadata
    )
    return NextResponse.json({ base: response.base, data: response.data, pagination: response.pagination })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    console.error("Failed to list PPC products", error)
    return NextResponse.json(
      { base: { isSuccess: false, statusCode: "500", message: "Failed to list PPC products", validationErrors: [] }, data: [] },
      { status: 500 }
    )
  }
}
