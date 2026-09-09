import { NextRequest, NextResponse } from "next/server"
import { getCostProductMasterClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

export async function POST(request: NextRequest, { params }: { params: Promise<{ productSysId: string }> }) {
  try {
    const { productSysId } = await params
    const body = await request.json()
    const metadata = createMetadataFromRequest(request)
    const client = getCostProductMasterClient()
    const response = await client.duplicateProduct(
      {
        productSysId: Number(productSysId),
        newCodePrefix: String(body.newCodePrefix ?? ""),
        copyParams: body.copyParams !== false,
      },
      metadata,
    )
    return NextResponse.json({
      base: response.base,
      newProductSysId: String(response.newProductSysId ?? 0),
      newProductCode: response.newProductCode ?? "",
    })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    return NextResponse.json(
      { base: { isSuccess: false, statusCode: "500", message: "Failed to duplicate product", validationErrors: [] } },
      { status: 500 },
    )
  }
}
