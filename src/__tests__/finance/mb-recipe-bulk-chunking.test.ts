// MB Recipe bulk regenerate — chunking + per-stage aggregation.
//
// Domain: the proto caps every bulk MB Head request at `max_items: 500`, and
// the table's header checkbox can select every row matching the filter across
// all pages — so a stage's request set routinely exceeds the cap and must be
// split into sequentially-queued batches. These are the two pure functions
// that decide how a stage is split and how its batches roll back up into the
// single result the operator sees.
import { describe, it, expect } from "vitest"

import {
  BULK_CHUNK_SIZE,
  chunkIds,
  aggregateChunkResults,
  type ChunkOutcome,
} from "@/components/finance/mb-recipe/mb-recipe-bulk-job-progress-dialog"

function ids(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `mbh-${i}`)
}

function outcome(status: string, total: number, completed: number, failed: number): ChunkOutcome {
  return { status, total, completed, failed }
}

// ============================================================================
// chunkIds
// ============================================================================

describe("chunkIds", () => {
  it("uses the proto's max_items as its default size", () => {
    expect(BULK_CHUNK_SIZE).toBe(500)
  })

  it("returns ZERO chunks for an empty request set (a skipped stage)", () => {
    expect(chunkIds([])).toEqual([])
  })

  it("keeps a sub-cap selection as ONE chunk", () => {
    const chunks = chunkIds(ids(1))
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toHaveLength(1)

    const chunks250 = chunkIds(ids(250))
    expect(chunks250).toHaveLength(1)
    expect(chunks250[0]).toHaveLength(250)
  })

  it("keeps EXACTLY 500 as one chunk (the cap is inclusive)", () => {
    const chunks = chunkIds(ids(500))
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toHaveLength(500)
  })

  it("splits 501 into two chunks of 500 + 1", () => {
    const chunks = chunkIds(ids(501))
    expect(chunks.map((c) => c.length)).toEqual([500, 1])
  })

  it("splits 1500 into three full chunks", () => {
    const chunks = chunkIds(ids(1500))
    expect(chunks.map((c) => c.length)).toEqual([500, 500, 500])
  })

  it("preserves order and loses/duplicates nothing", () => {
    const source = ids(1234)
    const chunks = chunkIds(source)
    expect(chunks.map((c) => c.length)).toEqual([500, 500, 234])
    expect(chunks.flat()).toEqual(source)
    expect(new Set(chunks.flat()).size).toBe(1234)
  })

  it("never emits a chunk larger than the cap", () => {
    for (const n of [0, 1, 499, 500, 501, 999, 1000, 1001, 1500]) {
      expect(chunkIds(ids(n)).every((c) => c.length <= BULK_CHUNK_SIZE)).toBe(true)
    }
  })

  it("honours an explicit size", () => {
    expect(chunkIds(ids(5), 2).map((c) => c.length)).toEqual([2, 2, 1])
  })

  it("rejects a non-positive size rather than looping forever", () => {
    expect(() => chunkIds(ids(3), 0)).toThrow(RangeError)
    expect(() => chunkIds(ids(3), -1)).toThrow(RangeError)
  })
})

// ============================================================================
// aggregateChunkResults
// ============================================================================

describe("aggregateChunkResults", () => {
  it("reports SKIPPED with zeroed counters when no chunk ever ran", () => {
    expect(aggregateChunkResults([])).toEqual({
      status: "SKIPPED",
      total: 0,
      completed: 0,
      failed: 0,
    })
  })

  it("is DONE only when EVERY chunk is DONE", () => {
    expect(
      aggregateChunkResults([
        outcome("DONE", 500, 500, 0),
        outcome("DONE", 500, 500, 0),
        outcome("DONE", 500, 500, 0),
      ]),
    ).toEqual({ status: "DONE", total: 1500, completed: 1500, failed: 0 })
  })

  it("is FAILED only when EVERY chunk is FAILED", () => {
    expect(
      aggregateChunkResults([
        outcome("FAILED", 500, 0, 500),
        outcome("FAILED", 1, 0, 1),
      ]),
    ).toEqual({ status: "FAILED", total: 501, completed: 0, failed: 501 })
  })

  it("is PARTIAL when a DONE chunk sits next to a FAILED one", () => {
    expect(
      aggregateChunkResults([
        outcome("DONE", 500, 500, 0),
        outcome("FAILED", 500, 0, 500),
      ]),
    ).toEqual({ status: "PARTIAL", total: 1000, completed: 500, failed: 500 })
  })

  it("is PARTIAL when any single chunk is itself PARTIAL", () => {
    expect(
      aggregateChunkResults([
        outcome("DONE", 500, 500, 0),
        outcome("PARTIAL", 500, 490, 10),
        outcome("DONE", 500, 500, 0),
      ]),
    ).toEqual({ status: "PARTIAL", total: 1500, completed: 1490, failed: 10 })
  })

  it("passes a single chunk straight through (the ≤ 500 case)", () => {
    for (const status of ["DONE", "FAILED", "PARTIAL"]) {
      const only = outcome(status, 250, 200, 50)
      expect(aggregateChunkResults([only])).toEqual(only)
    }
  })

  it("sums counters independently of the status verdict", () => {
    const agg = aggregateChunkResults([
      outcome("PARTIAL", 500, 400, 100),
      outcome("PARTIAL", 500, 300, 200),
      outcome("DONE", 200, 200, 0),
    ])
    expect(agg.total).toBe(1200)
    expect(agg.completed).toBe(900)
    expect(agg.failed).toBe(300)
    expect(agg.status).toBe("PARTIAL")
  })
})
