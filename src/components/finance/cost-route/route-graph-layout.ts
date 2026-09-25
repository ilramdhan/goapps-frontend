// route-graph-layout — shared grid-layout math for the Visual/React-Flow
// route editor. Single source of truth for the layout constants and the
// grid-slot formula, consumed by:
//   - route-graph-flow.tsx's buildFlow() fallback layout (for seqs/RMs that
//     have no persisted position yet)
//   - route-splice.ts's spliceGraph() (post-ship fix 4a) — so cloned seqs
//     land at real, sensible grid coordinates instead of (0,0)
//   - route-graph-editor.tsx's "Auto-arrange" action (post-ship fix 4c) —
//     recomputes every seq/RM position on explicit user request
//
// Layout: levels stack TOP-DOWN. Level 1 (FG) at the bottom, highest level at
// the top — production flows downward. Within a level, stages are spaced
// left-to-right by their position index in that level.
export const STAGE_W = 220
// Must be >= RM_W + RM_GAP_X (210): each stage's local RM nodes render to its
// LEFT at `x - (RM_W + RM_GAP_X)` (see route-graph-flow.tsx). If the gap
// between same-level stages is smaller than that offset, a stage's RM column
// lands on top of the previous stage's box — the "kabel/garis numpuk" overlap
// bug. Kept with a margin above the strict minimum for breathing room.
export const STAGE_GAP_X = 240
// Must comfortably exceed a stage's local RM stack height (RM_GAP_Y per RM,
// stacked downward from the stage's own y) so a stage with several RM inputs
// doesn't spill into the next level's row below it — MB stages in particular
// can have many RM lines.
export const LEVEL_GAP_Y = 260
// Approximate node height, used only for the bounding-box collision check
// (fix 4b) — not a rendered dimension, the actual node auto-sizes to content.
export const STAGE_H = 90

export const RM_W = 180
export const RM_GAP_X = 30
export const RM_GAP_Y = 50
export const RM_H = 46

/**
 * computeGridPosition — the same formula buildFlow()'s fallback layout uses:
 * `seqIndexInLevel` is the 0-based position of a stage within its level (once
 * sorted/ordered), `maxLevel` is the highest routeLevel across the graph
 * being laid out.
 */
export function computeGridPosition(
  level: number,
  seqIndexInLevel: number,
  maxLevel: number,
): { x: number; y: number } {
  const x = seqIndexInLevel * (STAGE_W + STAGE_GAP_X)
  const y = (maxLevel - level) * LEVEL_GAP_Y
  return { x, y }
}

/** Simple axis-aligned bounding-box overlap check (fix 4b). */
export function boxesOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}
