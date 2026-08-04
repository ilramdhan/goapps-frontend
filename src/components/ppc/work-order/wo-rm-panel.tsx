"use client"

import { useMemo, useState } from "react"
import { Loader2, Plus, Trash2, Pencil, Sparkles, Info } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ScrollableDialogBody,
  ScrollableDialogContent,
  ScrollableDialogFooter,
  ScrollableDialogHeader,
} from "@/components/common/scrollable-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyState } from "@/components/common"
import { RmCombobox, type RmOption } from "@/components/ppc/comboboxes"

import type { WorkOrder, WORmAllocationInput, WORmAllocation } from "@/types/ppc/work-order"
import { RMSource, humanizeEnumValue } from "@/types/ppc/common"
import { RMSource as RMSourceEnum } from "@/types/generated/ppc/v1/common"
import { rMSourceToJSON } from "@/types/generated/ppc/v1/common"
import { useSaveWORmAllocations, useSuggestWORmAllocations } from "@/hooks/ppc/use-work-order"

const RM_SOURCE_OPTIONS = [
  { value: RMSourceEnum.RM_SOURCE_STORE, label: "Store" },
  { value: RMSourceEnum.RM_SOURCE_CAPTIVE, label: "Captive" },
  { value: RMSourceEnum.RM_SOURCE_MIXED, label: "Mixed" },
]

interface WORmPanelProps {
  workOrder: WorkOrder
}

/**
 * Where an editor line came from, for the S-5.4 badge.
 *
 * `origin` is NOT persisted — `wo_rm_allocation` has no such column. So a line
 * read back from a save cannot honestly claim either "route" or "manual"; it is
 * simply "saved". Guessing would mislabel every hand-added line as route-derived
 * on the next open.
 */
type LineOrigin = "route" | "manual" | "saved"

/**
 * An editor line. `crmRmId` is the wire value the backend expects and is never
 * rendered; the sibling label fields exist purely so the row can name its RM.
 */
type EditorLine = WORmAllocationInput & {
  rmCode: string
  rmName: string
  routeStageName: string
  routeLevel: number
  origin: LineOrigin
  /**
   * Stable identity for React, independent of array position. Index keys would
   * let a removed row's neighbour inherit its RmCombobox open/search state.
   */
  uid: string
}

let uidSeq = 0
const nextUid = () => `rm-line-${++uidSeq}`

function emptyLine(): EditorLine {
  return {
    crmRmId: 0,
    rmType: "",
    lotNo: "",
    rmSource: RMSourceEnum.RM_SOURCE_STORE,
    freshBox: "",
    shadeCode: "",
    qtyAllocated: "",
    notes: "",
    rmCode: "",
    rmName: "",
    routeStageName: "",
    routeLevel: 0,
    origin: "manual",
    uid: nextUid(),
  }
}

/** Maps a saved or suggested allocation onto an editor line. */
function toEditorLine(a: WORmAllocation, origin: LineOrigin): EditorLine {
  return {
    crmRmId: a.crmRmId,
    rmType: a.rmType,
    lotNo: a.lotNo,
    rmSource: a.rmSource,
    freshBox: a.freshBox,
    shadeCode: a.shadeCode,
    qtyAllocated: a.qtyAllocated,
    notes: a.notes,
    rmCode: a.rmCode ?? "",
    rmName: a.rmName ?? "",
    routeStageName: a.routeStageName ?? "",
    routeLevel: a.routeLevel ?? 0,
    origin,
    uid: nextUid(),
  }
}

/** Renders an RM as code + name, never as an id. */
function RmLabel({ code, name }: { code: string; name: string }) {
  if (!code && !name) {
    return <span className="text-xs italic text-muted-foreground">Not in the current route</span>
  }
  return (
    <div className="flex min-w-0 flex-col">
      {code && <span className="truncate font-mono text-xs text-muted-foreground">{code}</span>}
      {name && <span className="truncate text-sm">{name}</span>}
    </div>
  )
}


/**
 * The editor dialog body. Deliberately a **fully controlled** component: it
 * holds no line state of its own and renders exactly the `lines` it is handed.
 *
 * That is what keeps "what the user sees" and "what Save posts" the same value.
 * An earlier revision kept a local `useState` seeded at mount, which let the two
 * diverge: the parent's copy stayed empty until the user edited something, so
 * saving an untouched prefill posted an empty payload and wiped the WO's
 * allocations. Do not reintroduce local line state here.
 */
function RmEditorBody({
  lines,
  rmOptions,
  onLinesChange,
  showNoRouteNotice,
}: {
  lines: EditorLine[]
  rmOptions: RmOption[]
  onLinesChange: (lines: EditorLine[]) => void
  showNoRouteNotice: boolean
}) {
  const apply = onLinesChange
  const updateLine = (idx: number, patch: Partial<EditorLine>) =>
    apply(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)))

  return (
    <ScrollableDialogBody className="space-y-3">
      {showNoRouteNotice && (
        <div className="flex items-start gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium text-foreground">No released route for this product</p>
            <p className="text-xs">
              Nothing could be pre-filled automatically. You can still add allocation lines by hand below.
            </p>
          </div>
        </div>
      )}

      {lines.map((line, idx) => (
        <div key={line.uid} className="space-y-2 rounded-md border p-3">
          <div className="flex items-center justify-between gap-2">
            {line.origin === "route" && (
              <Badge variant="secondary" className="gap-1 text-xs font-normal">
                <Sparkles className="h-3 w-3" />
                From route
                {line.routeStageName ? ` · Stage ${line.routeLevel} · ${line.routeStageName}` : ""}
              </Badge>
            )}
            {line.origin === "manual" && (
              <Badge variant="outline" className="text-xs font-normal">
                Added manually
              </Badge>
            )}
            {line.origin === "saved" && (
              // Origin is not persisted, so a reopened line cannot honestly
              // claim to be route-derived or hand-added. Show its route stage
              // when the backend resolved one; never guess the origin.
              <Badge variant="outline" className="text-xs font-normal">
                Saved
                {line.routeStageName ? ` · Stage ${line.routeLevel} · ${line.routeStageName}` : ""}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => apply(lines.filter((_, i) => i !== idx))}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Remove line</span>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
            <RmCombobox
              className="col-span-2 h-8 md:col-span-2"
              value={line.crmRmId || undefined}
              options={rmOptions}
              valueCode={line.rmCode}
              valueName={line.rmName}
              emptyMessage="This product has no released route, so there are no route RMs to pick."
              onChange={(o) =>
                updateLine(idx, {
                  crmRmId: o.crmRmId,
                  rmType: o.rmType || line.rmType,
                  rmCode: o.rmCode,
                  rmName: o.rmName,
                  routeStageName: o.routeStageName,
                  routeLevel: o.routeLevel,
                })
              }
            />
            <Input
              placeholder="Lot No"
              value={line.lotNo}
              onChange={(e) => updateLine(idx, { lotNo: e.target.value })}
              className="h-8"
            />
            <Select
              value={String(line.rmSource)}
              onValueChange={(v) => updateLine(idx, { rmSource: Number(v) as RMSource })}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                {RM_SOURCE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Fresh / Box"
              value={line.freshBox ?? ""}
              onChange={(e) => updateLine(idx, { freshBox: e.target.value })}
              className="h-8"
            />
            <Input
              placeholder="Shade"
              value={line.shadeCode ?? ""}
              onChange={(e) => updateLine(idx, { shadeCode: e.target.value })}
              className="h-8"
            />
            <Input
              placeholder="Qty"
              value={line.qtyAllocated}
              onChange={(e) => updateLine(idx, { qtyAllocated: e.target.value })}
              className="h-8"
            />
            <Input
              placeholder="Notes"
              value={line.notes ?? ""}
              onChange={(e) => updateLine(idx, { notes: e.target.value })}
              className="col-span-2 h-8 md:col-span-5"
            />
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => apply([...lines, emptyLine()])}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Add Line
      </Button>
    </ScrollableDialogBody>
  )
}

export function WORmPanel({ workOrder }: WORmPanelProps) {
  const allocations = useMemo(() => workOrder.rmAllocations ?? [], [workOrder.rmAllocations])
  const saveMutation = useSaveWORmAllocations()
  const [editorOpen, setEditorOpen] = useState(false)

  /**
   * The user's edits for this editor session, or `null` while the session is
   * still untouched. `null` is not "no lines" — it means "showing the seed".
   * The displayed set is always `editedLines ?? seedLines`, so Save can never
   * post something different from what is on screen.
   */
  const [editedLines, setEditedLines] = useState<EditorLine[] | null>(null)

  /**
   * The exact set the last save persisted, or `null` if this component has not
   * saved yet. Holding the lines (not just a count) covers the window where the
   * `workOrder` prop still lags the invalidated WO query, and lets a deliberate
   * "clear everything and save" be represented honestly as `[]`.
   */
  const [savedLines, setSavedLines] = useState<EditorLine[] | null>(null)

  // Prefill is a first-open convenience only. Once this panel has saved, the
  // saved set is authoritative forever after — including when it is empty. That
  // is what stops a user who deliberately cleared every allocation from having
  // them resurrected from the route on the next open.
  const hasSaved = savedLines !== null || allocations.length > 0

  // Fetched whenever the editor is open — including with saved lines, because
  // this query is also the picker's option source. Withholding it would leave
  // "Add Line" able to offer only RMs already allocated, so no new route RM
  // could ever be hand-added after the first save.
  //
  // S-5.7 is NOT enforced by withholding this fetch. It is enforced by how the
  // displayed set is derived: `seedLines` ranks `savedLines` (then the WO's
  // stored allocations) above any suggestion, `lines = editedLines ?? seedLines`
  // is computed during render, and nothing ever writes back into `seedLines`.
  // With no effect in this file, a suggestion arriving — or re-arriving on a
  // refetch — has no path by which it could replace saved or in-progress lines.
  const { data: suggestions } = useSuggestWORmAllocations(workOrder.woId, editorOpen)

  /**
   * Still waiting for the first route answer.
   *
   * Keyed on the *absence of data*, never on `isFetching`: a background refetch
   * (any WO mutation prefix-matches the suggestion key) keeps the previous data
   * in place, and treating that as "pending" would tear the editor down
   * mid-session and re-seed it.
   *
   * `undefined` covers both "not started" and "first load" — which matters
   * because a disabled or not-yet-started query reports `isLoading === false` in
   * TanStack v5, so the flags alone would let the no-route notice flash on the
   * very first open.
   */
  const suggestPending = editorOpen && suggestions === undefined

  // The full option set for the picker: every RM edge of the released route.
  // Saved lines contribute their own labels too, so a line whose edge was later
  // removed from the route still names itself instead of falling back to an id.
  const rmOptions = useMemo<RmOption[]>(() => {
    const byId = new Map<number, RmOption>()
    const add = (a: WORmAllocation) => {
      if (!a.crmRmId || byId.has(a.crmRmId)) return
      byId.set(a.crmRmId, {
        crmRmId: a.crmRmId,
        rmCode: a.rmCode ?? "",
        rmName: a.rmName ?? "",
        rmType: a.rmType ?? "",
        routeStageName: a.routeStageName ?? "",
        routeLevel: a.routeLevel ?? 0,
      })
    }
    ;(suggestions ?? []).forEach(add)
    allocations.forEach(add)
    return Array.from(byId.values())
  }, [suggestions, allocations])

  /**
   * What an untouched editor session shows. Saved lines always win over a
   * suggestion, so reopening after a save shows exactly what was saved and never
   * a re-prefill (S-5.7). Derived, not stored — there is no effect that could
   * overwrite the user's edits with this.
   */
  const seedLines = useMemo<EditorLine[]>(() => {
    if (savedLines !== null) return savedLines
    if (allocations.length > 0) return allocations.map((a) => toEditorLine(a, "saved"))
    const proposed = suggestions ?? []
    return proposed.length > 0 ? proposed.map((a) => toEditorLine(a, "route")) : [emptyLine()]
  }, [savedLines, allocations, suggestions])

  /**
   * The single source of truth for both the rendered rows and the save payload.
   * Falling back to the seed while `editedLines === null` is what makes "open,
   * press Save, change nothing" persist the prefill rather than an empty list.
   */
  const lines = editedLines ?? seedLines

  const openEditor = () => {
    setEditedLines(null)
    setEditorOpen(true)
  }

  const handleSave = async () => {
    try {
      // Build the wire payload field by field, so the presentation-only labels
      // never leak into it. The shape the backend receives is unchanged (S-5.8).
      const payload: WORmAllocationInput[] = lines.map((l) => ({
        crmRmId: l.crmRmId,
        rmType: l.rmType,
        lotNo: l.lotNo,
        rmSource: l.rmSource,
        freshBox: l.freshBox,
        shadeCode: l.shadeCode,
        qtyAllocated: l.qtyAllocated,
        notes: l.notes,
      }))
      await saveMutation.mutateAsync({ woId: workOrder.woId, allocations: payload })
      // Remember the persisted set so a reopen before the prop refreshes shows
      // it verbatim — including when it is deliberately empty.
      setSavedLines(lines.map((l) => ({ ...l, origin: "saved" as LineOrigin })))
      setEditedLines(null)
      setEditorOpen(false)
    } catch (e) {
      console.error("Failed to save RM allocations:", e)
    }
  }

  // Only meaningful once the route answer is in, and never while there are
  // saved lines to show.
  const noRoute = editorOpen && !suggestPending && (suggestions ?? []).length === 0 && !hasSaved

  /**
   * Whether the seed is knowable yet. Deliberately does NOT consult the fetch
   * flags once the user has begun editing or a saved set exists: the suggestion
   * key is prefix-matched by `invalidateWO`, so any WO mutation triggers a
   * refetch, and letting that flip this false would tear down the body mid-edit
   * and re-seed it — silently diverging the rows from what Save posts.
   */
  const bodyReady = editorOpen && (hasSaved || editedLines !== null || !suggestPending)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold">RM Allocations</CardTitle>
        <Button variant="outline" size="sm" onClick={openEditor}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Edit
        </Button>
      </CardHeader>
      <CardContent>
        {allocations.length === 0 ? (
          <EmptyState
            title="No RM allocations"
            description="Allocate raw material lots from the route to this work order."
          />
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Raw Material</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Route Stage</TableHead>
                  <TableHead>Lot</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Shade</TableHead>
                  <TableHead>Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocations.map((a) => (
                  <TableRow key={a.wraId}>
                    <TableCell>
                      <RmLabel code={a.rmCode ?? ""} name={a.rmName ?? ""} />
                    </TableCell>
                    <TableCell>{humanizeEnumValue(a.rmType) || "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {a.routeStageName ? `Stage ${a.routeLevel} · ${a.routeStageName}` : "-"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{a.lotNo || "-"}</TableCell>
                    <TableCell>{humanizeEnumValue(rMSourceToJSON(a.rmSource).replace("RM_SOURCE_", ""))}</TableCell>
                    <TableCell>{a.shadeCode || "-"}</TableCell>
                    <TableCell>{a.qtyAllocated || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <ScrollableDialogContent className="sm:max-w-[900px]">
          <ScrollableDialogHeader>
            <DialogTitle>Edit RM Allocations</DialogTitle>
            <DialogDescription>
              {hasSaved
                ? "Showing the saved allocation lines for this work order."
                : "Lines pre-filled from the product's released route. Adjust or remove them as needed."}
            </DialogDescription>
          </ScrollableDialogHeader>

          {bodyReady ? (
            <RmEditorBody
              lines={lines}
              rmOptions={rmOptions}
              onLinesChange={setEditedLines}
              showNoRouteNotice={noRoute}
            />
          ) : (
            <ScrollableDialogBody>
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Reading the product route…
              </div>
            </ScrollableDialogBody>
          )}

          <ScrollableDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditorOpen(false)}
              disabled={saveMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saveMutation.isPending || !bodyReady}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Allocations
            </Button>
          </ScrollableDialogFooter>
        </ScrollableDialogContent>
      </Dialog>
    </Card>
  )
}
