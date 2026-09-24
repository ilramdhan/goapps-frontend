// Finance RM Group routes - List and Create

import { NextRequest, NextResponse } from "next/server"
import { getRmGroupClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const metadata = createMetadataFromRequest(request)
    const client = getRmGroupClient()

    const isOilGroupParam = searchParams.get("isOilGroup") ?? searchParams.get("is_oil_group")

    const response = await client.listRMGroups(
      {
        page: Number(searchParams.get("page")) || 1,
        pageSize: Number(searchParams.get("pageSize") || searchParams.get("page_size")) || 10,
        search: searchParams.get("search") || "",
        activeFilter: Number(searchParams.get("activeFilter") || searchParams.get("active_filter")) || 0,
        sortBy: searchParams.get("sortBy") || searchParams.get("sort_by") || "",
        sortOrder: searchParams.get("sortOrder") || searchParams.get("sort_order") || "",
        ...(isOilGroupParam !== null ? { isOilGroup: isOilGroupParam === "true" } : {}),
      },
      metadata
    )

    // Explicitly serialize to ensure correct JSON output
    // Proto objects may have non-enumerable properties that NextResponse.json() doesn't handle
    const data = (response.data || []).map((item) => ({
      groupHeadId: item.groupHeadId || "",
      groupCode: item.groupCode || "",
      groupName: item.groupName || "",
      description: item.description || "",
      colourant: item.colourant || "",
      ciName: item.ciName || "",
      costPercentage: item.costPercentage ?? 0,
      costPerKg: item.costPerKg ?? 0,
      flagValuation: item.flagValuation ?? 0,
      flagMarketing: item.flagMarketing ?? 0,
      flagSimulation: item.flagSimulation ?? 0,
      initValValuation: item.initValValuation ?? undefined,
      initValMarketing: item.initValMarketing ?? undefined,
      initValSimulation: item.initValSimulation ?? undefined,
      isActive: item.isActive ?? true,
      marketingFreightRate: item.marketingFreightRate ?? undefined,
      marketingAntiDumpingPct: item.marketingAntiDumpingPct ?? undefined,
      marketingDefaultValue: item.marketingDefaultValue ?? undefined,
      valuationFlag: item.valuationFlag ?? 0,
      marketingFlag: item.marketingFlag ?? 0,
      isOilGroup: item.isOilGroup ?? false,
      audit: item.audit
        ? {
            createdAt: item.audit.createdAt || "",
            createdBy: item.audit.createdBy || "",
            updatedAt: item.audit.updatedAt || "",
            updatedBy: item.audit.updatedBy || "",
          }
        : undefined,
    }))

    const pagination = response.pagination
      ? {
          currentPage: response.pagination.currentPage || 1,
          pageSize: response.pagination.pageSize || 10,
          totalItems: Number(response.pagination.totalItems) || 0,
          totalPages: response.pagination.totalPages || 0,
        }
      : { currentPage: 1, pageSize: 10, totalItems: 0, totalPages: 0 }

    return NextResponse.json({
      base: response.base
        ? {
            isSuccess: response.base.isSuccess ?? false,
            statusCode: response.base.statusCode || "200",
            message: response.base.message || "",
            validationErrors: response.base.validationErrors || [],
          }
        : { isSuccess: true, statusCode: "200", message: "OK", validationErrors: [] },
      data,
      pagination,
    })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    console.error("Error fetching RM Groups:", error)
    return NextResponse.json(
      {
        base: { isSuccess: false, statusCode: "500", message: "Failed to fetch RM groups", validationErrors: [] },
        data: [],
        pagination: { currentPage: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const metadata = createMetadataFromRequest(request)
    const client = getRmGroupClient()
    const response = await client.createRMGroup(body, metadata)

    // Explicitly serialize the created head
    const head = response.data
    const data = head
      ? {
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
          isOilGroup: head.isOilGroup ?? false,
        }
      : undefined

    return NextResponse.json({
      base: response.base
        ? {
            isSuccess: response.base.isSuccess ?? false,
            statusCode: response.base.statusCode || "200",
            message: response.base.message || "",
            validationErrors: response.base.validationErrors || [],
          }
        : { isSuccess: true, statusCode: "200", message: "OK", validationErrors: [] },
      data,
    })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    console.error("Error creating RM Group:", error)
    return NextResponse.json(
      {
        base: { isSuccess: false, statusCode: "500", message: "Failed to create RM group", validationErrors: [] },
      },
      { status: 500 }
    )
  }
}
