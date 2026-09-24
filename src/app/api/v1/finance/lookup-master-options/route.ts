import { type NextRequest, NextResponse } from "next/server"
import { createMetadataFromRequest, isGrpcError, handleGrpcError, getLookupMasterClient } from "@/lib/grpc"

// ⭐ DIPERBARUI 2026-08-26 (perf: SP Code dropdown lag, server-side search) —
// accepts optional `search` and `limit` query params and forwards them to the
// ListMasterOptions RPC so filtering/paging happens server-side instead of
// pulling the whole table (see lookup_master_repository.go). Both are
// omitted from the RPC request when absent, which the backend treats
// identically to the pre-change behavior (no search predicate, default
// LIMIT).
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const masterCode = searchParams.get("masterCode") ?? ""
    if (!masterCode) {
      return NextResponse.json(
        { base: { isSuccess: false, statusCode: "400", message: "masterCode required", validationErrors: [] } },
        { status: 400 },
      )
    }
    const search = searchParams.get("search")
    const limitParam = searchParams.get("limit")
    const limit = limitParam !== null ? Number(limitParam) : undefined
    // ⭐ DIPERBARUI 2026-09-24 (oil-cost-rm-group, D11) — optional product
    // filter, currently honored server-side only for RM_GROUP_OIL.
    const productSysIdParam = searchParams.get("productSysId")
    const productSysId = productSysIdParam !== null ? Number(productSysIdParam) : undefined

    const metadata = createMetadataFromRequest(request)
    const response = await getLookupMasterClient().listMasterOptions(
      {
        masterCode,
        ...(search ? { search } : {}),
        ...(limit !== undefined && Number.isFinite(limit) ? { limit } : {}),
        ...(productSysId !== undefined && Number.isFinite(productSysId) ? { productSysId } : {}),
      },
      metadata,
    )
    return NextResponse.json({ base: response.base, data: response.data })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    return NextResponse.json(
      { base: { isSuccess: false, statusCode: "500", message: "Internal error", validationErrors: [] } },
      { status: 500 },
    )
  }
}
