// GET /api/v1/finance/cost-results/exports — paginated, newest-first history
// of recent product cost sheet export jobs (standalone jobs and batch
// parents; batch children never appear on their own), optionally filtered by
// period. Lets users find past exports without relying on a one-time
// notification link.

import { NextRequest, NextResponse } from "next/server"
import { getCostCalcClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const metadata = createMetadataFromRequest(request)
    const client = getCostCalcClient()

    const response = await client.listExportJobs(
      {
        pagination: {
          page: Number(sp.get("page")) || 1,
          pageSize: Number(sp.get("pageSize")) || 20,
        },
        period: sp.get("period") || "",
      },
      metadata,
    )

    return NextResponse.json({
      base: response.base,
      data: response.jobs,
      pagination: response.pagination
        ? {
            currentPage: response.pagination.currentPage,
            pageSize: response.pagination.pageSize,
            totalItems: String(response.pagination.totalItems ?? 0),
            totalPages: response.pagination.totalPages,
          }
        : undefined,
    })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    return NextResponse.json(
      { base: { isSuccess: false, statusCode: "500", message: "Failed to list export jobs", validationErrors: [] }, data: [] },
      { status: 500 },
    )
  }
}
