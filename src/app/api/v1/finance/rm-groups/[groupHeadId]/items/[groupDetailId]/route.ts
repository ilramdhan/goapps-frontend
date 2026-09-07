/* eslint-disable @typescript-eslint/no-explicit-any */
// V2: UpdateGroupItem — patches one detail row's V2 valuation fields + sort/active.

import { NextRequest, NextResponse } from "next/server"
import { getRmGroupClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

function serializeBase(base: any) {
  return base
    ? {
        isSuccess: base.isSuccess ?? false,
        statusCode: base.statusCode || "200",
        message: base.message || "",
        validationErrors: base.validationErrors || [],
      }
    : { isSuccess: true, statusCode: "200", message: "OK", validationErrors: [] }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ groupHeadId: string; groupDetailId: string }> },
) {
  try {
    const { groupHeadId, groupDetailId } = await params
    const body = await request.json()
    const metadata = createMetadataFromRequest(request)
    const client = getRmGroupClient()

    const response = await client.updateGroupItem(
      {
        groupHeadId,
        groupDetailId,
        period: body.period,
        valuationFreightRate: body.valuationFreightRate ?? undefined,
        valuationAntiDumpingPct: body.valuationAntiDumpingPct ?? undefined,
        valuationDutyPct: body.valuationDutyPct ?? undefined,
        valuationTransportRate: body.valuationTransportRate ?? undefined,
        valuationDefaultValue: body.valuationDefaultValue ?? undefined,
        sortOrder: body.sortOrder ?? undefined,
        isActive: body.isActive ?? undefined,
        clearValuationFreightRate: body.clearValuationFreightRate ?? false,
        clearValuationAntiDumpingPct: body.clearValuationAntiDumpingPct ?? false,
        clearValuationDutyPct: body.clearValuationDutyPct ?? false,
        clearValuationTransportRate: body.clearValuationTransportRate ?? false,
        clearValuationDefaultValue: body.clearValuationDefaultValue ?? false,
      },
      metadata,
    )

    return NextResponse.json({
      base: serializeBase(response.base),
      data: response.data || null,
    })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    console.error("Error updating group item:", error)
    return NextResponse.json(
      {
        base: { isSuccess: false, statusCode: "500", message: "Failed to update group item", validationErrors: [] },
      },
      { status: 500 },
    )
  }
}
