"use client"

// The Work Orders scope of the Start-New-Month wizard (S-2.3).
// Plugs into <CarryForwardWizard> via CARRY_SCOPES.

import { useState } from "react"
import { ArrowLeft, CalendarCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollableDialogBody, ScrollableDialogFooter } from "@/components/common/scrollable-dialog"
import { Badge } from "@/components/ui/badge"
import { ConfirmDialog, DataTable, type ColumnDef } from "@/components/shared"

import type { WorkOrderCarryCandidate } from "@/types/generated/ppc/v1/work_order"
import { useWOCarryCandidates, useProcessWOCarryForward } from "@/hooks/ppc/use-wo-carry"

function monthLabel(m: string) { return m || "—" }
function fmtQty(v: string): string { const n = Number(v); return Number.isFinite(n) ? n.toLocaleString() : v || "-" }
function woLabel(c: WorkOrderCarryCandidate): string { return c.wo?.woNo || "Untitled work order" }
function statusLabel(s: number): string {
  const m: Record<number, string> = { 1:"Draft",2:"Submitted",3:"Approved",4:"Scheduled",5:"Changeover",6:"Running",7:"Completed",8:"Closed",9:"Rejected",10:"PC Approved",11:"Cancelled" }
  return m[s] ?? "—"
}

interface Props { sourceMonth: string; targetMonth: string; onClose: () => void; onSuccess?: () => void }

export function WorkOrderCarryPanel({ sourceMonth, targetMonth, onClose, onSuccess }: Props) {
  const { data, isLoading } = useWOCarryCandidates(sourceMonth, targetMonth)
  const processM = useProcessWOCarryForward()

  const [active, setActive] = useState<WorkOrderCarryCandidate | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const all = data ?? []
  const eligible = all.filter((c) => !c.ineligibilityReason)
  const ineligible = all.filter((c) => !!c.ineligibilityReason)

  const handleCarry = async (candidate: WorkOrderCarryCandidate) => {
    const res = await processM.mutateAsync({
      sourceWoId: candidate.wo!.woId,
      targetMonth,
      lotNo: "",
    })
    setActive(null)
    onSuccess?.()
    return res
  }

  if (isLoading) {
    return (
      <ScrollableDialogBody className="flex items-center justify-center py-16">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      </ScrollableDialogBody>
    )
  }

  if (all.length === 0) {
    return (
      <>
        <ScrollableDialogBody>
          <div className="rounded-lg border border-dashed p-6 text-center">
            <CalendarCheck className="mx-auto mb-2 h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="font-medium">Nothing to carry from {monthLabel(sourceMonth)}</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Every work order in {monthLabel(sourceMonth)} has either been completed or does not match
              the eligibility criteria. Work already in production is listed below with its reason.
            </p>
          </div>
          {ineligible.length > 0 && (
            <div className="mt-4 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Ineligible</p>
              {ineligible.map((c) => (
                <div key={c.wo?.woId} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>{woLabel(c)} {c.productLabel && <span className="text-muted-foreground">· {c.productLabel}</span>}</span>
                  <span className="text-xs text-muted-foreground">{c.ineligibilityReason}</span>
                </div>
              ))}
            </div>
          )}
        </ScrollableDialogBody>
        <ScrollableDialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </ScrollableDialogFooter>
      </>
    )
  }

  const columns: ColumnDef<WorkOrderCarryCandidate>[] = [
    { id: "woNo", header: "WO", accessorKey: "wo.woNo" as never, cell: (row) => <span className="font-mono text-sm">{woLabel(row)}</span> },
    { id: "product", header: "Product", cell: (row) => <span className="text-sm">{row.productLabel || "—"}</span> },
    { id: "machine", header: "Machine", cell: (row) => <span className="text-sm">{row.machineLabel || "—"}</span> },
    { id: "status", header: "Status", cell: (row) => <Badge variant="secondary" className="text-xs">{statusLabel(row.wo?.status ?? 0)}</Badge> },
    { id: "remaining", header: "Remaining", cell: (row) => <span className="text-sm tabular-nums">{fmtQty(row.remainingQty)}</span> },
    { id: "already", header: "", cell: (row) => row.alreadyCarried ? <Badge variant="outline" className="text-xs">In {monthLabel(targetMonth)}</Badge> : null },
    { id: "action", header: "", cell: (row) => row.ineligibilityReason
      ? <span className="text-xs text-muted-foreground">{row.ineligibilityReason}</span>
      : <Button size="sm" variant="outline" disabled={row.alreadyCarried} onClick={() => { setActive(row); setConfirmOpen(true) }}>
          Carry forward
        </Button>
    },
  ]

  return (
    <>
      <ScrollableDialogBody className="space-y-4">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">{all.length} work order{all.length !== 1 ? "s" : ""}</span>
          {eligible.length > 0 && <span className="tabular-nums">{eligible.length} eligible</span>}
          {ineligible.length > 0 && <span className="text-muted-foreground">{ineligible.length} with a reason</span>}
        </div>
        {/* keyField cannot reach a nested field — row["wo.woId"] is undefined, which
            resolveKey stringifies to the same "undefined" for every row. */}
        <DataTable
          data={all}
          columns={columns}
          isLoading={false}
          emptyMessage=""
          getRowKey={(row, i) => String(row.wo?.woId ?? `row-${i}`)}
        />
        {ineligible.length > 0 && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">{ineligible.length} ineligible work order{ineligible.length !== 1 ? "s" : ""}</summary>
            <ul className="mt-1 space-y-1 pl-4">
              {ineligible.map((c) => (
                <li key={c.wo?.woId}>{woLabel(c)}: {c.ineligibilityReason}</li>
              ))}
            </ul>
          </details>
        )}
      </ScrollableDialogBody>
      <ScrollableDialogFooter>
        <Button variant="outline" onClick={onClose}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Close
        </Button>
      </ScrollableDialogFooter>

      <ConfirmDialog
        open={confirmOpen && !!active}
        onOpenChange={(o) => { setConfirmOpen(o); if (!o) setActive(null) }}
        title="Carry this work order forward?"
        description={
          active
            ? `${woLabel(active)} (${fmtQty(active.remainingQty)} remaining) will be carried into ${monthLabel(targetMonth)} as a continuation. The new WO inherits the product, machine, and parameters — and gets its own lot number. The source WO is not altered. This cannot be undone.`
            : ""
        }
        confirmText={`Carry ${active ? woLabel(active) : ""}`}
        isLoading={processM.isPending}
        onConfirm={async () => { if (active) { await handleCarry(active); setConfirmOpen(false) } }}
      />
    </>
  )
}
