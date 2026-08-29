// POST — batch upsert param values.
import { NextRequest, NextResponse } from "next/server"
import { getCostProductParameterClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

interface UpsertValueInput {
  paramId: string
  valueNumeric?: string
  valueText?: string
  valueFlag?: boolean
  hasValueFlag?: boolean
  // Set when the user picked a specific row from the MB_SPIN candidate
  // picker for an ambiguous entry — forwarded to the backend as-is so it can
  // save this permanent mst_mb_spin.mbs_id directly, bypassing the
  // ambiguity resolver for this save.
  mbSpinIdOverride?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const metadata = createMetadataFromRequest(request)
    const client = getCostProductParameterClient()
    const productSysId = Number(body.productSysId ?? 0)
    const values = (body.values as UpsertValueInput[]).map((v) => ({
      productSysId,
      paramId: v.paramId,
      valueNumeric: v.valueNumeric ?? "",
      valueText: v.valueText ?? "",
      valueFlag: v.valueFlag ?? false,
      hasValueFlag: v.hasValueFlag ?? false,
      mbSpinIdOverride: v.mbSpinIdOverride,
    }))
    const response = await client.upsertProductParamValuesBatch(
      { productSysId, values },
      metadata,
    )
    return NextResponse.json({
      base: response.base,
      upsertedCount: response.upsertedCount,
      failedCount: response.failedCount,
      failedParamCodes: response.failedParamCodes,
    })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    return NextResponse.json(
      { base: { isSuccess: false, statusCode: "500", message: "Failed to upsert", validationErrors: [] } },
      { status: 500 },
    )
  }
}
