"use client"

// RouteGraphFlow — interactive DAG editor using @xyflow/react.
//
// Layout: levels stack TOP-DOWN. Level 1 (FG) at bottom, highest level at top
// — production flows downward, matching the way operators think (RM in, FG
// out at the bottom). Each level is a horizontal row; within a level stages
// are spaced left-to-right by route_seq.
//
// Edges (implicit):
//   • Stage→Stage: an RM with rm_type=PRODUCT pointing to an upstream stage's
//     product creates an edge from the upstream stage (higher level) down to
//     this stage. Label = ratio.
//   • RM→Stage:    ITEM and GROUP RMs render as small RM nodes to the left
//     of their stage, connected by an edge labelled with their ratio.
//
// Interactions (gated by `locked`) — all keyed by stable client uid, not DB id:
//   • Drag a stage node → onStagePositionChange(seqUid, x, y)
//   • Drag an RM node   → onRmPositionChange(rmUid, x, y)
//   • Connect stage→stage → onConnectStages(sourceSeqUid, targetSeqUid)
//   • Click stage node → onStageClick(seqUid)
//   • Click edge (PRODUCT/ITEM/GROUP RM) → onEdgeClick(rmUid)

import { useCallback, useMemo, useRef } from "react"
import { useTheme } from "next-themes"
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type NodeProps,
  type EdgeMouseHandler,
  type OnConnectEnd,
  type OnConnectStart,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { CostRouteRm, CostRouteSeq, RouteGraph } from "@/types/finance/cost-route"

interface Props {
  graph: RouteGraph
  locked?: boolean
  onAddStage?: () => void
  /** User finished dragging a stage node to (x,y). Keyed on the client uid. */
  onStagePositionChange?: (seqUid: string, x: number, y: number) => void
  /** User finished dragging an ITEM/GROUP RM node to (x,y). Keyed on the client uid. */
  onRmPositionChange?: (rmUid: string, x: number, y: number) => void
  /** User drew an edge between two stage nodes (source = upstream, target = downstream). */
  onConnectStages?: (sourceSeqUid: string, targetSeqUid: string) => void
  /** User clicked a stage node. */
  onStageClick?: (seqUid: string) => void
  /** User clicked an edge that maps to a CostRouteRm (PRODUCT / ITEM / GROUP). */
  onEdgeClick?: (rmUid: string) => void
  /**
   * User started dragging from a node handle and dropped on the empty React
   * Flow pane (not on another node). Source seq uid + which handle was used.
   * `handleType === "source"` = bottom handle (downstream side).
   * `handleType === "target"` = top handle (upstream side).
   */
  onDropOnPane?: (sourceSeqUid: string, handleType: "source" | "target") => void
}

// ============================================================================
// Custom node renderers
// ============================================================================

type StageNodeData = {
  uid: string
  level: number
  seq: number
  productCode?: string
  productName?: string
  isFG: boolean
  [key: string]: unknown
}

type RmNodeData = {
  uid: string
  label: string
  kind: "ITEM" | "GROUP"
  [key: string]: unknown
}

const StageNode = ({ data }: NodeProps<Node<StageNodeData>>) => {
  return (
    <div
      className={`rounded-md border px-3 py-2 shadow-sm text-card-foreground ${
        data.isFG
          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-700"
          : "border-blue-400 bg-card dark:border-blue-700"
      }`}
      style={{ minWidth: 180 }}
    >
      <Handle type="target" position={Position.Top} />
      <div className="font-mono text-[10px] text-muted-foreground">
        L{data.level} · seq {data.seq}
        {data.isFG ? " · FG" : ""}
      </div>
      <div className="text-sm font-medium text-foreground">
        {data.productCode || "(no code)"}
      </div>
      {data.productName ? (
        <div className="text-xs text-muted-foreground line-clamp-2">{data.productName}</div>
      ) : null}
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

const RmNode = ({ data }: NodeProps<Node<RmNodeData>>) => {
  return (
    <div
      className={`rounded-md border px-2 py-1 text-xs shadow-sm text-foreground ${
        data.kind === "GROUP"
          ? "border-purple-400 bg-purple-50 dark:bg-purple-950/40 dark:border-purple-700"
          : "border-amber-400 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-700"
      }`}
      style={{ minWidth: 130, maxWidth: 200 }}
    >
      <div className="flex items-center gap-1">
        <Badge variant="outline" className="px-1 py-0 text-[9px] text-foreground border-current/40">
          {data.kind}
        </Badge>
        <span className="truncate font-mono text-foreground">{data.label}</span>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

const nodeTypes = { stage: StageNode, rm: RmNode }

// ============================================================================
// Layout helpers
// ============================================================================

const STAGE_W = 220
const STAGE_GAP_X = 80
const LEVEL_GAP_Y = 180

const RM_W = 180
const RM_GAP_X = 30
const RM_GAP_Y = 50

// Node ID conventions — keyed on the stable client uid (not the DB id, which
// is 0 until save). This makes new/unsaved elements clickable + editable, and
// keeps node/edge ids collision-free so deleting one RM removes exactly one.
function stageNodeId(seq: CostRouteSeq): string {
  return `seq-${seq.uid}`
}

function rmNodeId(rm: CostRouteRm): string {
  return `rm-${rm.uid}`
}

// Edge data carries the rm uid so onEdgeClick can dispatch back.
type EdgeData = { rmUid: string; rmType: "PRODUCT" | "ITEM" | "GROUP" }

function buildFlow(graph: RouteGraph): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // Group seqs by level.
  const byLevel = new Map<number, CostRouteSeq[]>()
  for (const s of graph.seqs) {
    const list = byLevel.get(s.routeLevel) ?? []
    list.push(s)
    byLevel.set(s.routeLevel, list)
  }
  const levels = Array.from(byLevel.keys()).sort((a, b) => a - b)
  const maxLevel = levels.length > 0 ? Math.max(...levels) : 1

  // For PRODUCT-RM edges we need to know each product's stage id.
  // Multiple stages may produce the same product (rare); first wins.
  const stageIdByProduct = new Map<number, string>()
  for (const s of graph.seqs) {
    if (!stageIdByProduct.has(s.productSysId)) {
      stageIdByProduct.set(s.productSysId, stageNodeId(s))
    }
  }

  // Layout each level row.
  for (const level of levels) {
    const list = (byLevel.get(level) ?? []).slice().sort((a, b) => a.routeSeq - b.routeSeq)
    // Stages within a level are spaced LEFT-RIGHT by their route_seq.
    list.forEach((s, idx) => {
      const id = stageNodeId(s)
      const fallbackX = idx * (STAGE_W + STAGE_GAP_X)
      // Higher levels are HIGHER on screen (i.e. smaller y); level 1 at the bottom.
      const fallbackY = (maxLevel - level) * LEVEL_GAP_Y
      // Use persisted position if non-zero; otherwise fall back to grid layout.
      const hasPersistedPos = (s.positionX !== 0 || s.positionY !== 0)
      const x = hasPersistedPos ? s.positionX : fallbackX
      const y = hasPersistedPos ? s.positionY : fallbackY
      nodes.push({
        id,
        type: "stage",
        position: { x, y },
        data: {
          uid: s.uid,
          level: s.routeLevel,
          seq: s.routeSeq,
          productCode: s.productCode,
          productName: s.productName,
          isFG: s.routeLevel === 1,
        } satisfies StageNodeData,
      })

      // RM children: ITEM + GROUP rendered as RM nodes to the LEFT of the stage,
      // stacked vertically. PRODUCT rms become edges (handled below).
      const localRms = (s.rms ?? []).filter((r) => r.rmType !== "PRODUCT")
      localRms.forEach((rm, rmIdx) => {
        const rmId = rmNodeId(rm)
        // Use the RM's persisted free position when set (>0), else auto-layout
        // beside the stage as the default starting point.
        const hasRmPos = (rm.positionX ?? 0) !== 0 || (rm.positionY ?? 0) !== 0
        nodes.push({
          id: rmId,
          type: "rm",
          position: hasRmPos
            ? { x: rm.positionX ?? 0, y: rm.positionY ?? 0 }
            : { x: x - (RM_W + RM_GAP_X), y: y + rmIdx * RM_GAP_Y },
          data: {
            uid: rm.uid,
            label: rmLabel(rm),
            kind: rm.rmType === "GROUP" ? "GROUP" : "ITEM",
          } satisfies RmNodeData,
        })
        edges.push({
          id: `e-${rm.rmType.toLowerCase()}-${rm.uid}`,
          source: rmId,
          target: id,
          label: `×${rm.routeRmRatio}`,
          labelStyle: { fontSize: 10 },
          animated: false,
          data: { rmUid: rm.uid, rmType: rm.rmType } satisfies EdgeData,
        })
      })

      // PRODUCT rms become edges from the upstream stage that produces them
      // down to this stage.
      const productRms = (s.rms ?? []).filter((r) => r.rmType === "PRODUCT")
      productRms.forEach((rm) => {
        const upstreamId = rm.rmProductSysId ? stageIdByProduct.get(rm.rmProductSysId) : undefined
        if (!upstreamId) return // dangling — validator should have caught
        edges.push({
          id: `e-product-${rm.uid}`,
          source: upstreamId,
          target: id,
          label: `×${rm.routeRmRatio}`,
          labelStyle: { fontSize: 10, fontWeight: 600 },
          animated: true,
          style: { stroke: "#10b981", strokeWidth: 1.5 },
          data: { rmUid: rm.uid, rmType: "PRODUCT" } satisfies EdgeData,
        })
      })
    })
  }

  return { nodes, edges }
}

function rmLabel(rm: CostRouteRm): string {
  if (rm.rmType === "GROUP") {
    // Prefer the human-readable group name; render "name (code)" when both
    // exist so users see the group name, not just the numeric group code.
    const name = rm.rmGroupName || rm.routeRmName
    const code = rm.rmGroupCode
    if (name && code && name !== code) return `${name} (${code})`
    return name || code || "(group)"
  }
  if (rm.rmType === "ITEM") return rm.rmItemCode || rm.routeRmName || "(item)"
  return rm.routeRmName || ""
}

// Pluck the seq uid back out of a stage node id. Returns "" for non-stage ids.
function parseSeqUidFromNodeId(nodeId: string): string {
  return nodeId.startsWith("seq-") ? nodeId.slice(4) : ""
}

// Pluck the rm uid back out of an rm node id. Returns "" for non-rm ids.
function parseRmUidFromNodeId(nodeId: string): string {
  return nodeId.startsWith("rm-") ? nodeId.slice(3) : ""
}

// ============================================================================
// Public component
// ============================================================================

export function RouteGraphFlow({
  graph,
  locked = false,
  onAddStage,
  onStagePositionChange,
  onRmPositionChange,
  onConnectStages,
  onStageClick,
  onEdgeClick,
  onDropOnPane,
}: Props) {
  const { nodes, edges } = useMemo(() => buildFlow(graph), [graph])
  const { resolvedTheme } = useTheme()
  const colorMode = resolvedTheme === "dark" ? "dark" : "light"

  // Pending connect state — captured on onConnectStart, consumed on
  // onConnectEnd if the drop landed on the empty pane (not on another node).
  const pendingConnectRef = useRef<
    null | { sourceSeqUid: string; handleType: "source" | "target" }
  >(null)

  const handleNodeDragStop = useCallback<NodeMouseHandler>(
    (_event, node) => {
      if (locked) return
      if (node.type === "stage") {
        if (!onStagePositionChange) return
        const seqUid = parseSeqUidFromNodeId(node.id)
        if (!seqUid) return
        onStagePositionChange(seqUid, node.position.x, node.position.y)
        return
      }
      if (node.type === "rm") {
        if (!onRmPositionChange) return
        const rmUid = parseRmUidFromNodeId(node.id)
        if (!rmUid) return
        onRmPositionChange(rmUid, node.position.x, node.position.y)
      }
    },
    [locked, onStagePositionChange, onRmPositionChange],
  )

  const handleConnect = useCallback(
    (conn: Connection) => {
      if (locked || !onConnectStages) return
      if (!conn.source || !conn.target) return
      // Only stage↔stage links are meaningful. Reject if either end is an rm-* node.
      if (!conn.source.startsWith("seq-") || !conn.target.startsWith("seq-")) return
      const srcSeqUid = parseSeqUidFromNodeId(conn.source)
      const tgtSeqUid = parseSeqUidFromNodeId(conn.target)
      if (!srcSeqUid || !tgtSeqUid) return
      onConnectStages(srcSeqUid, tgtSeqUid)
    },
    [locked, onConnectStages],
  )

  const handleNodeClick = useCallback<NodeMouseHandler>(
    (_event, node) => {
      if (!onStageClick) return
      if (node.type !== "stage") return
      const seqUid = parseSeqUidFromNodeId(node.id)
      if (!seqUid) return
      onStageClick(seqUid)
    },
    [onStageClick],
  )

  const handleConnectStart = useCallback<OnConnectStart>(
    (_event, params) => {
      if (locked || !onDropOnPane) return
      if (!params.nodeId || !params.nodeId.startsWith("seq-")) return
      const seqUid = parseSeqUidFromNodeId(params.nodeId)
      if (!seqUid) return
      pendingConnectRef.current = {
        sourceSeqUid: seqUid,
        handleType: params.handleType ?? "source",
      }
    },
    [locked, onDropOnPane, pendingConnectRef],
  )

  const handleConnectEnd = useCallback<OnConnectEnd>(
    (event) => {
      const pending = pendingConnectRef.current
      pendingConnectRef.current = null
      if (locked || !onDropOnPane || !pending) return
      const target = event.target as HTMLElement | null
      // React Flow tags the empty canvas element with .react-flow__pane.
      const droppedOnPane = !!target?.classList?.contains("react-flow__pane")
      if (!droppedOnPane) return
      onDropOnPane(pending.sourceSeqUid, pending.handleType)
    },
    [locked, onDropOnPane, pendingConnectRef],
  )

  const handleEdgeClick = useCallback<EdgeMouseHandler>(
    (_event, edge) => {
      if (!onEdgeClick) return
      const data = edge.data as EdgeData | undefined
      if (!data || !data.rmUid) return
      onEdgeClick(data.rmUid)
    },
    [onEdgeClick],
  )

  return (
    <div className="h-[600px] rounded border bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        colorMode={colorMode}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesDraggable={!locked}
        elementsSelectable
        nodesConnectable={!locked}
        onNodeDragStop={handleNodeDragStop}
        onConnect={handleConnect}
        onConnectStart={handleConnectStart}
        onConnectEnd={handleConnectEnd}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
      >
        {onAddStage && (
          <Panel position="top-right">
            <Button onClick={onAddStage} size="sm">
              <Plus className="mr-1 h-4 w-4" /> Add stage
            </Button>
          </Panel>
        )}
        <Background gap={24} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  )
}
