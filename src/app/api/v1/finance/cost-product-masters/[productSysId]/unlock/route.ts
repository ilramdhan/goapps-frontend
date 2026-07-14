import { NextRequest, NextResponse } from "next/server"
import { getCostProductMasterClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

export async function POST(request: NextRequest, { params }: { params: Promise<{ productSysId: string }> }) {
  try {
    const { productSysId } = await params
    const body = await request.json().catch(() => ({}))
    const metadata = createMetadataFromRequest(request)
    const client = getCostProductMasterClient()
    const response = await client.unlockCostProductMaster(
      { productSysId: Number(productSysId), reason: body.reason ?? "" },
      metadata
    )
    return NextResponse.json({ base: response.base, data: response.data })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    return NextResponse.json({ base: { isSuccess: false, statusCode: "500", message: "Failed to unlock cost product master", validationErrors: [] } }, { status: 500 })
  }
}
