// CostProductRequest — get + update. Mirrors the create route's int32-undefined defense.
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

export async function GET(request: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    const { requestId } = await params
    const metadata = createMetadataFromRequest(request)
    const client = getCostProductRequestClient()
    const response = await client.getCostProductRequest({ requestId: Number(requestId) }, metadata)
    return NextResponse.json({ base: response.base, data: response.data })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    return NextResponse.json({ base: { isSuccess: false, statusCode: "500", message: "Failed to get product request", validationErrors: [] } }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    const { requestId } = await params
    const body = await request.json()
    const metadata = createMetadataFromRequest(request)
    const client = getCostProductRequestClient()
    const response = await client.updateCostProductRequest(
      {
        requestId: Number(requestId),
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
    return NextResponse.json({ base: { isSuccess: false, statusCode: "500", message: "Failed to update product request", validationErrors: [] } }, { status: 500 })
  }
}
