// CostRoute types — persisted routing DAG (cost_route_head/seq/rm).
// Replaces the dropped cost_product_order types as of S7.16.

export type RouteStatus = "DRAFT" | "COMPLETE" | "LOCKED"
export type RmRefType = "PRODUCT" | "ITEM" | "GROUP"

export interface CostRouteHead {
  headId: number
  productSysId: number
  productCode?: string
  productName?: string
  routingStatus: RouteStatus
  version: number
  promotedFromDraftId?: number
  cylTypeId?: number
  notes?: string
  lockedBy: string
  lockedAt: string
  unlockedBy: string
  unlockedAt: string
  // Read-time aggregates from ListRoutes (distinct route levels / total RM entries).
  levelCount: number
  rmCount: number
}

export interface CostRouteRm {
  // Stable client-side id — assigned on hydration + creation so React keys,
  // React Flow node/edge ids, and edit-panel lookups never collide when the
  // DB id is still 0 (unsaved). Never sent to / read from the backend.
  uid: string
  rmId: number
  seqId: number
  parentProductSysId: number
  rmType: RmRefType
  rmProductSysId?: number
  rmItemCode?: string
  rmGroupCode?: string
  rmGroupName?: string
  routeRmName?: string
  routeRmItemCode?: string
  routeRmShadeCode?: string
  routeRmShadeName?: string
  routeRmRatio: number
  uomId?: number
  subType?: string
  notes?: string
  // Persisted free node position for ITEM/GROUP RM nodes (0 = auto-layout).
  positionX?: number
  positionY?: number
}

export interface CostRouteSeq {
  // Stable client-side id — see CostRouteRm.uid.
  uid: string
  seqId: number
  headId: number
  productSysId: number
  productCode?: string
  productName?: string
  routeLevel: number
  routeSeq: number
  routeName?: string
  routeItemCode?: string
  routeShadeCode?: string
  routeShadeName?: string
  positionX: number
  positionY: number
  rms: CostRouteRm[]
}

export interface RouteGraph {
  head: CostRouteHead
  seqs: CostRouteSeq[]
}

export interface ListRoutesParams {
  search?: string
  status?: RouteStatus | ""
  page?: number
  pageSize?: number
  sortBy?: "created_at" | "product_code" | "status" | "head_id" | "version" | "level_count" | "rm_count" | ""
  sortOrder?: "asc" | "desc" | ""
}

// ---------- client uid ----------

/**
 * newUid — stable client-side identifier for a seq/rm. Independent of the DB
 * id (which is 0 until the graph is saved). Used for React keys, React Flow
 * node/edge ids, and edit-panel lookups so newly-added elements are
 * clickable/editable before save and deletes target exactly one element.
 */
export function newUid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `uid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

// ---------- normalizers (handle both camel + snake_case) ----------

const str = (v: unknown): string => (typeof v === "string" ? v : "")
const num = (v: unknown): number => (typeof v === "number" ? v : Number(v ?? 0))
const numOpt = (v: unknown): number | undefined => {
  if (v === undefined || v === null || v === "" || v === 0 || v === "0") return undefined
  return Number(v)
}

export function normalizeCostRouteRm(raw: Record<string, unknown>): CostRouteRm {
  return {
    uid: newUid(),
    rmId: num(raw.rmId ?? raw.rm_id),
    seqId: num(raw.seqId ?? raw.seq_id),
    parentProductSysId: num(raw.parentProductSysId ?? raw.parent_product_sys_id),
    rmType: (str(raw.rmType ?? raw.rm_type) || "ITEM") as RmRefType,
    rmProductSysId: numOpt(raw.rmProductSysId ?? raw.rm_product_sys_id),
    rmItemCode: str(raw.rmItemCode ?? raw.rm_item_code) || undefined,
    rmGroupCode: str(raw.rmGroupCode ?? raw.rm_group_code) || undefined,
    rmGroupName: str(raw.rmGroupName ?? raw.rm_group_name) || undefined,
    routeRmName: str(raw.routeRmName ?? raw.route_rm_name) || undefined,
    routeRmItemCode: str(raw.routeRmItemCode ?? raw.route_rm_item_code) || undefined,
    routeRmShadeCode: str(raw.routeRmShadeCode ?? raw.route_rm_shade_code) || undefined,
    routeRmShadeName: str(raw.routeRmShadeName ?? raw.route_rm_shade_name) || undefined,
    routeRmRatio: Number(raw.routeRmRatio ?? raw.route_rm_ratio ?? 1),
    uomId: numOpt(raw.uomId ?? raw.uom_id),
    subType: str(raw.subType ?? raw.sub_type) || undefined,
    notes: str(raw.notes) || undefined,
    positionX: Number(raw.positionX ?? raw.position_x ?? 0),
    positionY: Number(raw.positionY ?? raw.position_y ?? 0),
  }
}

export function normalizeCostRouteSeq(raw: Record<string, unknown>): CostRouteSeq {
  const rms = (raw.rms as unknown[]) ?? []
  return {
    uid: newUid(),
    seqId: num(raw.seqId ?? raw.seq_id),
    headId: num(raw.headId ?? raw.head_id),
    productSysId: num(raw.productSysId ?? raw.product_sys_id),
    productCode: str(raw.productCode ?? raw.product_code) || undefined,
    productName: str(raw.productName ?? raw.product_name) || undefined,
    routeLevel: num(raw.routeLevel ?? raw.route_level),
    routeSeq: num(raw.routeSeq ?? raw.route_seq),
    routeName: str(raw.routeName ?? raw.route_name) || undefined,
    routeItemCode: str(raw.routeItemCode ?? raw.route_item_code) || undefined,
    routeShadeCode: str(raw.routeShadeCode ?? raw.route_shade_code) || undefined,
    routeShadeName: str(raw.routeShadeName ?? raw.route_shade_name) || undefined,
    positionX: Number(raw.positionX ?? raw.position_x ?? 0),
    positionY: Number(raw.positionY ?? raw.position_y ?? 0),
    rms: rms.map((r) => normalizeCostRouteRm(r as Record<string, unknown>)),
  }
}

export function normalizeCostRouteHead(raw: Record<string, unknown>): CostRouteHead {
  return {
    headId: num(raw.headId ?? raw.head_id),
    productSysId: num(raw.productSysId ?? raw.product_sys_id),
    productCode: str(raw.productCode ?? raw.product_code) || undefined,
    productName: str(raw.productName ?? raw.product_name) || undefined,
    routingStatus: (str(raw.routingStatus ?? raw.routing_status) || "DRAFT") as RouteStatus,
    version: num(raw.version) || 1,
    promotedFromDraftId: numOpt(raw.promotedFromDraftId ?? raw.promoted_from_draft_id),
    cylTypeId: numOpt(raw.cylTypeId ?? raw.cyl_type_id),
    notes: str(raw.notes) || undefined,
    lockedBy: str(raw.lockedBy ?? raw.locked_by),
    lockedAt: str(raw.lockedAt ?? raw.locked_at),
    unlockedBy: str(raw.unlockedBy ?? raw.unlocked_by),
    unlockedAt: str(raw.unlockedAt ?? raw.unlocked_at),
    levelCount: num(raw.levelCount ?? raw.level_count),
    rmCount: num(raw.rmCount ?? raw.rm_count),
  }
}

export function normalizeRouteGraph(raw: Record<string, unknown>): RouteGraph {
  const head = (raw.head ?? {}) as Record<string, unknown>
  const seqs = (raw.seqs as unknown[]) ?? []
  return {
    head: normalizeCostRouteHead(head),
    seqs: seqs.map((s) => normalizeCostRouteSeq(s as Record<string, unknown>)),
  }
}

/**
 * Returns the route-graph sequences (products) sitting at a given route
 * level, or an empty array if the graph/level isn't available yet. Shared
 * by the fill-entry flow (FillParamEntryPage, FillParamDrawer) and the fill
 * tracking cards (FillTaskRow, FillTrackingCompact) so the "products at this
 * level" filter logic lives in exactly one place.
 */
export function getProductsAtLevel(
  graph: RouteGraph | null | undefined,
  level: number | undefined,
): CostRouteSeq[] {
  if (!graph || level === undefined) return []
  return graph.seqs.filter((s) => s.routeLevel === level)
}
