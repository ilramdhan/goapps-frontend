// CostProductRequest — list + create.
// Normalizes int32 fields to 0 (never undefined) before forwarding to gRPC —
// ts-proto refuses to serialize `undefined` for non-optional int32.
import { NextRequest, NextResponse } from "next/server"
import { getCostProductRequestClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type SpecBody = {
  rawMaterialType?: string
  productDescription?: string
  shadeId?: number | string
  shadeCode?: string
  shadeName?: string
  paperTubeTypeId?: number | string
  tubeType?: number
  weightPerBobbinKg?: string
  boxType?: string
}

function normalizeSpec(spec: SpecBody | undefined | null) {
  if (!spec) return undefined
  return {
    rawMaterialType: spec.rawMaterialType ?? "",
    productDescription: spec.productDescription ?? "",
    shadeId: Number(spec.shadeId ?? 0) || 0,
    shadeCode: spec.shadeCode ?? "",
    shadeName: spec.shadeName ?? "",
    paperTubeTypeId: Number(spec.paperTubeTypeId ?? 0) || 0,
    tubeType: Number(spec.tubeType ?? 0) || 0,
    weightPerBobbinKg: spec.weightPerBobbinKg ?? "",
    boxType: spec.boxType ?? "",
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const metadata = createMetadataFromRequest(request)
    const client = getCostProductRequestClient()
    const response = await client.listCostProductRequests(
      {
        search: searchParams.get("search") || "",
        status: searchParams.get("status") || "",
        requestTypeId: Number(searchParams.get("requestTypeId") || searchParams.get("request_type_id")) || 0,
        requesterUserId: searchParams.get("requesterUserId") || searchParams.get("requester_user_id") || "",
        assigneeUserId: searchParams.get("assigneeUserId") || searchParams.get("assignee_user_id") || "",
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
    return NextResponse.json({ base: { isSuccess: false, statusCode: "500", message: "Failed to list product requests", validationErrors: [] }, data: [] }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const metadata = createMetadataFromRequest(request)
    const client = getCostProductRequestClient()
    const response = await client.createCostProductRequest(
      {
        requestTypeId: Number(body.requestTypeId ?? body.request_type_id ?? 0) || 0,
        title: body.title ?? "",
        description: body.description ?? "",
        customerName: body.customerName ?? body.customer_name ?? "",
        customerCode: body.customerCode ?? body.customer_code ?? "",
        productClassification: body.productClassification ?? body.product_classification ?? "existing",
        targetVolume: body.targetVolume ?? body.target_volume ?? "",
        targetPriceRange: body.targetPriceRange ?? body.target_price_range ?? "",
        urgencyLevel: body.urgencyLevel ?? body.urgency_level ?? "",
        neededByDate: body.neededByDate ?? body.needed_by_date ?? "",
        spec: normalizeSpec(body.spec),
        referenceProductSysId: Number(body.referenceProductSysId ?? body.reference_product_sys_id ?? 0) || 0,
      },
      metadata,
    )
    return NextResponse.json({ base: response.base, data: response.data })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    return NextResponse.json({ base: { isSuccess: false, statusCode: "500", message: "Failed to create product request", validationErrors: [] } }, { status: 500 })
  }
}
