// BI ETL status — read-only last-run status of ETL_HR_* jobs (HD-27, finance.bi.etlstatus.view).

import { NextRequest, NextResponse } from "next/server"
import { getBiJobClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

export async function GET(request: NextRequest) {
  try {
    const metadata = createMetadataFromRequest(request)
    const client = getBiJobClient()
    const response = await client.getEtlStatus({}, metadata)
    return NextResponse.json({ base: response.base, data: response.data })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    console.error("Get BI ETL status error:", error)
    return NextResponse.json(
      { base: { isSuccess: false, statusCode: "500", message: "Failed to get ETL status", validationErrors: [] }, data: [] },
      { status: 500 }
    )
  }
}
