// GET / POST graph for a route head.
import { NextRequest, NextResponse } from "next/server"
import { getCostRouteClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

// ts-proto's BinaryWriter calls writer.int64(value) for every int64 field;
// when value is `undefined`, BigInt(undefined) throws. Browser-side normalizer
// uses optional types (e.g. CostRouteRm.rmProductSysId?: number → undefined for
// ITEM/GROUP RMs that have no upstream product). Backfill all int64 fields to
// 0 here so the proto encoder sees concrete numbers.
type RawObj = Record<string, unknown>
function n0(v: unknown): number {
  if (v === undefined || v === null || v === "") return 0
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}
// A row is display-only/synthetic (spliced in by the backend's
// NestedMBFlattener for GET ?includeNestedMb=true) when origin_head_id is set
// — it's owned by a DIFFERENT route head and was only included in the GET
// response for the Visual tab's read-only preview. It must never round-trip
// through Save: (a) it's not this route's data to mutate, and (b) origin_head_id
// is an int64 proto field that the frontend normalizer leaves `undefined` for
// every NATIVE row (see numOpt() in types/finance/cost-route.ts), so any path
// that forwards it unbackfilled crashes ts-proto's BinaryWriter with
// "Cannot convert undefined to a BigInt" the moment the value isn't exactly 0.
function isSynthetic(row: RawObj): boolean {
  const originHeadId = row.originHeadId ?? row.origin_head_id
  const nestDepth = row.nestDepth ?? row.nest_depth
  return n0(originHeadId) > 0 || n0(nestDepth) > 0
}

function normalizeGraphForSave(graph: unknown): unknown {
  if (!graph || typeof graph !== "object") return { head: {}, seqs: [] }
  const g = graph as RawObj
  const head = (g.head as RawObj) ?? {}
  return {
    head: {
      ...head,
      headId: n0(head.headId),
      productSysId: n0(head.productSysId),
      promotedFromDraftId: n0(head.promotedFromDraftId),
      cylTypeId: n0(head.cylTypeId),
      version: n0(head.version) || 1,
    },
    seqs: Array.isArray(g.seqs)
      ? g.seqs
          // Belt-and-suspenders: the flattened/nested-MB display graph is
          // fetched into a separate React Query cache entry and never merges
          // into `working`/`persisted` (the graph Save actually sends) — see
          // route-graph-editor.tsx. This filter guards against that invariant
          // ever being violated upstream without silently corrupting another
          // route's rows or crashing the int64 encoder.
          .filter((rawSeq) => !isSynthetic((rawSeq ?? {}) as RawObj))
          .map((rawSeq) => {
            const s = (rawSeq ?? {}) as RawObj
            const rms = Array.isArray(s.rms) ? s.rms : []
            return {
              ...s,
              seqId: n0(s.seqId),
              headId: n0(s.headId),
              productSysId: n0(s.productSysId),
              routeLevel: n0(s.routeLevel),
              routeSeq: n0(s.routeSeq),
              positionX: n0(s.positionX),
              positionY: n0(s.positionY),
              // int64 in the proto — undefined (always the case for native
              // rows, since the frontend never stamps this) throws in
              // ts-proto's BinaryWriter unless explicitly coerced to 0.
              originHeadId: n0(s.originHeadId ?? s.origin_head_id),
              rms: rms
                .filter((rawRm) => !isSynthetic((rawRm ?? {}) as RawObj))
                .map((rawRm) => {
                  const r = (rawRm ?? {}) as RawObj
                  return {
                    ...r,
                    rmId: n0(r.rmId),
                    seqId: n0(r.seqId),
                    parentProductSysId: n0(r.parentProductSysId),
                    rmProductSysId: n0(r.rmProductSysId),
                    uomId: n0(r.uomId),
                    routeRmRatio: n0(r.routeRmRatio) || 1,
                    // double position fields — undefined throws in ts-proto BinaryWriter.
                    positionX: n0(r.positionX),
                    positionY: n0(r.positionY),
                    // int64 in the proto — same undefined-BigInt hazard as
                    // seq.originHeadId above.
                    originHeadId: n0(r.originHeadId ?? r.origin_head_id),
                  }
                }),
            }
          })
      : [],
  }
}

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
