// route-splice — pure logic for B4's "Attach an existing route" splice mode
// inside route-graph-editor.tsx's AddRmDialog.
//
// A user picks a COMPLETE/LOCKED source route (via the shared
// route-source-picker) to splice in at a single RM slot on the target seq
// `S` (level N). The whole source graph is cloned in as new upstream levels
// above S, and one new "bridge" PRODUCT-RM is added on S pointing at the
// source route's finished-good product. Nothing is remapped — every cloned
// seq keeps its original `productSysId` verbatim, so shared upstream
// products (e.g. masterbatch, POY) still resolve by identity, exactly like
// the existing SaveGraph persistence model (see graph-fork design §3).
//
// Level-shift math: source level 1 (source's own FG) lands at target level
// N+1; source level k lands at target level N+k. So shift == N (the target
// seq's own level).
import { newUid, type CostRouteRm, type CostRouteSeq, type RouteGraph } from "@/types/finance/cost-route"
import { computeGridPosition } from "@/components/finance/cost-route/route-graph-layout"

/** computeLevelShift — shift applied to every source-graph level so its
 * level-1 (FG) seq lands one level above the target seq (level targetLevel + 1). */
export function computeLevelShift(targetLevel: number): number {
  return targetLevel
}

/**
 * isSelfReferencing — client-side pre-check mirroring the backend's
 * ErrSelfReferencingRoute guard (graph.go ValidateLevels): true if any seq
 * in the source graph produces the SAME product as the target route's own
 * head. Since every spliced-in seq lands at level > 1 (shift >= 1 whenever
 * the target seq is at level >= 1, which it always is), any such match
 * would create a self-consuming cycle once merged.
 */
export function isSelfReferencing(sourceGraph: RouteGraph, targetHeadProductSysId: number): boolean {
  return sourceGraph.seqs.some((s) => s.productSysId === targetHeadProductSysId)
}

export interface SpliceParams {
  /** The full source route graph to clone in (already fetched via useRouteGraph). */
  sourceGraph: RouteGraph
  /** The target seq (in the merged/target graph) receiving the new bridge RM. */
  targetSeq: CostRouteSeq
  /** The target graph's current seqs — used only to avoid routeSeq collisions at shifted levels. */
  existingSeqs: CostRouteSeq[]
  /** Injectable uid generator, overridable in tests for deterministic output. */
  makeUid?: () => string
}

export interface SpliceResult {
  /** Cloned source seqs (+ their cloned RMs), ready to append to the target graph's seqs array. */
  clonedSeqs: CostRouteSeq[]
  /** The new bridge RM to append onto the target seq — caller stamps `uid`/`seqId`/`parentProductSysId`. */
  bridgeRm: Omit<CostRouteRm, "uid">
}

/**
 * spliceGraph — clones every seq (and its RMs) from `sourceGraph` into the
 * target graph at shifted levels, plus computes the bridge RM. Pure aside
 * from `makeUid` (defaults to the real `newUid()`), so tests can inject a
 * deterministic id generator.
 */
export function spliceGraph({ sourceGraph, targetSeq, existingSeqs, makeUid = newUid }: SpliceParams): SpliceResult {
  const shift = computeLevelShift(targetSeq.routeLevel)

  // Seed routeSeq counters from the target graph's current occupancy at each
  // level so cloned stages never collide with existing ones — seeded from
  // the ACTUAL occupied range across the merged graph: existing target seqs
  // AND (incrementally, below) every seq being spliced in at that same
  // shifted level, so multiple seqs landing in one shifted level (from this
  // splice or a prior one) each get a distinct slot.
  const levelCounts = new Map<number, number>()
  for (const s of existingSeqs) {
    levelCounts.set(s.routeLevel, Math.max(levelCounts.get(s.routeLevel) ?? 0, s.routeSeq))
  }

  // maxLevel across the FULL merged graph (existing seqs + every seq about
  // to be spliced in, post-shift) — needed up front so computeGridPosition's
  // y formula matches what buildFlow() will compute once this graph is
  // re-rendered (levels stack top-down, so y depends on the eventual max).
  const mergedLevels = new Set<number>(existingSeqs.map((s) => s.routeLevel))
  for (const s of sourceGraph.seqs) mergedLevels.add(s.routeLevel + shift)
  const maxLevel = mergedLevels.size > 0 ? Math.max(...mergedLevels) : 1

  const clonedSeqs: CostRouteSeq[] = sourceGraph.seqs.map((s) => {
    const newLevel = s.routeLevel + shift
    const nextSeq = (levelCounts.get(newLevel) ?? 0) + 1
    levelCounts.set(newLevel, nextSeq)
    // Real grid coordinates at splice time (not (0,0)) — reuses buildFlow()'s
    // own grid formula so cloned stages land in sensible, non-colliding
    // positions instead of stacking at the origin. nextSeq - 1 is the
    // 0-based slot index within this shifted level, continuing right after
    // whatever's already occupying it (existing seqs, or earlier clones in
    // this same splice call).
    const { x, y } = computeGridPosition(newLevel, nextSeq - 1, maxLevel)
    return {
      ...s,
      uid: makeUid(),
      seqId: 0, // unsaved — insert semantics on next SaveGraph
      headId: targetSeq.headId,
      // productSysId copied verbatim — NOT remapped, so shared upstream
      // products resolve by identity exactly like SaveGraph already does.
      routeLevel: newLevel,
      routeSeq: nextSeq,
      positionX: x,
      positionY: y,
      rms: s.rms.map((rm) => ({
        ...rm,
        uid: makeUid(),
        rmId: 0,
        seqId: 0,
        parentProductSysId: s.productSysId,
      })),
    }
  })

  const sourceFg = sourceGraph.seqs.find((s) => s.routeLevel === 1)
  const bridgeRm: Omit<CostRouteRm, "uid"> = {
    rmId: 0,
    seqId: targetSeq.seqId,
    parentProductSysId: targetSeq.productSysId,
    rmType: "PRODUCT",
    rmProductSysId: sourceFg?.productSysId ?? 0,
    routeRmName: sourceFg?.productCode
      ? `${sourceFg.productCode}${sourceFg.productName ? " — " + sourceFg.productName : ""}`
      : sourceFg?.productName,
    routeRmRatio: 1,
  }

  return { clonedSeqs, bridgeRm }
}
