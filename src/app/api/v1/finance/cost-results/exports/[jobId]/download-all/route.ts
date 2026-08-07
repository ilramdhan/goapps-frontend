// GET /api/v1/finance/cost-results/exports/{jobId}/download-all — bundle
// every completed child artifact of a batch export job into one zip and
// stream it back as a native browser download.
//
// DownloadExportBatchZip has no BaseResponse envelope on success (see the
// proto comment on DownloadExportBatchZipResponse), so gRPC errors surface
// as thrown errors here rather than an `isSuccess: false` base field.

import { NextRequest, NextResponse } from "next/server"
import { getCostCalcClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type Ctx = { params: Promise<{ jobId: string }> }

export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const { jobId } = await ctx.params
    const metadata = createMetadataFromRequest(request)
    const client = getCostCalcClient()

    const response = await client.downloadExportBatchZip({ parentJobId: jobId }, metadata)
    if (!response.zipData || response.zipData.length === 0) {
      return NextResponse.json(
        {
          base: {
            isSuccess: false,
            statusCode: "404",
            message: "No completed files available to download",
            validationErrors: [],
          },
        },
        { status: 404 },
      )
    }

    const fileName = response.fileName || "cost-sheet-export.zip"
    return new NextResponse(Buffer.from(response.zipData), {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(response.zipData.length),
      },
    })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    return NextResponse.json(
      {
        base: {
          isSuccess: false,
          statusCode: "500",
          message: "Failed to build batch export zip",
          validationErrors: [],
        },
      },
      { status: 500 },
    )
  }
}
