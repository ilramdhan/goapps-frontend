// GET /api/v1/finance/cost-results/exports/{jobId}/children/{childJobId}/download-url
// — freshly presign one batch child's artifact on demand. The batch-children
// list (see ../../children/route.ts) is fetched once and cached (staleTime:
// Infinity in useExportBatchChildren), so any downloadUrl it carries can be
// stale by the time the user clicks Download (MinIO presigned URLs expire
// after ~5 min). This route re-presigns fresh, every call.

import { NextRequest, NextResponse } from "next/server"
import { getCostCalcClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type Ctx = { params: Promise<{ jobId: string; childJobId: string }> }

export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const { jobId, childJobId } = await ctx.params
    const metadata = createMetadataFromRequest(request)
    const client = getCostCalcClient()

    const response = await client.getBatchChildDownloadUrl(
      { parentJobId: jobId, childJobId },
      metadata,
    )
    if (response.base?.isSuccess === false) {
      return NextResponse.json(
        { base: response.base },
        { status: Number(response.base?.statusCode ?? "400") || 400 },
      )
    }
    if (!response.downloadUrl) {
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

    return NextResponse.json({
      base: response.base,
      data: { downloadUrl: response.downloadUrl, fileName: response.fileName },
    })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    return NextResponse.json(
      {
        base: {
          isSuccess: false,
          statusCode: "500",
          message: "Failed to resolve batch child download URL",
          validationErrors: [],
        },
      },
      { status: 500 },
    )
  }
}
