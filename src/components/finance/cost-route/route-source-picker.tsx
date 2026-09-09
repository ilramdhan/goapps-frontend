"use client"

// RouteSourcePicker — shared search + level/RM-count preview sub-component
// for picking an existing route to attach/splice. Used by both:
//   - AttachRouteDialog (F3): replaces a whole (empty) target product's
//     graph with a copy of the source route.
//   - route-graph-editor.tsx's AddRmDialog "Attach an existing route" mode
//     (B4): splices a copy of the source route's graph in at a single RM
//     slot, at whatever level that slot sits at.
//
// DRAFT-status routes are never selectable in either flow — a DRAFT source
// could still change under whatever attaches it. Candidates are restricted
// to COMPLETE or LOCKED routes via two server-side-filtered ListRoutes
// queries (status=COMPLETE, status=LOCKED), merged + deduped client-side.
// See the B2 finding in the STATE ledger: the existing ListRoutes/ListHeads
// query already supports server-side filtering by a single status value
// (`Filter.Status` in costroute/types.go), so issuing one call per accepted
// status gets genuine server-side filtering with zero backend/proto
// changes — no dedicated "list attachable routes" RPC needed. The
// self-reference guard (costroute.ErrSelfReferencingRoute, graph.go) is the
// real enforcement backstop regardless of what this picker shows; this
// filter is a UX guard on top of it.
import { Loader2 } from "lucide-react"
import { useMemo, useState } from "react"

import { DebouncedSearchInput } from "@/components/common/debounced-search-input"
import { StatusBadge } from "@/components/common/status-badge"
import { useRouteGraph, useRoutes } from "@/hooks/finance/use-cost-route"
import { type CostRouteHead, type RouteGraph, getRouteLevelSummary } from "@/types/finance/cost-route"

export type RouteSourcePickerStep = "pick" | "confirm"

export interface RouteSourcePickerState {
  step: RouteSourcePickerStep
  search: string
  setSearch: (v: string) => void
  isListLoading: boolean
  /** COMPLETE/LOCKED routes only, excluding the given product, deduped + sorted by product code. */
  candidates: CostRouteHead[]
  selectedHeadId: number | undefined
  selectedRoute: CostRouteHead | undefined
  sourceGraph: RouteGraph | null | undefined
  isGraphLoading: boolean
  levelSummary: string
  pick: (headId: number) => void
  back: () => void
  reset: () => void
}

/**
 * Drives the search/select/preview state for a route-source picker.
 * `excludeProductSysId` keeps a product from attaching a route onto/into
 * itself at the picker level (the real enforcement is the server-side
 * self-reference guard on SaveGraph — this is just a same-product UX
 * shortcut, since a route can never usefully attach its own product's route
 * back onto itself).
 */
export function useRouteSourcePicker(excludeProductSysId: number): RouteSourcePickerState {
  const [step, setStep] = useState<RouteSourcePickerStep>("pick")
  const [search, setSearchState] = useState("")
  const [selectedHeadId, setSelectedHeadId] = useState<number | undefined>(undefined)

  const complete = useRoutes({ search, status: "COMPLETE", pageSize: 20 })
  const locked = useRoutes({ search, status: "LOCKED", pageSize: 20 })
  const isListLoading = complete.isLoading || locked.isLoading

  const candidates = useMemo(() => {
    const merged = [...(complete.data?.items ?? []), ...(locked.data?.items ?? [])]
    const seen = new Set<number>()
    const deduped: CostRouteHead[] = []
    for (const h of merged) {
      if (seen.has(h.headId)) continue
      seen.add(h.headId)
      deduped.push(h)
    }
    return deduped
      .filter((h) => h.productSysId !== excludeProductSysId && h.levelCount > 0)
      .sort((a, b) => (a.productCode || "").localeCompare(b.productCode || ""))
  }, [complete.data, locked.data, excludeProductSysId])

  const { data: sourceGraph, isLoading: isGraphLoading } = useRouteGraph(
    step === "confirm" ? selectedHeadId : undefined,
  )
  const selectedRoute = useMemo(
    () => candidates.find((h) => h.headId === selectedHeadId),
    [candidates, selectedHeadId],
  )
  const levelSummary = getRouteLevelSummary(sourceGraph)

  return {
    step,
    search,
    setSearch: setSearchState,
    isListLoading,
    candidates,
    selectedHeadId,
    selectedRoute,
    sourceGraph,
    isGraphLoading,
    levelSummary,
    pick: (headId: number) => {
      setSelectedHeadId(headId)
      setStep("confirm")
    },
    back: () => setStep("pick"),
    reset: () => {
      setStep("pick")
      setSearchState("")
      setSelectedHeadId(undefined)
    },
  }
}

/** The "pick" step: search input + candidate list. */
export function RouteSourcePickerList({ state }: { state: RouteSourcePickerState }) {
  return (
    <div className="space-y-3">
      <DebouncedSearchInput
        value={state.search}
        onValueChange={state.setSearch}
        placeholder="Search source product by code or name…"
        autoFocus
      />
      <div className="max-h-80 overflow-y-auto rounded-md border divide-y">
        {state.isListLoading && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading routes…
          </div>
        )}
        {!state.isListLoading && state.candidates.length === 0 && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No COMPLETE or LOCKED route matches your search.
          </div>
        )}
        {state.candidates.map((h) => (
          <button
            key={h.headId}
            type="button"
            onClick={() => state.pick(h.headId)}
            className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/50"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{h.productCode || `Product #${h.productSysId}`}</span>
                <StatusBadge status={h.routingStatus} type="route" size="sm" />
              </div>
              {h.productName && <div className="truncate text-xs text-muted-foreground">{h.productName}</div>}
            </div>
            <div className="shrink-0 text-right text-xs text-muted-foreground">
              <div>{h.levelCount} levels</div>
              <div>{h.rmCount} RM</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

/** The "confirm" step: source/target summary grid + level breakdown. Callers append their own alerts/notes as children. */
export function RouteSourcePreview({
  state,
  targetLabel,
  targetSublabel,
  children,
}: {
  state: RouteSourcePickerState
  targetLabel: string
  targetSublabel?: string
  children?: React.ReactNode
}) {
  const route = state.selectedRoute
  if (!route) return null
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 rounded-md border p-3 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">Source product</div>
          <div className="font-medium">{route.productCode || `#${route.productSysId}`}</div>
          {route.productName && <div className="text-xs text-muted-foreground">{route.productName}</div>}
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Target</div>
          <div className="font-medium">{targetLabel}</div>
          {targetSublabel && <div className="text-xs text-muted-foreground">{targetSublabel}</div>}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="text-xs text-muted-foreground">Route levels (upstream → FG)</div>
        {state.isGraphLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading route graph…
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm font-mono">
            <span className="break-words">{state.levelSummary || "—"}</span>
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          {route.levelCount} levels · {route.rmCount} raw material entries
        </div>
      </div>

      {children}
    </div>
  )
}
