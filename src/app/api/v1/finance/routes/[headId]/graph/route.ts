// GET / POST graph for a route head.
import { NextRequest, NextResponse } from "next/server"
import { getCostRouteClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"
import { normalizeGraphForSave } from "@/lib/finance/route-graph-save"

export async function GET(request: NextRequest, { params }: { params: Promise<{ headId: string }> }) {
  try {
    const { headId } = await params
    const { searchParams } = new URL(request.url)
    const includeNestedMb = searchParams.get("includeNestedMb") === "true"
    const metadata = createMetadataFromRequest(request)
    const client = getCostRouteClient()
    const response = await client.getRouteGraph({ headId: Number(headId), includeNestedMb }, metadata)
    return NextResponse.json({ base: response.base, data: response.data })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    return NextResponse.json(
      { base: { isSuccess: false, statusCode: "500", message: "Failed to load route graph", validationErrors: [] } },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ headId: string }> }) {
  try {
    const { headId } = await params
    const body = await request.json()
    const metadata = createMetadataFromRequest(request)
    const client = getCostRouteClient()
    const response = await client.saveRouteGraph(
      { headId: Number(headId), graph: normalizeGraphForSave(body.graph) as never },
      metadata,
    )
    return NextResponse.json({ base: response.base, data: response.data })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    return NextResponse.json(
      { base: { isSuccess: false, statusCode: "500", message: "Failed to save route graph", validationErrors: [] } },
      { status: 500 },
    )
  }
}
