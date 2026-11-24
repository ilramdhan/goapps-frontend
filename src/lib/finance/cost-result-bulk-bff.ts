// Shared BFF handler for cost-result bulk verify / approve (server-only).
import { NextRequest, NextResponse } from "next/server"
import { getCostCalcClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"
import { toCalcType } from "@/lib/grpc/cost-calc-enums"
import type { CostResultBulkSelection } from "@/types/generated/finance/v1/cost_calc"

interface BulkSelectionBody {
  costIds?: unknown
  period?: unknown
  calculationType?: unknown
  search?: unknown
  productTypeIds?: unknown
  shadeCodes?: unknown
  rmGroupCodes?: unknown
}

const str = (v: unknown) => (typeof v === "string" ? v : "")
const strs = (v: unknown) => (Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [])
const ints = (v: unknown) => (Array.isArray(v) ? v.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [])

export function toBulkSelection(body: BulkSelectionBody): CostResultBulkSelection {
  return {
    costIds: ints(body.costIds),
    period: str(body.period),
    calculationType: toCalcType(str(body.calculationType)),
    search: str(body.search),
    productTypeIds: ints(body.productTypeIds),
    shadeCodes: strs(body.shadeCodes),
    rmGroupCodes: strs(body.rmGroupCodes),
  }
}

export async function handleCostResultBulk(request: NextRequest, action: "verify" | "approve") {
  try {
    const body = ((await request.json().catch(() => ({}))) ?? {}) as BulkSelectionBody
    const selection = toBulkSelection(body)
    const metadata = createMetadataFromRequest(request)
    const client = getCostCalcClient()
    const response =
      action === "verify"
        ? await client.bulkVerifyCostResults({ selection }, metadata)
        : await client.bulkApproveCostResults({ selection }, metadata)
    return NextResponse.json({
      base: response.base,
      data: { okCount: response.okCount, failedCount: response.failedCount, failures: response.failures },
    })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    return NextResponse.json(
      { base: { isSuccess: false, statusCode: "500", message: `Failed to bulk ${action} cost results`, validationErrors: [] } },
      { status: 500 },
    )
  }
}
