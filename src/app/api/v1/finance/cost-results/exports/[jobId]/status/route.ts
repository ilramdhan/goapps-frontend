// GET /api/v1/finance/cost-results/exports/{jobId}/status — poll a
// standalone or batch-parent export job's live status/progress while it is
// still QUEUED or PROCESSING. Works for any job_execution.job_id belonging
// to a product cost sheet export (see CostSheetExportJobInfo.isBatch).

import { NextRequest, NextResponse } from "next/server"
import { getCostCalcClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type Ctx = { params: Promise<{ jobId: string }> }

export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const { jobId } = await ctx.params
    const metadata = createMetadataFromRequest(request)
    const client = getCostCalcClient()

    const response = await client.getProductCostSheetExportJobStatus({ jobId }, metadata)
    if (response.base?.isSuccess === false) {
      return NextResponse.json(
        { base: response.base },
        { status: Number(response.base?.statusCode ?? "400") || 400 },
      )
    }

    return NextResponse.json({
      base: response.base,
      data: {
        jobId: response.jobId,
        jobCode: response.jobCode,
        status: response.status,
        isBatch: response.isBatch,
        totalChildren: response.totalChildren,
        completedChildren: response.completedChildren,
        failedChildren: response.failedChildren,
      },
    })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    return NextResponse.json(
      {
        base: {
          isSuccess: false,
          statusCode: "500",
          message: "Failed to get export job status",
          validationErrors: [],
        },
      },
      { status: 500 },
    )
  }
}
