/* eslint-disable @typescript-eslint/no-explicit-any */
// Finance RM Group routes - Get, Update, Delete by ID

import { NextRequest, NextResponse } from "next/server"
import { getRmGroupClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type RouteContext = { params: Promise<{ groupHeadId: string }> }

// Helper to serialize a RMGroupHead proto object to plain JSON
function serializeHead(head: any) {
  if (!head) return undefined
  return {
    groupHeadId: head.groupHeadId || "",
    groupCode: head.groupCode || "",
    groupName: head.groupName || "",
    description: head.description || "",
    colourant: head.colourant || "",
    ciName: head.ciName || "",
    costPercentage: head.costPercentage ?? 0,
    costPerKg: head.costPerKg ?? 0,
    flagValuation: head.flagValuation ?? 0,
    flagMarketing: head.flagMarketing ?? 0,
    flagSimulation: head.flagSimulation ?? 0,
    initValValuation: head.initValValuation ?? undefined,
    initValMarketing: head.initValMarketing ?? undefined,
    initValSimulation: head.initValSimulation ?? undefined,
    isActive: head.isActive ?? true,
    marketingFreightRate: head.marketingFreightRate ?? undefined,
    marketingAntiDumpingPct: head.marketingAntiDumpingPct ?? undefined,
    marketingDefaultValue: head.marketingDefaultValue ?? undefined,
    valuationFlag: head.valuationFlag ?? 0,
    marketingFlag: head.marketingFlag ?? 0,
    audit: head.audit
      ? {
          createdAt: head.audit.createdAt || "",
          createdBy: head.audit.createdBy || "",
          updatedAt: head.audit.updatedAt || "",
          updatedBy: head.audit.updatedBy || "",
        }
      : undefined,
  }
}

function serializeDetail(detail: any) {
  if (!detail) return undefined
  return {
    groupDetailId: detail.groupDetailId || "",
    groupHeadId: detail.groupHeadId || "",
    itemCode: detail.itemCode || "",
    itemName: detail.itemName || "",
    itemTypeCode: detail.itemTypeCode || "",
    gradeCode: detail.gradeCode || "",
    itemGrade: detail.itemGrade || "",
    uomCode: detail.uomCode || "",
    marketPercentage: detail.marketPercentage ?? undefined,
    marketValueRp: detail.marketValueRp ?? undefined,
    sortOrder: detail.sortOrder ?? 0,
    isActive: detail.isActive ?? true,
    isDummy: detail.isDummy ?? false,
    valuationFreightRate: detail.valuationFreightRate ?? undefined,
    valuationAntiDumpingPct: detail.valuationAntiDumpingPct ?? undefined,
    valuationDutyPct: detail.valuationDutyPct ?? undefined,
    valuationTransportRate: detail.valuationTransportRate ?? undefined,
    valuationDefaultValue: detail.valuationDefaultValue ?? undefined,
    audit: detail.audit
      ? {
          createdAt: detail.audit.createdAt || "",
          createdBy: detail.audit.createdBy || "",
          updatedAt: detail.audit.updatedAt || "",
          updatedBy: detail.audit.updatedBy || "",
        }
      : undefined,
  }
}

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

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { groupHeadId } = await context.params
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || undefined
    const metadata = createMetadataFromRequest(request)
    const client = getRmGroupClient()
    const response = await client.getRMGroup({ groupHeadId, period }, metadata)

    // response.data is RMGroupHeadWithDetails { head, details[] }
    const withDetails = response.data
    const data = withDetails
      ? {
          head: serializeHead(withDetails.head),
          details: (withDetails.details || []).map(serializeDetail),
        }
      : undefined

    return NextResponse.json({ base: serializeBase(response.base), data })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    console.error("Error fetching RM Group:", error)
    return NextResponse.json(
      {
        base: { isSuccess: false, statusCode: "500", message: "Failed to fetch RM group", validationErrors: [] },
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { groupHeadId } = await context.params
    const body = await request.json()
    const metadata = createMetadataFromRequest(request)
    const client = getRmGroupClient()
    // body already carries `period` (required end-to-end per UpdateRMGroupRequest) and is forwarded as-is
    const response = await client.updateRMGroup({ groupHeadId, ...body }, metadata)

    return NextResponse.json({
      base: serializeBase(response.base),
      data: serializeHead(response.data),
    })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    console.error("Error updating RM Group:", error)
    return NextResponse.json(
      {
        base: { isSuccess: false, statusCode: "500", message: "Failed to update RM group", validationErrors: [] },
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { groupHeadId } = await context.params
    const metadata = createMetadataFromRequest(request)
    const client = getRmGroupClient()
    const response = await client.deleteRMGroup({ groupHeadId }, metadata)

    return NextResponse.json({ base: serializeBase(response.base) })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    console.error("Error deleting RM Group:", error)
    return NextResponse.json(
      {
        base: { isSuccess: false, statusCode: "500", message: "Failed to delete RM group", validationErrors: [] },
      },
      { status: 500 }
    )
  }
}
