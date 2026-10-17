// Save-side normalizer for SaveRouteGraph (used by the BFF graph route).
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
// Read-only computed RM-ratio fields returned by GetRouteGraph. They describe
// what the calc engine derives (e.g. from DENIER) and must never be persisted —
// in particular computedRatio must never leak into routeRmRatio, which keeps
// the user-entered value.
function omitKeys(obj: RawObj, keys: readonly string[]): RawObj {
  const out: RawObj = { ...obj }
  for (const k of keys) delete out[k]
  return out
}
const RM_READONLY_KEYS = [
  "computedRatio", "computed_ratio", "ratioSource", "ratio_source",
  "denier", "ratioNote", "ratio_note", "denierOverridden", "denier_overridden",
] as const
const MODE_READONLY_KEYS = ["rmRatioMode", "rm_ratio_mode"] as const

export function normalizeGraphForSave(graph: unknown): unknown {
  if (!graph || typeof graph !== "object") return { head: {}, seqs: [] }
  const g = graph as RawObj
  const head = omitKeys((g.head as RawObj) ?? {}, MODE_READONLY_KEYS)
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
      ? g.seqs.map((rawSeq) => {
          const s = omitKeys((rawSeq ?? {}) as RawObj, MODE_READONLY_KEYS)
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
            // Display-only nested-MB flatten annotations (see CostRouteSeq in
            // types/finance/cost-route.ts). The browser normalizer's numOpt()
            // turns 0/missing into `undefined` for these on every native row,
            // which throws the same BigInt(undefined) crash as the int64
            // fields above once it reaches CostRouteSeq.encode(). Rows saved
            // back to this head are always native to it, so 0 is correct.
            originHeadId: n0(s.originHeadId),
            nestDepth: n0(s.nestDepth),
            originProductCode: typeof s.originProductCode === "string" ? s.originProductCode : "",
            rms: rms.map((rawRm) => {
              const r = omitKeys((rawRm ?? {}) as RawObj, RM_READONLY_KEYS)
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
                // Same display-only nested-MB annotations as CostRouteSeq above.
                originHeadId: n0(r.originHeadId),
                nestDepth: n0(r.nestDepth),
                effectiveRatio: n0(r.effectiveRatio) || n0(r.routeRmRatio) || 1,
                originProductCode: typeof r.originProductCode === "string" ? r.originProductCode : "",
                originProductName: typeof r.originProductName === "string" ? r.originProductName : "",
              }
            }),
          }
        })
      : [],
  }
}
