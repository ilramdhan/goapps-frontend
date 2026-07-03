"use client"

// RouteGraphEditor — level-based editor for cost_route_seq + cost_route_rm.
//
// Model is level-based (1 = FG, 2..N = upstream). Each level renders as a row
// of stage cards; each card lists its RM inputs (PRODUCT / GROUP).
//
// **UX rule (enforced):** users NEVER see or type a UUID / sys_id. Every
// reference is picked via a combobox keyed on human-readable code/name.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import { isValidProductRmEdge } from "@/components/finance/cost-route/dag-rules"
import {
  ArrowLeft,
  CheckCircle2,
  GitFork,
  Loader2,
  Lock,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react"
import Link from "next/link"

import { CalculateButton } from "@/components/finance/calc-jobs/calculate-button"
import { ProductMasterCombobox } from "@/components/finance/comboboxes/product-master-combobox"
import { DuplicateRouteDialog } from "@/components/finance/cost-route/duplicate-route-dialog"
import { LinkedRequestsPopover } from "@/components/finance/cost-route/linked-requests-popover"
import { RouteGraphEditPanel } from "@/components/finance/cost-route/route-graph-edit-panel"
import { RouteGraphFlow } from "@/components/finance/cost-route/route-graph-flow"
import { StatusBadge } from "@/components/common/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/shared"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useCompleteRoute,
  useDeleteRoute,
  useRouteGraph,
  useSaveRouteGraph,
} from "@/hooks/finance/use-cost-route"
import { useRMGroups } from "@/hooks/finance/use-rm-group"
import type {
  CostRouteRm,
  CostRouteSeq,
  RmRefType,
  RouteGraph,
} from "@/types/finance/cost-route"
import { cn } from "@/lib/utils"

interface Props {
  headId: number
}

export function RouteGraphEditor({ headId }: Props) {
  const { data: persisted, isLoading } = useRouteGraph(headId)
  const [working, setWorking] = useState<RouteGraph | null>(null)
  // Mirror `working` into a ref so F3's deferred link callback can read the
  // freshly-mutated graph without re-rendering.
  const workingRef = useRef<RouteGraph | null>(null)
  const [dirty, setDirty] = useState(false)
  const [stageDialogState, setStageDialogState] = useState<
    | { open: false }
    | { open: true; defaultLevel?: number; linkToSeqId?: number; linkDirection?: "upstream" | "downstream" }
  >({ open: false })
  const [forkOpen, setForkOpen] = useState(false)
  const [rmDialog, setRmDialog] = useState<{ seqIdx: number } | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [view, setView] = useState<"visual" | "cards">("visual")
  // Inline edit-panel selection — only one of these is set at a time.
  const [selectedSeqId, setSelectedSeqId] = useState<number | null>(null)
  const [selectedRmId, setSelectedRmId] = useState<number | null>(null)

  useEffect(() => {
    workingRef.current = working
  }, [working])

  const saveM = useSaveRouteGraph()
  const completeM = useCompleteRoute()
  const deleteM = useDeleteRoute()

  const graph = working ?? persisted ?? null
  const head = graph?.head ?? null
  const seqs = graph?.seqs ?? []
  const locked = head?.routingStatus === "LOCKED"
  const complete = head?.routingStatus === "COMPLETE"

  const seqsByLevel = useMemo(() => {
    const groups = new Map<number, CostRouteSeq[]>()
    for (const s of seqs) {
      const lst = groups.get(s.routeLevel) ?? []
      lst.push(s)
      groups.set(s.routeLevel, lst)
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => a - b)
      .map(([level, list]) => ({ level, list: list.sort((a, b) => a.routeSeq - b.routeSeq) }))
  }, [seqs])

  // Products available to feed a stage at level L: those produced at level > L.
  const upstreamProductsForLevel = useCallback(
    (level: number) => {
      const out: { productSysId: number; productCode?: string; productName?: string; level: number }[] = []
      const seen = new Set<number>()
      for (const s of seqs) {
        if (s.routeLevel > level && !seen.has(s.productSysId)) {
          seen.add(s.productSysId)
          out.push({
            productSysId: s.productSysId,
            productCode: s.productCode,
            productName: s.productName,
            level: s.routeLevel,
          })
        }
      }
      return out
    },
    [seqs],
  )

  const ensureWorking = useCallback((): RouteGraph | null => {
    if (working) return working
    if (!persisted) return null
    const clone = JSON.parse(JSON.stringify(persisted)) as RouteGraph
    setWorking(clone)
    return clone
  }, [working, persisted])

  // ---------- stage actions ----------
  // addStage returns the index of the newly-pushed seq in the next graph's
  // seqs array, so callers (e.g. F3 drop-on-pane) can immediately link it.
  // Because setState is async, we resolve the next index via a promise-like
  // callback pattern — actually we just append + return its index via a
  // synchronous read of the existing length BEFORE the setter runs. This
  // works because we always append at the end.
  const addStage = (
    level: number,
    productSysId: number,
    productCode?: string,
    productName?: string,
    meta?: { routeName?: string; routeItemCode?: string; routeShadeCode?: string; routeShadeName?: string },
  ): { newSeqIdx: number } => {
    let newSeqIdx = -1
    setWorking((prev) => {
      const base = prev ?? (persisted ? (JSON.parse(JSON.stringify(persisted)) as RouteGraph) : null)
      if (!base) return prev
      const existing = base.seqs.filter((s) => s.routeLevel === level).length
      base.seqs.push({
        seqId: 0,
        headId,
        productSysId,
        productCode,
        productName,
        routeLevel: level,
        routeSeq: existing + 1,
        routeName: meta?.routeName || undefined,
        routeItemCode: meta?.routeItemCode || undefined,
        routeShadeCode: meta?.routeShadeCode || undefined,
        routeShadeName: meta?.routeShadeName || undefined,
        positionX: 0,
        positionY: 0,
        rms: [],
      })
      newSeqIdx = base.seqs.length - 1
      return { ...base, seqs: [...base.seqs] }
    })
    setDirty(true)
    return { newSeqIdx }
  }

  const deleteStage = (seqIdx: number) => {
    setWorking((prev) => {
      const base = prev ?? (persisted ? (JSON.parse(JSON.stringify(persisted)) as RouteGraph) : null)
      if (!base) return prev
      return { ...base, seqs: base.seqs.filter((_, i) => i !== seqIdx) }
    })
    setDirty(true)
  }

  // ---------- rm actions ----------
  const addRm = (seqIdx: number, rm: CostRouteRm) => {
    setWorking((prev) => {
      const base = prev ?? (persisted ? (JSON.parse(JSON.stringify(persisted)) as RouteGraph) : null)
      if (!base) return prev
      const seq = base.seqs[seqIdx]
      if (!seq) return base
      const updatedSeq = { ...seq, rms: [...(seq.rms ?? []), { ...rm, seqId: seq.seqId, parentProductSysId: seq.productSysId }] }
      const updatedSeqs = [...base.seqs]
      updatedSeqs[seqIdx] = updatedSeq
      return { ...base, seqs: updatedSeqs }
    })
    setDirty(true)
  }

  const setHeadNotes = (notes: string) => {
    setWorking((prev) => {
      const base = prev ?? (persisted ? (JSON.parse(JSON.stringify(persisted)) as RouteGraph) : null)
      if (!base) return prev
      return { ...base, head: { ...base.head, notes } }
    })
    setDirty(true)
  }

  const deleteRm = (seqIdx: number, rmIdx: number) => {
    setWorking((prev) => {
      const base = prev ?? (persisted ? (JSON.parse(JSON.stringify(persisted)) as RouteGraph) : null)
      if (!base) return prev
      const updatedSeqs = base.seqs.map((seq, i) =>
        i === seqIdx
          ? { ...seq, rms: seq.rms.filter((_, j) => j !== rmIdx) }
          : seq,
      )
      return { ...base, seqs: updatedSeqs }
    })
    setDirty(true)
  }

  // ---------- React Flow native actions ----------

  // Persist a stage's drag position.
  const updateSeqPosition = useCallback(
    (seqId: number, x: number, y: number) => {
      setWorking((prev) => {
        const base = prev ?? (persisted ? (JSON.parse(JSON.stringify(persisted)) as RouteGraph) : null)
        if (!base) return prev
        const seq = base.seqs.find((s) => s.seqId === seqId)
        if (!seq) return base
        if (seq.positionX === x && seq.positionY === y) return base
        seq.positionX = x
        seq.positionY = y
        return { ...base, seqs: [...base.seqs] }
      })
      setDirty(true)
    },
    [persisted],
  )

  // Add a PRODUCT-RM by drawing an edge from upstream → downstream stage.
  const addProductRmFromEdge = useCallback(
    (upstreamSeqId: number, downstreamSeqId: number) => {
      if (locked) return
      const current = working ?? persisted
      if (!current) return
      const upstream = current.seqs.find((s) => s.seqId === upstreamSeqId)
      const downstream = current.seqs.find((s) => s.seqId === downstreamSeqId)
      if (!upstream || !downstream) return
      const verdict = isValidProductRmEdge(current, upstream, downstream)
      if (!verdict.ok) {
        toast.error(verdict.reason)
        return
      }
      const downstreamIdx = current.seqs.indexOf(downstream)
      addRm(downstreamIdx, {
        rmId: 0,
        seqId: downstream.seqId,
        parentProductSysId: downstream.productSysId,
        rmType: "PRODUCT",
        rmProductSysId: upstream.productSysId,
        routeRmName: upstream.productCode
          ? `${upstream.productCode}${upstream.productName ? " — " + upstream.productName : ""}`
          : upstream.productName,
        routeRmRatio: 1,
      })
      toast.success("Linked stages — saved as PRODUCT input.")
    },
    [locked, working, persisted, addRm],
  )

  // Click stage node → open inline edit panel (stays on React Flow view).
  // We still keep stageCardRefs so the "Open in Cards view" escape hatch can
  // scroll to the right card.
  const stageCardRefs = useRef<Map<number, HTMLDivElement | null>>(new Map())
  const handleStageClick = useCallback((seqId: number) => {
    if (seqId === 0) {
      toast.info("Save the route first to edit this element.")
      return
    }
    setSelectedRmId(null)
    setSelectedSeqId(seqId)
  }, [])

  // Click edge → open inline edit panel for that RM.
  const handleEdgeClick = useCallback((rmId: number) => {
    if (rmId === 0) {
      toast.info("Save the route first to edit this element.")
      return
    }
    setSelectedSeqId(null)
    setSelectedRmId(rmId)
  }, [])

  // Update a single RM's ratio (used by both seq-panel rows + rm-panel).
  const updateRmRatio = useCallback(
    (seqIdx: number, rmIdx: number, next: number) => {
      if (!Number.isFinite(next) || next <= 0) return
      setWorking((prev) => {
        const base = prev ?? (persisted ? (JSON.parse(JSON.stringify(persisted)) as RouteGraph) : null)
        if (!base) return prev
        const seq = base.seqs[seqIdx]
        if (!seq) return base
        const targetRm = seq.rms[rmIdx]
        if (!targetRm) return base
        targetRm.routeRmRatio = next
        return { ...base, seqs: [...base.seqs] }
      })
      setDirty(true)
    },
    [persisted],
  )

  // F3 — user drew from a node handle and dropped on the empty canvas. Open
  // AddStageDialog pre-filled with a level hint and a "link back to source"
  // intent. The dialog's onAdd callback will append the new stage and link.
  const handleDropOnPane = useCallback(
    (sourceSeqId: number, handleType: "source" | "target") => {
      if (locked) return
      const current = working ?? persisted
      if (!current) return
      const sourceSeq = current.seqs.find((s) => s.seqId === sourceSeqId)
      if (!sourceSeq) return
      // handleType === "source" = dragged from the BOTTOM handle = adding a
      // DOWNSTREAM stage (one level shallower than source).
      // handleType === "target" = dragged from the TOP handle = adding an
      // UPSTREAM stage (one level deeper than source).
      const linkDirection: "upstream" | "downstream" =
        handleType === "target" ? "upstream" : "downstream"
      const defaultLevel =
        linkDirection === "upstream"
          ? sourceSeq.routeLevel + 1
          : Math.max(1, sourceSeq.routeLevel - 1)
      setStageDialogState({
        open: true,
        defaultLevel,
        linkToSeqId: sourceSeqId,
        linkDirection,
      })
    },
    [locked, working, persisted],
  )

  if (isLoading || !graph) {
    return (
      <div className="flex h-96 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading route graph…
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link href="/finance/routes">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back to routes
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">
            {head?.productCode ? `${head.productCode}` : "Route"}
            {head?.productName ? <span className="ml-2 text-base font-normal text-muted-foreground">{head.productName}</span> : null}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <StatusBadge status={head?.routingStatus} type="route" size="sm" />
            <span>version v{head?.version}</span>
            {head?.promotedFromDraftId ? <span>· promoted from a routing draft</span> : null}
          </div>
          {!locked && (
            <details className="mt-2">
              <summary className="cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground transition-colors">
                {head?.notes ? "Edit notes" : "Add notes (optional)"}
              </summary>
              <Textarea
                placeholder="Routing notes (optional)…"
                className="mt-1.5 h-14 resize-none text-xs"
                value={head?.notes ?? ""}
                onChange={(e) => setHeadNotes(e.target.value)}
              />
            </details>
          )}
          {locked && head?.notes && (
            <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">{head.notes}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkedRequestsPopover headId={headId} />
          <CalculateButton
            routeHeadId={headId}
            size="sm"
            disabled={head?.routingStatus === "DRAFT"}
            disabledReason="Mark route COMPLETE before calculating"
          />
          <Button variant="outline" size="sm" onClick={() => setForkOpen(true)}>
            <GitFork className="mr-1 h-4 w-4" /> Fork
          </Button>
          {!locked && (
            <Button onClick={() => setStageDialogState({ open: true })} variant="outline">
              <Plus className="mr-1 h-4 w-4" /> Add stage
            </Button>
          )}
          {dirty && !locked && (
            <Button onClick={() => saveM.mutate({ headId, graph: graph! })} disabled={saveM.isPending}>
              <Save className="mr-1 h-4 w-4" /> {saveM.isPending ? "Saving…" : "Save draft"}
            </Button>
          )}
          {head?.routingStatus === "DRAFT" && (
            <Button onClick={() => completeM.mutate({ headId })} variant="outline">
              <CheckCircle2 className="mr-1 h-4 w-4" /> Mark complete
            </Button>
          )}
          {!locked && (
            <Button
              onClick={() => setDeleteConfirmOpen(true)}
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="mr-1 h-4 w-4" /> Delete
            </Button>
          )}
        </div>
      </div>

      {locked && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
          <Lock className="h-4 w-4 shrink-0" />
          Route is <strong>LOCKED</strong> — editing disabled. Manage lock from the product request detail page.
        </div>
      )}

      {complete && (
        <Card className="border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          Status: COMPLETE. Edits are still allowed — Lock the route to freeze it for calculation.
        </Card>
      )}

      {/* View toggle */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={view === "visual" ? "default" : "outline"}
          onClick={() => setView("visual")}
        >
          Visual (React Flow)
        </Button>
        <Button
          size="sm"
          variant={view === "cards" ? "default" : "outline"}
          onClick={() => setView("cards")}
        >
          Cards
        </Button>
      </div>

      {seqsByLevel.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          No stages yet. Add the level-1 stage that produces this FG product.
        </Card>
      )}

      {view === "visual" && seqsByLevel.length > 0 && graph && (
        <div className="relative">
          <RouteGraphFlow
            graph={graph}
            locked={locked}
            onAddStage={!locked ? () => setStageDialogState({ open: true }) : undefined}
            onNodePositionChange={updateSeqPosition}
            onConnectStages={addProductRmFromEdge}
            onStageClick={handleStageClick}
            onEdgeClick={handleEdgeClick}
            onDropOnPane={!locked ? handleDropOnPane : undefined}
          />
          {/* Inline edit panel — Bug 2 (stage) + Bug 5 (RM edge). */}
          <EditPanelHost
            graph={graph}
            locked={locked}
            selectedSeqId={selectedSeqId}
            selectedRmId={selectedRmId}
            onClose={() => {
              setSelectedSeqId(null)
              setSelectedRmId(null)
            }}
            onChangeRmRatio={updateRmRatio}
            onRemoveRm={(seqIdx, rmIdx) => {
              deleteRm(seqIdx, rmIdx)
              setSelectedRmId(null)
            }}
            onAddRm={(seqIdx) => setRmDialog({ seqIdx })}
            onRemoveStage={(seqIdx) => {
              deleteStage(seqIdx)
              setSelectedSeqId(null)
            }}
            onOpenInCards={(seqId) => {
              setView("cards")
              requestAnimationFrame(() => {
                const el = stageCardRefs.current.get(seqId)
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "center" })
                  el.classList.add("ring-2", "ring-primary")
                  setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 1500)
                }
              })
              setSelectedSeqId(null)
              setSelectedRmId(null)
            }}
          />
        </div>
      )}

      {view === "cards" && seqsByLevel.map(({ level, list }) => (
        <div key={level} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Level {level}
            {level === 1 ? " — Finished good" : ` — Upstream stage ${level - 1}`}
          </h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {list.map((s) => {
              const idx = seqs.indexOf(s)
              return (
                <Card
                  key={`${s.seqId}-${s.routeLevel}-${s.routeSeq}-${idx}`}
                  className="p-3 transition-shadow"
                  ref={(el: HTMLDivElement | null) => {
                    if (s.seqId > 0) {
                      if (el) stageCardRefs.current.set(s.seqId, el)
                      else stageCardRefs.current.delete(s.seqId)
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono text-xs text-muted-foreground">
                        L{s.routeLevel} · seq {s.routeSeq}
                      </div>
                      <div className="font-medium">
                        {s.productCode ? (
                          <>
                            <span className="text-muted-foreground">{s.productCode}</span>
                            {s.productName ? <span className="ml-1">· {s.productName}</span> : null}
                          </>
                        ) : (
                          s.productName || "(no product)"
                        )}
                      </div>
                    </div>
                    {!locked && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-500"
                        onClick={() => deleteStage(idx)}
                        title="Remove stage"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="mt-3 space-y-1">
                    {(s.rms ?? []).length === 0 ? (
                      <div className="text-xs italic text-muted-foreground">No inputs.</div>
                    ) : (
                      s.rms.map((rm, rmIdx) => (
                        <div
                          key={`${rm.rmId}-${rmIdx}`}
                          className="flex items-center justify-between rounded border bg-muted/30 px-2 py-1 text-xs"
                        >
                          <div className="flex min-w-0 items-center gap-2 flex-1">
                            <span className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-medium border ${
                              rm.rmType === "GROUP"
                                ? "border-purple-400 text-purple-700 dark:text-purple-300"
                                : rm.rmType === "PRODUCT"
                                ? "border-emerald-400 text-emerald-700 dark:text-emerald-300"
                                : "border-amber-400 text-amber-700 dark:text-amber-300"
                            }`}>
                              {rm.rmType}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-mono">
                                {rm.routeRmName || rm.rmItemCode || rm.rmGroupCode || "—"}
                              </div>
                              <div className="text-[10px] text-muted-foreground">×{rm.routeRmRatio}</div>
                            </div>
                          </div>
                          {!locked && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-red-500"
                              onClick={() => deleteRm(idx, rmIdx)}
                              title="Remove RM"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                    {!locked && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => setRmDialog({ seqIdx: idx })}
                      >
                        <Plus className="mr-1 h-3 w-3" /> Add RM input
                      </Button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      ))}

      {stageDialogState.open && (
      <AddStageDialog
        open
        onClose={() => setStageDialogState({ open: false })}
        existingLevels={seqsByLevel.map((g) => g.level)}
        defaultLevel={stageDialogState.defaultLevel}
        onAdd={(level, productSysId, productCode, productName, meta) => {
          const { newSeqIdx } = addStage(level, productSysId, productCode, productName, meta)
          // F3 link-after-add: if we opened the dialog by dropping on the pane,
          // wire a PRODUCT-RM between the source seq and the newly-created seq.
          if (stageDialogState.open && stageDialogState.linkToSeqId !== undefined && newSeqIdx >= 0) {
            const sourceSeqId = stageDialogState.linkToSeqId
            const direction = stageDialogState.linkDirection ?? "upstream"
            // Defer one frame so the working state setter has flushed.
            requestAnimationFrame(() => {
              const current = (workingRef.current ?? persisted) as RouteGraph | null
              if (!current) return
              const newSeq = current.seqs[newSeqIdx]
              const sourceSeq = current.seqs.find((s) => s.seqId === sourceSeqId)
              if (!newSeq || !sourceSeq) return
              // Newly-added seq has seqId === 0 (unsaved). PRODUCT-RM expects
              // both ends to exist; we add it by indexing into the seqs array.
              // The dag-rules validator accepts unsaved seqs (seqId !== 0 check
              // is guarded). Pick upstream vs downstream based on direction.
              const [upstream, downstream] =
                direction === "upstream"
                  ? [newSeq, sourceSeq]
                  : [sourceSeq, newSeq]
              const verdict = isValidProductRmEdge(current, upstream, downstream)
              if (!verdict.ok) {
                toast.error(verdict.reason)
                return
              }
              const downstreamIdx = current.seqs.indexOf(downstream)
              if (downstreamIdx < 0) return
              addRm(downstreamIdx, {
                rmId: 0,
                seqId: downstream.seqId,
                parentProductSysId: downstream.productSysId,
                rmType: "PRODUCT",
                rmProductSysId: upstream.productSysId,
                routeRmName: upstream.productCode
                  ? `${upstream.productCode}${upstream.productName ? " — " + upstream.productName : ""}`
                  : upstream.productName,
                routeRmRatio: 1,
              })
              toast.success("Stage added and linked.")
            })
          }
          setStageDialogState({ open: false })
        }}
      />
      )}

      <DuplicateRouteDialog
        open={forkOpen}
        onClose={() => setForkOpen(false)}
        sourceHeadId={headId}
        sourceProductCode={head?.productCode}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete this route?"
        description="This route head and all its stages will be permanently deleted. This cannot be undone."
        variant="destructive"
        confirmText="Delete"
        isLoading={deleteM.isPending}
        onConfirm={() => {
          deleteM.mutate({ headId })
          setDeleteConfirmOpen(false)
        }}
      />

      {rmDialog && (
        <AddRmDialog
          open
          onClose={() => setRmDialog(null)}
          // Stage that's receiving the RM:
          stageLevel={seqs[rmDialog.seqIdx]?.routeLevel ?? 1}
          // Products produced at higher levels are candidates for PRODUCT-type RM:
          upstreamProducts={upstreamProductsForLevel(seqs[rmDialog.seqIdx]?.routeLevel ?? 1)}
          onAdd={(rm) => {
            addRm(rmDialog.seqIdx, rm)
            setRmDialog(null)
          }}
        />
      )}
    </div>
  )
}

// ============================================================================
// Edit-panel render helper — Bug 2 (stage click) + Bug 5 (RM edge click).
// Picks the right panel mode based on selectedSeqId / selectedRmId.
// ============================================================================

function EditPanelHost({
  graph,
  locked,
  selectedSeqId,
  selectedRmId,
  onClose,
  onChangeRmRatio,
  onRemoveRm,
  onAddRm,
  onRemoveStage,
  onOpenInCards,
}: {
  graph: RouteGraph
  locked: boolean
  selectedSeqId: number | null
  selectedRmId: number | null
  onClose: () => void
  onChangeRmRatio: (seqIdx: number, rmIdx: number, next: number) => void
  onRemoveRm: (seqIdx: number, rmIdx: number) => void
  onAddRm: (seqIdx: number) => void
  onRemoveStage: (seqIdx: number) => void
  onOpenInCards: (seqId: number) => void
}) {
  if (selectedSeqId !== null) {
    const seqIdx = graph.seqs.findIndex((s) => s.seqId === selectedSeqId)
    if (seqIdx < 0) return null
    const seq = graph.seqs[seqIdx]
    return (
      <RouteGraphEditPanel
        mode="seq"
        seq={seq}
        locked={locked}
        onClose={onClose}
        onChangeRmRatio={(rmIdx, ratio) => onChangeRmRatio(seqIdx, rmIdx, ratio)}
        onRemoveRm={(rmIdx) => onRemoveRm(seqIdx, rmIdx)}
        onAddRm={() => onAddRm(seqIdx)}
        onRemoveStage={() => onRemoveStage(seqIdx)}
        onOpenInCards={() => onOpenInCards(selectedSeqId)}
      />
    )
  }
  if (selectedRmId !== null) {
    for (let i = 0; i < graph.seqs.length; i += 1) {
      const j = graph.seqs[i].rms.findIndex((r) => r.rmId === selectedRmId)
      if (j >= 0) {
        return (
          <RouteGraphEditPanel
            mode="rm"
            seq={graph.seqs[i]}
            rm={graph.seqs[i].rms[j]}
            rmIdx={j}
            locked={locked}
            onClose={onClose}
            onChangeRatio={(ratio) => onChangeRmRatio(i, j, ratio)}
            onRemove={() => onRemoveRm(i, j)}
          />
        )
      }
    }
  }
  return null
}

// ============================================================================
// Add Stage dialog — picks output product via ProductMasterCombobox.
// ============================================================================

function AddStageDialog({
  open,
  onClose,
  existingLevels,
  defaultLevel,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  existingLevels: number[]
  defaultLevel?: number
  onAdd: (level: number, productSysId: number, productCode?: string, productName?: string, meta?: { routeName?: string; routeItemCode?: string; routeShadeCode?: string; routeShadeName?: string }) => void
}) {
  const nextLevel =
    defaultLevel ?? (existingLevels.length === 0 ? 1 : Math.max(...existingLevels) + 1)
  const [level, setLevel] = useState<number>(nextLevel)
  const [picked, setPicked] = useState<{ id: number; code: string; name: string } | null>(null)
  const [routeName, setRouteName] = useState("")
  const [routeItemCode, setRouteItemCode] = useState("")
  const [routeShadeCode, setRouteShadeCode] = useState("")
  const [routeShadeName, setRouteShadeName] = useState("")

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add stage</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="stage-level">Route level</Label>
            <Input
              id="stage-level"
              type="number"
              min={1}
              value={level}
              onChange={(e) => setLevel(Number(e.target.value) || 1)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              1 = Finished good. Each higher level is one step upstream.
            </p>
          </div>
          <div>
            <Label>Output product *</Label>
            <ProductMasterCombobox
              value={picked?.id}
              onChange={(id, code, name) => setPicked({ id, code, name })}
              placeholder="Search product by code or name…"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              The product this stage produces (intermediate or FG).
            </p>
          </div>
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground select-none">Additional metadata (optional)</summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Route name</Label>
                <Input value={routeName} onChange={(e) => setRouteName(e.target.value)} placeholder="e.g. Main spin" className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">ERP item code</Label>
                <Input value={routeItemCode} onChange={(e) => setRouteItemCode(e.target.value)} placeholder="e.g. ACY0000001" className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Shade code</Label>
                <Input value={routeShadeCode} onChange={(e) => setRouteShadeCode(e.target.value)} placeholder="NL" className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Shade name</Label>
                <Input value={routeShadeName} onChange={(e) => setRouteShadeName(e.target.value)} placeholder="NATURAL" className="h-8 text-xs" />
              </div>
            </div>
          </details>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!picked}
            onClick={() => {
              if (!picked) return
              const meta = {
                routeName: routeName || undefined,
                routeItemCode: routeItemCode || undefined,
                routeShadeCode: routeShadeCode || undefined,
                routeShadeName: routeShadeName || undefined,
              }
              onAdd(level, picked.id, picked.code, picked.name, meta)
            }}
          >
            Add stage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Add RM dialog — discriminator picks combobox flavor.
// ============================================================================

interface UpstreamProduct {
  productSysId: number
  productCode?: string
  productName?: string
  level: number
}

function AddRmDialog({
  open,
  onClose,
  stageLevel,
  upstreamProducts,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  stageLevel: number
  upstreamProducts: UpstreamProduct[]
  onAdd: (rm: CostRouteRm) => void
}) {
  const [rmType, setRmType] = useState<RmRefType>("PRODUCT")
  const [productPick, setProductPick] = useState<UpstreamProduct | null>(null)
  const [groupPick, setGroupPick] = useState<{ code: string; name: string } | null>(null)
  const [ratio, setRatio] = useState("1")
  const [subType, setSubType] = useState("")
  const [shadeCode, setShadeCode] = useState("")
  const [shadeName, setRmShadeName] = useState("")
  const [notes, setNotes] = useState("")

  const isValid =
    Number(ratio) > 0 &&
    ((rmType === "PRODUCT" && !!productPick) ||
      (rmType === "GROUP" && !!groupPick))

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add RM input (feeding stage at level {stageLevel})</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="rm-type">Source</Label>
            <Select
              value={rmType}
              onValueChange={(v) => {
                setRmType(v as RmRefType)
                setProductPick(null)
                setGroupPick(null)
              }}
            >
              <SelectTrigger id="rm-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRODUCT">PRODUCT — from another stage in this routing</SelectItem>
                <SelectItem value="GROUP">GROUP — RM group (cons/stock/PO)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {rmType === "PRODUCT" && (
            <div>
              <Label>Upstream stage (must be at higher level)</Label>
              <UpstreamProductPicker
                candidates={upstreamProducts}
                value={productPick}
                onChange={setProductPick}
              />
              {upstreamProducts.length === 0 && (
                <p className="mt-1 text-xs text-amber-700">
                  No upstream stages yet. Add a stage at level &gt; {stageLevel} first.
                </p>
              )}
            </div>
          )}

          {rmType === "GROUP" && (
            <div>
              <Label>RM group</Label>
              <RmGroupCombobox value={groupPick?.code} onChange={(code, name) => setGroupPick({ code, name })} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rm-ratio">Ratio per output unit *</Label>
              <Input
                id="rm-ratio"
                type="number"
                step="0.01"
                min={0.0001}
                value={ratio}
                onChange={(e) => setRatio(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="rm-subtype">Sub type (optional)</Label>
              <Input
                id="rm-subtype"
                value={subType}
                onChange={(e) => setSubType(e.target.value)}
                placeholder="WARP / WEFT"
              />
            </div>
          </div>
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground select-none">Additional metadata (optional)</summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Shade code</Label>
                <Input value={shadeCode} onChange={(e) => setShadeCode(e.target.value)} placeholder="NL" className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Shade name</Label>
                <Input value={shadeName} onChange={(e) => setRmShadeName(e.target.value)} placeholder="NATURAL" className="h-8 text-xs" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Notes</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes…" className="h-8 text-xs" />
              </div>
            </div>
          </details>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!isValid}
            onClick={() => {
              const ratioNum = Number(ratio) || 1
              const rmExtra = {
                routeRmShadeCode: shadeCode || undefined,
                routeRmShadeName: shadeName || undefined,
                notes: notes || undefined,
                subType: subType || undefined,
              }
              if (rmType === "PRODUCT" && productPick) {
                onAdd({
                  rmId: 0,
                  seqId: 0,
                  parentProductSysId: 0,
                  rmType: "PRODUCT",
                  rmProductSysId: productPick.productSysId,
                  routeRmName: productPick.productCode
                    ? `${productPick.productCode}${productPick.productName ? " — " + productPick.productName : ""}`
                    : productPick.productName,
                  routeRmRatio: ratioNum,
                  ...rmExtra,
                })
                return
              }
              if (rmType === "GROUP" && groupPick) {
                onAdd({
                  rmId: 0,
                  seqId: 0,
                  parentProductSysId: 0,
                  rmType: "GROUP",
                  rmGroupCode: groupPick.code,
                  routeRmName: groupPick.name,
                  routeRmRatio: ratioNum,
                  ...rmExtra,
                })
              }
            }}
          >
            Add input
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// UpstreamProductPicker — restricts to products produced at higher levels in
// the current routing graph (avoid full master search; the candidates list is
// already small).
// ============================================================================

function UpstreamProductPicker({
  candidates,
  value,
  onChange,
}: {
  candidates: UpstreamProduct[]
  value: UpstreamProduct | null
  onChange: (p: UpstreamProduct) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={candidates.length === 0}
          className={cn("w-full justify-between font-normal")}
        >
          {value ? (
            <span className="truncate">
              <span className="text-muted-foreground">{value.productCode}</span>
              {value.productName ? <span className="ml-1">— {value.productName}</span> : null}
              <span className="ml-1 text-xs text-muted-foreground">(L{value.level})</span>
            </span>
          ) : (
            <span className="text-muted-foreground">
              {candidates.length === 0 ? "No upstream stages defined yet…" : "Select upstream product…"}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter>
          <CommandInput placeholder="Filter by product code or name…" />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup>
              {candidates.map((c) => (
                <CommandItem
                  key={`${c.productSysId}`}
                  value={`${c.productCode ?? ""} ${c.productName ?? ""}`}
                  onSelect={() => {
                    onChange(c)
                    setOpen(false)
                  }}
                >
                  <div className="flex w-full items-center justify-between">
                    <span>
                      <span className="text-muted-foreground">{c.productCode}</span>
                      {c.productName ? <span className="ml-1">— {c.productName}</span> : null}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      L{c.level}
                    </Badge>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================================
// RmGroupCombobox — inline, code-driven.
// ============================================================================

function RmGroupCombobox({
  value,
  onChange,
}: {
  value?: string
  onChange: (code: string, name: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { data, isLoading } = useRMGroups({ search, page: 1, pageSize: 50 })
  const groups = (data?.data ?? []) as Array<{ groupCode: string; groupName?: string; group_code?: string; group_name?: string }>
  const selected = groups.find((g) => (g.groupCode || g.group_code) === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          {selected ? (
            <span className="truncate">
              <span className="text-muted-foreground">{selected.groupCode || selected.group_code}</span>
              {(selected.groupName || selected.group_name) ? <span className="ml-1">— {selected.groupName || selected.group_name}</span> : null}
            </span>
          ) : (
            <span className="text-muted-foreground">Select RM group…</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Filter by group code or name…" value={search} onValueChange={setSearch} />
          <CommandList>
            {isLoading && (
              <div className="py-4 text-center text-sm text-muted-foreground">Loading…</div>
            )}
            <CommandEmpty>No RM group matches.</CommandEmpty>
            <CommandGroup>
              {groups.map((g) => {
                const code = g.groupCode || g.group_code || ""
                const name = g.groupName || g.group_name || ""
                return (
                  <CommandItem
                    key={code}
                    value={`${code} ${name}`}
                    onSelect={() => {
                      onChange(code, name)
                      setOpen(false)
                    }}
                  >
                    <span className="text-muted-foreground">{code}</span>
                    {name ? <span className="ml-1">— {name}</span> : null}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
