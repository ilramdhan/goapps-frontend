// GET / POST / DELETE per-product RM denier overrides.
import { NextRequest, NextResponse } from "next/server"
import { getCostProductMasterClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type RouteContext = { params: Promise<{ productSysId: string }> }

function fail(message: string) {
  return NextResponse.json(
    { base: { isSuccess: false, statusCode: "500", message, validationErrors: [] } },
    { status: 500 },
  )
}

const toBool = (v: unknown): boolean => v === true || v === "true"

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { productSysId } = await params
    const metadata = createMetadataFromRequest(request)
    const response = await getCostProductMasterClient().listRMDenierOverrides(
      { productSysId: Number(productSysId) },
      metadata,
    )
    return NextResponse.json({
      base: response.base,
      data: response.data ?? [],
      duplicateProducts: response.duplicateProducts ?? [],
    })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    return fail("Failed to list RM denier overrides")
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { productSysId } = await params
    const body = (await request.json()) as Record<string, unknown>
    const metadata = createMetadataFromRequest(request)
    const response = await getCostProductMasterClient().upsertRMDenierOverride(
      {
        productSysId: Number(productSysId),
        rmType: String(body.rmType ?? ""),
        rmProductSysId: Number(body.rmProductSysId ?? 0) || 0,
        rmGroupCode: String(body.rmGroupCode ?? ""),
        denier: Number(body.denier ?? 0),
        reason: String(body.reason ?? ""),
        applyToDuplicates: toBool(body.applyToDuplicates),
      },
      metadata,
    )
    return NextResponse.json({
      base: response.base,
      data: response.data,
      appliedProductSysIds: response.appliedProductSysIds ?? [],
    })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    return fail("Failed to save RM denier override")
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { productSysId } = await params
    const { searchParams } = new URL(request.url)
    const metadata = createMetadataFromRequest(request)
    const response = await getCostProductMasterClient().deleteRMDenierOverride(
      {
        productSysId: Number(productSysId),
        rmType: searchParams.get("rmType") ?? "",
        rmProductSysId: Number(searchParams.get("rmProductSysId") ?? 0) || 0,
        rmGroupCode: searchParams.get("rmGroupCode") ?? "",
        applyToDuplicates: toBool(searchParams.get("applyToDuplicates")),
      },
      metadata,
    )
    return NextResponse.json({
      base: response.base,
      deletedCount: response.deletedCount ?? 0,
      appliedProductSysIds: response.appliedProductSysIds ?? [],
    })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    return fail("Failed to delete RM denier override")
  }
}
