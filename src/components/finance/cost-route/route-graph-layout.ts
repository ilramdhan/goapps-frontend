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
export const STAGE_GAP_X = 80
export const LEVEL_GAP_Y = 180
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
