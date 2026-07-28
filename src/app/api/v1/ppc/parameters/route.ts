import { NextRequest, NextResponse } from "next/server"
import { getCostMasterLookupClient, createInternalMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

// Parameter picker source for PPC — proxies finance CostMasterLookupService's
// mst_parameter projection (param definitions). Read-only; the WO/product-machine
// parameter forms pick a param_id from here instead of typing a raw UUID.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const metadata = createInternalMetadataFromRequest(request)
    const client = getCostMasterLookupClient()
    const response = await client.listProductParametersForPPC(
      {
        page: Number(searchParams.get("page")) || 1,
        pageSize: Number(searchParams.get("pageSize") || searchParams.get("page_size")) || 100,
        search: searchParams.get("search") || "",
        displayGroup: searchParams.get("displayGroup") || searchParams.get("display_group") || "",
        activeFilter: searchParams.get("activeFilter") || searchParams.get("active_filter") || "active",
      },
      metadata
    )
    return NextResponse.json({ base: response.base, data: response.data, pagination: response.pagination })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    console.error("Failed to list PPC parameters", error)
    return NextResponse.json(
      { base: { isSuccess: false, statusCode: "500", message: "Failed to list PPC parameters", validationErrors: [] }, data: [] },
      { status: 500 }
    )
  }
}
