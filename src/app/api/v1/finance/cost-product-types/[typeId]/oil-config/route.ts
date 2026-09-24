// CostProductType oil config — get + set (oil class + allowed RM groups, D10).
//
// NOTE: this lives under the existing `[typeId]` dynamic segment (not `[id]`,
// even though the plan named it that) — Next.js requires every route at the
// same path position to share one dynamic slug name, and the sibling
// `cost-product-types/[typeId]/route.ts` already claims `typeId` here.
import { NextRequest, NextResponse } from "next/server"
import { getCostProductTypeClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

export async function GET(request: NextRequest, { params }: { params: Promise<{ typeId: string }> }) {
  try {
    const { typeId } = await params
    const metadata = createMetadataFromRequest(request)
    const client = getCostProductTypeClient()
    const response = await client.getCostProductTypeOilConfig({ typeId: Number(typeId) }, metadata)
    return NextResponse.json({ base: response.base, data: { typeId: response.typeId, oilClass: response.oilClass, groups: response.groups } })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    return NextResponse.json(
      { base: { isSuccess: false, statusCode: "500", message: "Failed to get oil config", validationErrors: [] } },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ typeId: string }> }) {
  try {
    const { typeId } = await params
    const body = await request.json()
    const metadata = createMetadataFromRequest(request)
    const client = getCostProductTypeClient()
    const response = await client.setCostProductTypeOilConfig(
      { typeId: Number(typeId), oilClass: body.oilClass ?? "", groups: body.groups ?? [] },
      metadata,
    )
    return NextResponse.json({ base: response.base, data: { typeId: response.typeId, oilClass: response.oilClass, groups: response.groups } })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    return NextResponse.json(
      { base: { isSuccess: false, statusCode: "500", message: "Failed to save oil config", validationErrors: [] } },
      { status: 500 },
    )
  }
}
