/**
 * Tests for route-splice.ts — B4's pure splice-algorithm helpers used by
 * route-graph-editor.tsx's AddRmDialog "Attach an existing route" mode.
 * Covers:
 *  - computeLevelShift: shift == target seq's own level (source level 1 -> N+1)
 *  - isSelfReferencing: client-side pre-check mirroring the backend's
 *    ErrSelfReferencingRoute guard
 *  - spliceGraph: level-shift math, routeSeq renumbering (collision-avoidance),
 *    verbatim productSysId copy, cloned RM shape, and the bridge RM
 *  - spliceGraph: real grid position computation for cloned seqs instead of
 *    (0,0) (post-ship fix 4a), sharing computeGridPosition with buildFlow()
 */
import { describe, it, expect } from "vitest"
import { computeLevelShift, isSelfReferencing, spliceGraph } from "@/components/finance/cost-route/route-splice"
import { computeGridPosition } from "@/components/finance/cost-route/route-graph-layout"
import type { CostRouteSeq, RouteGraph } from "@/types/finance/cost-route"

function seq(overrides: Partial<CostRouteSeq> & Pick<CostRouteSeq, "uid" | "productSysId" | "routeLevel" | "routeSeq">): CostRouteSeq {
  return {
    seqId: 0,
    headId: 1,
    positionX: 0,
    positionY: 0,
    rms: [],
    ...overrides,
  }
}

describe("computeLevelShift", () => {
  it("returns the target seq's own level (source level 1 lands one level above)", () => {
    expect(computeLevelShift(1)).toBe(1)
    expect(computeLevelShift(3)).toBe(3)
  })
})

describe("isSelfReferencing", () => {
  it("returns true when any source seq produces the target head's own product", () => {
    const sourceGraph: RouteGraph = {
      head: { headId: 500, productSysId: 20 } as RouteGraph["head"],
      seqs: [
        seq({ uid: "a", productSysId: 20, routeLevel: 1, routeSeq: 1 }),
        seq({ uid: "b", productSysId: 30, routeLevel: 2, routeSeq: 1 }),
      ],
    }
    // Target route's own head product is 100 -- doesn't appear anywhere in A.
    expect(isSelfReferencing(sourceGraph, 100)).toBe(false)
    // Target route's own head product IS produced somewhere in A -- reject.
    expect(isSelfReferencing(sourceGraph, 30)).toBe(true)
  })

  it("returns false when no source seq matches the target product", () => {
    const sourceGraph: RouteGraph = {
      head: { headId: 500, productSysId: 20 } as RouteGraph["head"],
      seqs: [seq({ uid: "a", productSysId: 20, routeLevel: 1, routeSeq: 1 })],
    }
    expect(isSelfReferencing(sourceGraph, 999)).toBe(false)
  })
})

describe("spliceGraph", () => {
  let uidCounter = 0
  function makeUid() {
    uidCounter += 1
    return `test-uid-${uidCounter}`
  }

  it("shifts every source level by the target seq's level and renumbers routeSeq to avoid collisions", () => {
    uidCounter = 0
    // Source route A: level 1 = FG (product 20), level 2 = intermediate (product 30).
    const sourceGraph: RouteGraph = {
      head: { headId: 500, productSysId: 20 } as RouteGraph["head"],
      seqs: [
        seq({
          uid: "src-1",
          productSysId: 20,
          productCode: "FG-A",
          routeLevel: 1,
          routeSeq: 1,
          rms: [
            {
              uid: "src-rm-1",
              rmId: 9,
              seqId: 1,
              parentProductSysId: 20,
              rmType: "PRODUCT",
              rmProductSysId: 30,
              routeRmRatio: 2,
            },
          ],
        }),
        seq({ uid: "src-2", productSysId: 30, productCode: "INT-A", routeLevel: 2, routeSeq: 1 }),
      ],
    }

    // Target graph: receiving stage S sits at level 2, and the target graph
    // already has one other seq at level 3 (routeSeq 1) that a naive clone
    // would otherwise collide with.
    const targetSeq = seq({ uid: "tgt-s", seqId: 42, productSysId: 200, routeLevel: 2, routeSeq: 1 })
    const existingSeqs: CostRouteSeq[] = [
      targetSeq,
      seq({ uid: "tgt-other", seqId: 43, productSysId: 300, routeLevel: 3, routeSeq: 1 }),
    ]

    const { clonedSeqs, bridgeRm } = spliceGraph({ sourceGraph, targetSeq, existingSeqs, makeUid })

    // shift = targetSeq.routeLevel (2) -> source level 1 => level 3, source level 2 => level 4.
    expect(clonedSeqs).toHaveLength(2)
    const cloned1 = clonedSeqs.find((s) => s.productSysId === 20)!
    const cloned2 = clonedSeqs.find((s) => s.productSysId === 30)!
    expect(cloned1.routeLevel).toBe(3)
    expect(cloned2.routeLevel).toBe(4)

    // productSysId copied verbatim (not remapped).
    expect(cloned1.productSysId).toBe(20)
    expect(cloned2.productSysId).toBe(30)

    // routeSeq renumbered to avoid the existing level-3 occupant (routeSeq 1 taken).
    expect(cloned1.routeSeq).toBe(2)
    // level 4 had no prior occupants -> starts at 1.
    expect(cloned2.routeSeq).toBe(1)

    // Positions computed at splice time via the shared grid formula (not
    // (0,0)) — merged-graph maxLevel is 4 (existing levels 2,3 + shifted
    // source levels 3,4), so y stacks top-down against that.
    expect(cloned1.positionX).toBe(computeGridPosition(3, 1, 4).x)
    expect(cloned1.positionY).toBe(computeGridPosition(3, 1, 4).y)
    expect(cloned2.positionX).toBe(computeGridPosition(4, 0, 4).x)
    expect(cloned2.positionY).toBe(computeGridPosition(4, 0, 4).y)
    // Distinct from (0,0) and from each other — no collision at the shifted level 3 slot.
    expect(cloned1.positionX !== 0 || cloned1.positionY !== 0).toBe(true)

    // Cloned seqs use temp ids (unsaved / insert semantics).
    expect(cloned1.seqId).toBe(0)
    expect(cloned2.seqId).toBe(0)
    expect(cloned1.uid).not.toBe("src-1")
    expect(cloned1.headId).toBe(targetSeq.headId)

    // RM cloned onto the cloned seq, verbatim values, temp ids, fresh uid.
    expect(cloned1.rms).toHaveLength(1)
    expect(cloned1.rms[0].rmId).toBe(0)
    expect(cloned1.rms[0].seqId).toBe(0)
    expect(cloned1.rms[0].rmProductSysId).toBe(30)
    expect(cloned1.rms[0].routeRmRatio).toBe(2)
    expect(cloned1.rms[0].parentProductSysId).toBe(20)
    expect(cloned1.rms[0].uid).not.toBe("src-rm-1")

    // Bridge RM references A's level-1 (FG) product, default ratio 1.0, on the target seq.
    expect(bridgeRm.rmType).toBe("PRODUCT")
    expect(bridgeRm.rmProductSysId).toBe(20)
    expect(bridgeRm.routeRmRatio).toBe(1)
    expect(bridgeRm.seqId).toBe(targetSeq.seqId)
    expect(bridgeRm.parentProductSysId).toBe(targetSeq.productSysId)
    expect(bridgeRm.routeRmName).toContain("FG-A")
  })

  it("gives multiple seqs landing in the same shifted level distinct, non-overlapping positions", () => {
    uidCounter = 0
    // Source route has TWO seqs at (source) level 2 — siblings at the same
    // level. targetSeq.routeLevel = 1 -> shift = 1 -> source level 2 lands
    // at shifted level 3 (source level 1 lands at shifted level 2).
    const sourceGraph: RouteGraph = {
      head: { headId: 500, productSysId: 20 } as RouteGraph["head"],
      seqs: [
        seq({ uid: "src-1", productSysId: 20, routeLevel: 1, routeSeq: 1 }),
        seq({ uid: "src-2", productSysId: 30, routeLevel: 2, routeSeq: 1 }),
        seq({ uid: "src-3", productSysId: 31, routeLevel: 2, routeSeq: 2 }),
      ],
    }
    // Target level 1 already has one occupant at the shifted level 3 (routeSeq 1 taken).
    const targetSeq = seq({ uid: "tgt-s", seqId: 1, productSysId: 200, routeLevel: 1, routeSeq: 1 })
    const existingSeqs: CostRouteSeq[] = [
      targetSeq,
      seq({ uid: "tgt-other-l3", seqId: 2, productSysId: 999, routeLevel: 3, routeSeq: 1 }),
    ]

    const { clonedSeqs } = spliceGraph({ sourceGraph, targetSeq, existingSeqs, makeUid })
    const level3Clones = clonedSeqs.filter((s) => s.routeLevel === 3)
    expect(level3Clones).toHaveLength(2)

    // routeSeq continues past the existing level-3 occupant (1) -> 2, 3.
    const routeSeqs = level3Clones.map((s) => s.routeSeq).sort()
    expect(routeSeqs).toEqual([2, 3])

    // Positions must be distinct (no two land on the same coordinates).
    const positions = level3Clones.map((s) => `${s.positionX},${s.positionY}`)
    expect(new Set(positions).size).toBe(level3Clones.length)
  })

  it("uses a bare product label for the bridge RM when the source FG has no code/name", () => {
    const sourceGraph: RouteGraph = {
      head: { headId: 500, productSysId: 20 } as RouteGraph["head"],
      seqs: [seq({ uid: "src-1", productSysId: 20, routeLevel: 1, routeSeq: 1 })],
    }
    const targetSeq = seq({ uid: "tgt-s", seqId: 1, productSysId: 200, routeLevel: 1, routeSeq: 1 })
    const { bridgeRm } = spliceGraph({ sourceGraph, targetSeq, existingSeqs: [targetSeq], makeUid })
    expect(bridgeRm.rmProductSysId).toBe(20)
    expect(bridgeRm.routeRmName).toBeUndefined()
  })
})
