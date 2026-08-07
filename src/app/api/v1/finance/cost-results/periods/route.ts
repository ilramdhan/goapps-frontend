// CostCalc — list distinct periods that have calculated cost results (GET).
import { NextRequest, NextResponse } from "next/server"
import { getCostCalcClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

export async function GET(request: NextRequest) {
  try {
    const metadata = createMetadataFromRequest(request)
    const client = getCostCalcClient()
    const response = await client.listCostResultPeriods({}, metadata)

    return NextResponse.json({
      base: response.base,
      data: { periods: response.periods || [] },
    })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    return NextResponse.json(
      {
        base: { isSuccess: false, statusCode: "500", message: "Failed to list cost result periods", validationErrors: [] },
        data: { periods: [] },
      },
      { status: 500 },
    )
  }
}
