import { NextRequest, NextResponse } from "next/server"
import { getCostProductRequestClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

export async function POST(request: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    const { requestId } = await params
    const body = await request.json()
    const metadata = createMetadataFromRequest(request)
    const client = getCostProductRequestClient()
    const response = await client.submitAndDecideCostProductRequest({
      requestId: Number(requestId),
      verifiedClassification: body.verifiedClassification || body.verified_classification,
      overrideReason: body.overrideReason || body.override_reason || "",
      decision: body.decision,
      note: body.note || "",
      referenceProductHeadId: body.referenceProductHeadId || body.reference_product_head_id || 0,
    }, metadata)
    return NextResponse.json({ base: response.base, data: response.data })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    return NextResponse.json({ base: { isSuccess: false, statusCode: "500", message: "Failed to submit and decide", validationErrors: [] } }, { status: 500 })
  }
}
