// POST /api/v1/finance/cost-results/request-export — queue an async product
// cost sheet (A4 xlsx) export job. Mirrors the RM cost export chain: the RPC
// returns a job handle, the worker writes the artifact to MinIO, and the UI
// polls / waits for the notification before hitting the download route.

import { NextRequest, NextResponse } from "next/server"
import { getCostCalcClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"
import { toCalcType, toCostResultStatus } from "@/lib/grpc/cost-calc-enums"

// toIdList coerces a JSON array (or CSV string) of ids into positive numbers,
// dropping anything malformed so a bad payload narrows nothing instead of
// erroring deep inside the gRPC codec.
function toIdList(raw: unknown): number[] {
  const parts = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? raw.split(",")
      : []
  return parts
    .map((v) => Number(typeof v === "string" ? v.trim() : v))
    .filter((n) => Number.isInteger(n) && n > 0)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const metadata = createMetadataFromRequest(request)
    const client = getCostCalcClient()

    const response = await client.requestProductCostSheetExport(
      {
        period: body.period ?? "",
        calculationType: toCalcType(body.calculationType),
        productTypeIds: toIdList(body.productTypeIds),
        search: body.search ?? "",
        status: toCostResultStatus(body.status),
        productSysIds: toIdList(body.productSysIds),
      },
      metadata,
    )

    return NextResponse.json({ base: response.base, data: response.data })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    return NextResponse.json(
      {
        base: {
          isSuccess: false,
          statusCode: "500",
          message: "Failed to queue cost sheet export",
          validationErrors: [],
        },
      },
      { status: 500 },
    )
  }
}
