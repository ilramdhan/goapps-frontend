"use client"

// The Plan Items scope of the Start-New-Month wizard (S-2.2).
//
// It plugs into <CarryForwardWizard> via CARRY_SCOPES and takes the shell's
// ScopePanelProps: the source and target month are shell-owned, so this file
// renders NO month input. It owns the body + footer only, mirroring
// <DemandCarryPanel>: summary strip → candidate list with a visible per-row
// action → per-row detail pane → batch result.

import { useState } from "react"
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  CalendarCheck,
  Link2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  ScrollableDialogBody,
  ScrollableDialogFooter,
} from "@/components/common/scrollable-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ConfirmDialog, DataTable, type ColumnDef } from "@/components/shared"

import type { PlanCarryCandidate, ProcessPlanCarryForwardRequest } from "@/types/ppc/plan-item"
import {
  PlanCarryAction,
  PLAN_CARRY_ACTION_LABELS,
  PLAN_CARRY_ACTION_OUTCOME_LABELS,
  PLAN_CARRY_ACTIONS_WITHOUT_TARGET,
  PLAN_CARRY_ACTIONS_IRREVERSIBLE,
  planCarryActionDescription,
} from "@/types/ppc/common"
import {
  usePlanCarryForwardCandidates,
  useProcessPlanCarryForward,
  useBulkPlanCarryForwardAsIs,
  type BulkPlanCarryResult,
} from "@/hooks/ppc/use-plan-item-carry"

export interface PlanCarryPanelProps {
  open: boolean
  /** Owned by the wizard shell. Read-only here — this panel renders no month input. */
  sourceMonth: string
  targetMonth: string
  onClose: () => void
  onSuccess?: () => void
}

const ACTION_SELECT = [
  PlanCarryAction.PLAN_CARRY_ACTION_CARRY_AS_IS,
  PlanCarryAction.PLAN_CARRY_ACTION_PARTIAL_CARRY,
  PlanCarryAction.PLAN_CARRY_ACTION_CANCEL,
]

function fmtQty(value: string): string {
  const n = Number(value)
  return Number.isFinite(n) ? n.toLocaleString() : value || "-"
}

/** "2026-08" → "August 2026". Never shown as a bare code to the user. */
function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number)
  if (!y || !m) return month || "—"
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" })
}

/**
 * A human label for one candidate. Never the plan item id — falls back through
 * product code, then the demand it serves, then a described row, so a batch
 * report always names something the planner recognises.
 */
function candidateLabel(c: PlanCarryCandidate): string {
  const code = c.item?.productCode
  if (code) return code
  if (c.demandLabel) return `Contract ${c.demandLabel}`
  const deadline = c.item?.deadline ? c.item.deadline.slice(0, 10) : "no deadline"
  return `Unnamed product · ${fmtQty(c.qtyUncovered)} due ${deadline}`
}

const planItemIdOf = (c: PlanCarryCandidate): number => c.item?.planItemId ?? 0

/**
 * A candidate is blocked when nothing is left to carry — every unit is already
 * claimed by a work order. It is still LISTED rather than hidden, so the
 * planner can see why it is not on offer instead of wondering where it went.
 */
const isBlocked = (c: PlanCarryCandidate): boolean => Number(c.qtyUncovered) <= 0

export function PlanCarryPanel({
  open,
  sourceMonth,
  targetMonth,
  onClose,
  onSuccess,
}: PlanCarryPanelProps) {
  const [active, setActive] = useState<PlanCarryCandidate | null>(null)

  const [action, setAction] = useState<PlanCarryAction>(
    PlanCarryAction.PLAN_CARRY_ACTION_CARRY_AS_IS
  )
  const [newDeadline, setNewDeadline] = useState("")
  const [carryQty, setCarryQty] = useState("")

  // Plan items settled during this run, and what was done to each. The action
  // matters: CLOSE creates nothing, so calling it "Carried" would be false.
  const [processed, setProcessed] = useState<Record<number, PlanCarryAction>>({})
  const processedIds = Object.keys(processed).map(Number)

  const [confirmDestructiveOpen, setConfirmDestructiveOpen] = useState(false)
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)
  const [bulkResult, setBulkResult] = useState<BulkPlanCarryResult | null>(null)

  const { data: candidates, isLoading } = usePlanCarryForwardCandidates(
    open ? sourceMonth : "",
    open ? targetMonth : ""
  )
  const processMutation = useProcessPlanCarryForward()
  const bulkMutation = useBulkPlanCarryForwardAsIs()

  // A row handled in this session is dropped outright rather than left greyed
  // out. CLOSE in particular leaves the item out of the candidate query on the
  // next refetch, but the local drop keeps the table honest before that lands.
  const rows = (candidates ?? []).filter((c) => processed[planItemIdOf(c)] === undefined)
  // Only what is actually offerable: an already-carried or fully-covered row
  // contributes nothing to "carry all", so counting it in the headline number
  // would promise work the button will not do.
  const offerable = rows.filter((c) => !c.alreadyCarried && !isBlocked(c))
  const totalUncovered = offerable.reduce((sum, c) => sum + (Number(c.qtyUncovered) || 0), 0)

  const settled = (candidates ?? [])
    .filter((c) => processed[planItemIdOf(c)] !== undefined)
    .map((c) => ({ label: candidateLabel(c), action: processed[planItemIdOf(c)] }))

  const startProcess = (c: PlanCarryCandidate) => {
    setBulkResult(null)
    setActive(c)
    setAction(PlanCarryAction.PLAN_CARRY_ACTION_CARRY_AS_IS)
    setNewDeadline(c.item?.deadline ? c.item.deadline.slice(0, 10) : "")
    setCarryQty(c.qtyUncovered || "")
  }

  const isPartial = action === PlanCarryAction.PLAN_CARRY_ACTION_PARTIAL_CARRY
  const producesNothing = PLAN_CARRY_ACTIONS_WITHOUT_TARGET.includes(action)
  const isIrreversible = PLAN_CARRY_ACTIONS_IRREVERSIBLE.includes(action)
  const needsDeadline = action === PlanCarryAction.PLAN_CARRY_ACTION_CARRY_AS_IS || isPartial

  // Both creating actions are rejected server-side when the target month equals
  // the item's own (ErrSameMonth) — say so before the user submits.
  const sameMonth = !producesNothing && !!active?.item && active.item.month === targetMonth

  const canConfirm =
    !!active && !!targetMonth && !sameMonth && (!isPartial || !!carryQty)

  const submitAction = async () => {
    if (!active) return
    const planItemId = planItemIdOf(active)
    const applied = action
    const req: ProcessPlanCarryForwardRequest = {
      sourcePlanItemId: planItemId,
      action,
      targetMonth,
      newDeadline: needsDeadline && newDeadline ? newDeadline : undefined,
      carryQty: isPartial && carryQty ? carryQty : undefined,
    }
    try {
      await processMutation.mutateAsync(req)
      setProcessed((prev) => ({ ...prev, [planItemId]: applied }))
      setActive(null)
      onSuccess?.()
    } catch {
      // The mutation hook already toasts. Keep the pane open so the planner can
      // correct the input rather than losing what they typed.
    }
  }

  // CLOSE is terminal — allowedTransitions[CLOSED] is empty in the plan-item
  // state machine, so it gets a confirmation like any destructive action.
  const handleConfirm = () => {
    if (isIrreversible) {
      setConfirmDestructiveOpen(true)
      return
    }
    void submitAction()
  }

  const runBulk = async () => {
    setConfirmBulkOpen(false)
    const batch = offerable.map((c) => ({
      planItemId: planItemIdOf(c),
      label: candidateLabel(c),
    }))
    setBulkProgress({ done: 0, total: batch.length })
    let lastDone = 0
    try {
      const result = await bulkMutation.mutateAsync({
        items: batch,
        targetMonth,
        onProgress: (done, total) => {
          lastDone = done
          setBulkProgress({ done, total })
        },
      })
      setBulkResult(result)
      setProcessed((prev) => {
        const next = { ...prev }
        for (const o of result.outcomes) {
          if (o.ok) next[o.planItemId] = PlanCarryAction.PLAN_CARRY_ACTION_CARRY_AS_IS
        }
        return next
      })
      if (result.succeeded > 0) onSuccess?.()
    } catch (error) {
      // The batch itself blew up rather than one item failing. The items already
      // reported through onProgress may or may not have gone through and we have
      // no per-item verdict for them, so they are claimed as neither: only the
      // unreached tail is reported as not done.
      const unreached = batch.slice(lastDone)
      setBulkResult({
        succeeded: 0,
        failed: unreached.length,
        outcomes: unreached.map((d) => ({
          ...d,
          ok: false,
          error: error instanceof Error ? error.message : "The batch stopped unexpectedly",
        })),
      })
    } finally {
      setBulkProgress(null)
    }
  }

  const columns: ColumnDef<PlanCarryCandidate>[] = [
    {
      id: "product",
      header: "Product",
      cell: (c) => (
        <div className="min-w-0">
          <div className="font-mono font-medium">{c.item?.productCode || "-"}</div>
          <div className="max-w-[200px] truncate text-xs text-muted-foreground">
            {c.item?.productName || <span className="italic">Product name unavailable</span>}
          </div>
        </div>
      ),
    },
    {
      id: "demand",
      header: "For",
      hideOnMobile: true,
      // Never the demand id — the backend resolves the contract number in SQL
      // and an intermediate item, which serves a parent plan item rather than a
      // demand, comes back with an empty label.
      cell: (c) =>
        c.demandLabel ? (
          <span className="text-xs">Contract {c.demandLabel}</span>
        ) : (
          <span className="text-xs italic text-muted-foreground">Upstream of another item</span>
        ),
    },
    {
      id: "qtyUncovered",
      header: "Left to carry",
      cellClassName: "tabular-nums",
      cell: (c) => (
        <div>
          <div>{fmtQty(c.qtyUncovered)}</div>
          {c.workOrderCount > 0 && (
            <div className="text-xs text-muted-foreground">
              {fmtQty(c.qtyCovered)} on {c.workOrderCount} work order
              {c.workOrderCount === 1 ? "" : "s"}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "deadline",
      header: "Deadline",
      hideOnMobile: true,
      cell: (c) => (c.item?.deadline ? c.item.deadline.slice(0, 10) : "-"),
    },
    {
      id: "carry",
      header: "",
      headerClassName: "text-right",
      cellClassName: "text-right",
      canHide: false,
      cell: (c) => {
        // S-2.4: a second run shows an already-carried item as such rather than
        // offering to duplicate it. The backend rejects it either way
        // (ErrAlreadyCarried); this just says so before the click.
        if (c.alreadyCarried) {
          return (
            <Badge variant="secondary" className="gap-1">
              <Link2 className="h-3 w-3" />
              In {monthLabel(targetMonth)}
            </Badge>
          )
        }
        // Listed with the reason rather than silently omitted.
        if (isBlocked(c)) {
          return (
            <span className="text-xs italic text-muted-foreground">
              Fully covered by work orders
            </span>
          )
        }
        return (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => startProcess(c)}
            disabled={bulkMutation.isPending}
          >
            Carry forward
          </Button>
        )
      },
    },
  ]

  const listView = (
    <>
      {/* Summary strip — S-2.1, applied to this scope. */}
      <div className="grid grid-cols-3 gap-3 rounded-lg border bg-muted/40 p-3 text-center">
        <div>
          <div className="text-lg font-semibold tabular-nums">{offerable.length}</div>
          <div className="text-xs text-muted-foreground">Can be carried</div>
        </div>
        <div>
          <div className="text-lg font-semibold tabular-nums">
            {totalUncovered.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">Qty left to carry</div>
        </div>
        <div>
          <div className="text-lg font-semibold tabular-nums">{processedIds.length}</div>
          <div className="text-xs text-muted-foreground">Handled just now</div>
        </div>
      </div>

      {bulkProgress && (
        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carrying into {monthLabel(targetMonth)}…
            </span>
            <span className="tabular-nums text-muted-foreground">
              {bulkProgress.done} of {bulkProgress.total}
            </span>
          </div>
          <Progress
            value={bulkProgress.total ? (bulkProgress.done / bulkProgress.total) * 100 : 0}
          />
          <p className="text-xs text-muted-foreground">
            Each plan item is carried on its own — closing this now would stop the rest, not undo
            what has already gone through.
          </p>
        </div>
      )}

      {bulkResult && <BulkResultPanel result={bulkResult} targetMonth={targetMonth} />}

      {settled.length > 0 && (
        <div className="space-y-1 rounded-lg border p-3">
          <p className="text-xs font-medium text-muted-foreground">Handled in this session</p>
          <ul className="space-y-1 text-xs">
            {settled.map((s) => (
              <li key={s.label} className="flex items-center justify-between gap-2">
                <span className="truncate">{s.label}</span>
                <Badge variant="secondary" className="shrink-0 gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {PLAN_CARRY_ACTION_OUTCOME_LABELS[s.action] ?? "Handled"}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Order matters: an item handled in this session is filtered out of
          `rows`, so "nothing here" and "you just finished everything" look
          identical from `rows` alone. Check the session's own tally first. */}
      {!isLoading && rows.length === 0 && processedIds.length > 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <CalendarCheck className="mx-auto mb-2 h-6 w-6 text-muted-foreground" aria-hidden />
          <p className="font-medium">Every plan item in {monthLabel(sourceMonth)} is handled</p>
          <p className="text-sm text-muted-foreground">
            All {processedIds.length} candidate{processedIds.length === 1 ? "" : "s"} were
            processed in this session.
          </p>
        </div>
      ) : !isLoading && rows.length === 0 ? (
        <EmptySourceMonth sourceMonth={sourceMonth} />
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          // The id lives on the nested item, so keyField (a plain key lookup)
          // cannot reach it — getRowKey is the supported escape hatch.
          getRowKey={(c) => String(planItemIdOf(c))}
          isLoading={isLoading}
          emptyMessage="No plan carry-forward candidates"
          emptyDescription="No unstarted plan items remain in the selected month."
        />
      )}
    </>
  )

  const detailView = active && (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/40 p-3">
        <div className="font-mono font-medium">{active.item?.productCode || "-"}</div>
        <div className="text-sm text-muted-foreground">
          {active.item?.productName || <span className="italic">Product name unavailable</span>}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Left to carry: {fmtQty(active.qtyUncovered)}
          {active.item?.deadline ? ` · due ${active.item.deadline.slice(0, 10)}` : ""}
        </div>
        {/* Traceability the other way round (S-2.2): the planner can see what
            this item's quantity is already committed to before deciding. */}
        {active.workOrderCount > 0 && (
          <div className="mt-1 text-xs text-muted-foreground">
            {fmtQty(active.qtyCovered)} of {fmtQty(active.item?.qtyTarget ?? "0")} is already on{" "}
            {active.workOrderCount} work order{active.workOrderCount === 1 ? "" : "s"} and is not
            carried again.
          </div>
        )}
        {active.demandLabel && (
          <div className="mt-1 text-xs text-muted-foreground">
            Serving contract {active.demandLabel}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Action</Label>
        <Select
          value={String(action)}
          onValueChange={(v) => setAction(Number(v) as PlanCarryAction)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_SELECT.map((a) => (
              <SelectItem key={a} value={String(a)}>
                {PLAN_CARRY_ACTION_LABELS[a]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* The effect at the point of choice. Each sentence is derived from the
            backend path, not from the label — see PLAN_CARRY_ACTION_DESCRIPTIONS. */}
        <p className="pt-1 text-xs text-muted-foreground">
          {planCarryActionDescription(action, monthLabel(targetMonth))}
        </p>
      </div>

      {sameMonth && (
        <p className="rounded-md border border-destructive/40 p-3 text-xs text-destructive">
          This plan item is already in {monthLabel(targetMonth)}, so carrying it there will be
          rejected. Change the target month above.
        </p>
      )}

      {/* The target month lives in the wizard header, which stays visible here.
          A second bound input for the same value would be a duplicate control. */}
      {producesNothing ? (
        <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          This action creates nothing in another month, so the target month and deadline set
          above do not apply.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Goes into <span className="font-medium">{monthLabel(targetMonth)}</span> — change the
          target month above to send it elsewhere.
        </p>
      )}

      {needsDeadline && (
        <div className="space-y-1">
          <Label htmlFor="pcf-new-deadline" className="text-xs">
            New deadline
          </Label>
          <Input
            id="pcf-new-deadline"
            type="date"
            value={newDeadline}
            onChange={(e) => setNewDeadline(e.target.value)}
            className="w-[200px]"
          />
          <p className="text-xs text-muted-foreground">
            Leave as-is to keep the original deadline. The new item lands in the target month
            either way.
          </p>
        </div>
      )}

      {isPartial && (
        <div className="space-y-1">
          <Label htmlFor="pcf-carry-qty" className="text-xs">
            Carry quantity
          </Label>
          <Input
            id="pcf-carry-qty"
            inputMode="decimal"
            value={carryQty}
            onChange={(e) => setCarryQty(e.target.value)}
            className="w-[200px]"
          />
          <p className="text-xs text-muted-foreground">
            Cannot exceed the {fmtQty(active.qtyUncovered)} not yet claimed by a work order
            or already carried to another month. The quantity you carry is deducted
            from the original item in {monthLabel(sourceMonth)}, and that item keeps
            its full work-order coverage rules.
          </p>
        </div>
      )}
    </div>
  )

  return (
    <>
      <ScrollableDialogBody className="space-y-4">
        {active ? detailView : listView}
      </ScrollableDialogBody>

      <ScrollableDialogFooter>
        {active ? (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setActive(null)}
              disabled={processMutation.isPending}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!canConfirm || processMutation.isPending}
              variant={isIrreversible ? "destructive" : "default"}
            >
              {processMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isIrreversible ? "Close this plan item" : PLAN_CARRY_ACTION_LABELS[action]}
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={bulkMutation.isPending}
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => setConfirmBulkOpen(true)}
              disabled={offerable.length === 0 || !targetMonth || bulkMutation.isPending}
            >
              {bulkMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Carry all as-is ({offerable.length})
            </Button>
          </>
        )}
      </ScrollableDialogFooter>

      <ConfirmDialog
        open={confirmBulkOpen}
        onOpenChange={setConfirmBulkOpen}
        title="Carry all remaining plan items as-is?"
        description={
          `${offerable.length} plan item${offerable.length === 1 ? "" : "s"} from ` +
          `${monthLabel(sourceMonth)} will each get a new plan item in ${monthLabel(targetMonth)} ` +
          `for the quantity no work order has claimed yet (${totalUncovered.toLocaleString()} in ` +
          `total). The originals stay where they are. They are carried one at a time, so this is ` +
          `not a single all-or-nothing operation.`
        }
        confirmText={`Carry ${offerable.length}`}
        onConfirm={runBulk}
      />

      <ConfirmDialog
        open={confirmDestructiveOpen}
        onOpenChange={setConfirmDestructiveOpen}
        variant="destructive"
        title="Close this plan item?"
        description={
          active
            ? `${candidateLabel(active)} will be marked Closed in ${monthLabel(sourceMonth)} and ` +
              `recorded in its change log. Nothing is created in another month, and a closed plan ` +
              `item cannot be reopened.`
            : ""
        }
        confirmText="Close plan item"
        isLoading={processMutation.isPending}
        onConfirm={() => {
          setConfirmDestructiveOpen(false)
          void submitAction()
        }}
      />
    </>
  )
}

/**
 * Batch outcome. A loop is not atomic, so this never reports a single verdict:
 * successes and failures are both named, by label, and a partial run is called
 * a partial run.
 */
function BulkResultPanel({
  result,
  targetMonth,
}: {
  result: BulkPlanCarryResult
  targetMonth: string
}) {
  const failures = result.outcomes.filter((o) => !o.ok)
  const allFailed = result.succeeded === 0
  const partial = result.failed > 0 && result.succeeded > 0

  return (
    <div
      className={
        result.failed > 0
          ? "space-y-2 rounded-lg border border-destructive/40 p-3"
          : "space-y-2 rounded-lg border p-3"
      }
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        {result.failed > 0 ? (
          <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden />
        )}
        {allFailed
          ? `Nothing was carried — all ${result.failed} failed`
          : partial
            ? `Partly done — ${result.succeeded} carried into ${monthLabel(targetMonth)}, ${result.failed} failed`
            : `${result.succeeded} carried into ${monthLabel(targetMonth)}`}
      </div>

      {failures.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground">
            These were left exactly as they were and can be retried or handled one at a time:
          </p>
          <ul className="space-y-1 text-xs">
            {failures.map((f) => (
              <li key={f.planItemId}>
                <span className="font-medium">{f.label}</span>
                <span className="text-muted-foreground"> — {f.error}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

/**
 * Zero candidates is a legitimate result, not an error and not an empty table.
 * The wording states the actual backend predicate: ListCarryCandidates filters
 * ppi_month = source AND ppi_status IN ('DRAFT','CONFIRMED').
 */
function EmptySourceMonth({ sourceMonth }: { sourceMonth: string }) {
  return (
    <div className="rounded-lg border border-dashed p-6 text-center">
      <CalendarCheck className="mx-auto mb-2 h-6 w-6 text-muted-foreground" aria-hidden />
      <p className="font-medium">Nothing to carry from {monthLabel(sourceMonth)}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        A plan item only appears here while it is still draft or confirmed. Every plan item in{" "}
        {monthLabel(sourceMonth)} has either started production, finished, or been closed.{" "}
        Work already in progress must be continued from the work-order carry scope — when that
        scope is added, the same plan item will not appear here, so the same production is not
        planned twice.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Pick a different source month above if you expected to see something here.
      </p>
    </div>
  )
}
