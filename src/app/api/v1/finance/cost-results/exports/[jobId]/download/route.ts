// GET /api/v1/finance/cost-results/exports/{jobId}/download — redirect to a
// presigned MinIO URL for a finished product cost sheet export.
//
// GetProductCostSheetDownloadURL verifies job ownership and COMPLETED status
// server-side before presigning, so this route only translates the envelope.

import { NextRequest, NextResponse } from "next/server"
import { getCostCalcClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type Ctx = { params: Promise<{ jobId: string }> }

export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const { jobId } = await ctx.params
    const metadata = createMetadataFromRequest(request)
    const client = getCostCalcClient()

    const response = await client.getProductCostSheetDownloadURL({ jobId }, metadata)
    if (response.base?.isSuccess === false) {
      return NextResponse.json(
        { base: response.base },
        { status: Number(response.base?.statusCode ?? "400") || 400 },
      )
    }
    const url = response.data?.url ?? ""
    if (!url) {
      return NextResponse.json(
        {
          base: {
            isSuccess: false,
            statusCode: "404",
            message: "Download URL unavailable",
            validationErrors: [],
          },
        },
        { status: 404 },
      )
    }
    return NextResponse.redirect(url, { status: 302 })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    return NextResponse.json(
      {
        base: {
          isSuccess: false,
          statusCode: "500",
          message: "Failed to resolve download URL",
          validationErrors: [],
        },
      },
      { status: 500 },
    )
  }
}
