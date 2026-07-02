// CostProductMaster — list + create (auto-generated product_code).
import { NextRequest, NextResponse } from "next/server"
import { getCostProductMasterClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

/** Parses a CSV of product type ids (e.g. "1,2,3") into a positive-int array; empty = no filter. */
function parseProductTypeIds(raw: string): number[] {
  return raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const metadata = createMetadataFromRequest(request)
    const client = getCostProductMasterClient()
    const response = await client.listCostProductMasters(
      {
        search: searchParams.get("search") || "",
        productTypeId: Number(searchParams.get("productTypeId") || searchParams.get("product_type_id")) || 0,
        // Multi-select type filter — unioned with the legacy single productTypeId server-side.
        productTypeIds: parseProductTypeIds(
          searchParams.get("productTypeIds") || searchParams.get("product_type_ids") || "",
        ),
        shadeCode: searchParams.get("shadeCode") || searchParams.get("shade_code") || "",
        activeFilter: searchParams.get("activeFilter") || searchParams.get("active_filter") || "",
        sortBy: searchParams.get("sortBy") || searchParams.get("sort_by") || "",
        sortOrder: searchParams.get("sortOrder") || searchParams.get("sort_order") || "",
        pagination: {
          page: Number(searchParams.get("page")) || 1,
          pageSize: Number(searchParams.get("pageSize") || searchParams.get("page_size")) || 20,
        },
      },
      metadata,
    )
    return NextResponse.json({ base: response.base, data: response.data, pagination: response.pagination })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    return NextResponse.json({ base: { isSuccess: false, statusCode: "500", message: "Failed to list cost product masters", validationErrors: [] }, data: [] }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const metadata = createMetadataFromRequest(request)
    const client = getCostProductMasterClient()
    const response = await client.createCostProductMaster(body, metadata)
    return NextResponse.json({ base: response.base, data: response.data })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    return NextResponse.json({ base: { isSuccess: false, statusCode: "500", message: "Failed to create cost product master", validationErrors: [] } }, { status: 500 })
  }
}
