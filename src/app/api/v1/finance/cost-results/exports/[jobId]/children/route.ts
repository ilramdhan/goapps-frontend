// GET /api/v1/finance/cost-results/exports/{jobId}/children — enumerate a
// batch-tracking parent export job's child jobs (status + download URL once
// ready). Only meaningful for batch exports (see CostSheetExportJobInfo.isBatch).

import { NextRequest, NextResponse } from "next/server"
import { getCostCalcClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type Ctx = { params: Promise<{ jobId: string }> }

export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const { jobId } = await ctx.params
    const metadata = createMetadataFromRequest(request)
    const client = getCostCalcClient()

    const response = await client.listCostSheetExportBatchChildren({ parentJobId: jobId }, metadata)
    if (response.base?.isSuccess === false) {
      return NextResponse.json(
        { base: response.base },
        { status: Number(response.base?.statusCode ?? "400") || 400 },
      )
    }

    return NextResponse.json({
      base: response.base,
      data: { children: response.children || [] },
    })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    return NextResponse.json(
      {
        base: {
          isSuccess: false,
          statusCode: "500",
          message: "Failed to list export batch children",
          validationErrors: [],
        },
      },
      { status: 500 },
    )
  }
}
