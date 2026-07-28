"use client"

import { useState } from "react"
import { Loader2, Plus, Trash2, ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import {
  ScrollableDialogContent,
  ScrollableDialogHeader,
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
import { DataTable, type ColumnDef, type RowAction } from "@/components/shared"

import type { Demand, CarryForwardSplit, ProcessCarryForwardRequest } from "@/types/ppc/demand"
import { CarryAction, CARRY_ACTION_LABELS, currentMonth } from "@/types/ppc/common"
import { useCarryForwardCandidates, useProcessCarryForward } from "@/hooks/ppc/use-demand"

interface CarryForwardWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

/** Shift a "YYYY-MM" string by n months. */
function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number)
  if (!y || !m) return month
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function previousMonth(): string {
  return shiftMonth(currentMonth(), -1)
}

function fmtQty(value: string): string {
  const n = Number(value)
  return Number.isFinite(n) ? n.toLocaleString() : value || "-"
}

const CARRY_ACTION_SELECT = [
  CarryAction.CARRY_ACTION_CARRY_AS_IS,
  CarryAction.CARRY_ACTION_SPLIT,
  CarryAction.CARRY_ACTION_DEFER,
  CarryAction.CARRY_ACTION_PARTIAL_CARRY,
  CarryAction.CARRY_ACTION_CANCEL,
]

export function CarryForwardWizard({ open, onOpenChange, onSuccess }: CarryForwardWizardProps) {
  const [sourceMonth, setSourceMonth] = useState(previousMonth())
  const [active, setActive] = useState<Demand | null>(null)

  // Per-candidate action form state
  const [action, setAction] = useState<CarryAction>(CarryAction.CARRY_ACTION_CARRY_AS_IS)
  const [targetMonth, setTargetMonth] = useState(currentMonth())
  const [newDeadline, setNewDeadline] = useState("")
  const [carryQty, setCarryQty] = useState("")
  const [splits, setSplits] = useState<CarryForwardSplit[]>([{ qty: "", deadline: "" }])

  const { data: candidates, isLoading } = useCarryForwardCandidates(open ? sourceMonth : "")
  const processMutation = useProcessCarryForward()

  // Reset the wizard when it opens (adjust-during-render pattern).
  const [wasOpen, setWasOpen] = useState(false)
  if (open && !wasOpen) {
    setWasOpen(true)
    setSourceMonth(previousMonth())
    setActive(null)
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  const startProcess = (demand: Demand) => {
    setActive(demand)
    setAction(CarryAction.CARRY_ACTION_CARRY_AS_IS)
    setTargetMonth(shiftMonth(sourceMonth, 1))
    setNewDeadline(demand.deadline ? demand.deadline.slice(0, 10) : "")
    setCarryQty(demand.qtyRemaining || "")
    setSplits([{ qty: "", deadline: "" }])
  }

  const isSplit = action === CarryAction.CARRY_ACTION_SPLIT
  const isPartial = action === CarryAction.CARRY_ACTION_PARTIAL_CARRY
  const needsDeadline =
    action === CarryAction.CARRY_ACTION_CARRY_AS_IS || isPartial

  const canConfirm =
    !!active &&
    !!targetMonth &&
    (!isSplit || splits.every((s) => s.qty && s.deadline)) &&
    (!isPartial || !!carryQty)

  const handleConfirm = async () => {
    if (!active) return
    const req: ProcessCarryForwardRequest = {
      sourceDemandId: active.demandId,
      action,
      targetMonth,
      newDeadline: needsDeadline && newDeadline ? newDeadline : undefined,
      carryQty: isPartial && carryQty ? carryQty : undefined,
      splits: isSplit ? splits : [],
    }
    try {
      await processMutation.mutateAsync(req)
      setActive(null)
      onSuccess?.()
    } catch (error) {
      console.error("Failed to process carry-forward:", error)
    }
  }

  const columns: ColumnDef<Demand>[] = [
    {
      id: "product",
      header: "Product",
      // Whether a product is linked is decided by cpmProductSysId, not by the
      // labels: those live in finance and are decorated onto the row over gRPC,
      // so they come back blank whenever that lookup degrades. Keying "Not
      // mapped" off the labels reported a linked demand as unlinked every time
      // finance was unreachable.
      cell: (row) =>
        row.cpmProductSysId ? (
          <div className="min-w-0">
            <div className="font-medium font-mono">{row.productCode || "-"}</div>
            <div className="max-w-[200px] truncate text-xs text-muted-foreground">
              {row.productName || (
                <span className="italic">Product name unavailable</span>
              )}
            </div>
          </div>
        ) : (
          <span className="text-xs italic text-muted-foreground">Not mapped</span>
        ),
    },
    {
      id: "qtyRemaining",
      header: "Qty Remaining",
      cellClassName: "tabular-nums",
      cell: (row) => fmtQty(row.qtyRemaining),
    },
    {
      id: "deadline",
      header: "Deadline",
      hideOnMobile: true,
      cell: (row) => (row.deadline ? row.deadline.slice(0, 10) : "-"),
    },
  ]

  const actions: RowAction<Demand>[] = [
    {
      id: "process",
      label: "Process",
      onClick: startProcess,
    },
  ]

  const updateSplit = (index: number, patch: Partial<CarryForwardSplit>) => {
    setSplits((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ScrollableDialogContent className="sm:max-w-2xl">
        <ScrollableDialogHeader>
          <DialogTitle>Start New Month — Carry Forward</DialogTitle>
          <DialogDescription>
            {active
              ? "Choose how to carry this demand into the new month."
              : "Review unfulfilled demands from the source month and process them one at a time."}
          </DialogDescription>
        </ScrollableDialogHeader>

        <ScrollableDialogBody className="space-y-4">
          {!active ? (
            <>
              <div className="flex items-end gap-3">
                <div className="space-y-1">
                  <Label htmlFor="cf-source-month" className="text-xs">
                    Source Month
                  </Label>
                  <Input
                    id="cf-source-month"
                    type="month"
                    value={sourceMonth}
                    onChange={(e) => setSourceMonth(e.target.value)}
                    className="w-[160px]"
                  />
                </div>
              </div>

              <DataTable
                data={candidates ?? []}
                columns={columns}
                keyField="demandId"
                actions={actions}
                isLoading={isLoading}
                emptyMessage="No carry-forward candidates"
                emptyDescription="No unfulfilled demands remain in the selected month."
              />
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-3">
                {/* A blank label does not mean "unlinked": the product code
                    and name are resolved from finance over gRPC and come back
                    empty whenever that lookup degrades. cpmProductSysId is
                    the field that actually says whether a product is linked. */}
                {active.cpmProductSysId ? (
                  <>
                    <div className="font-medium font-mono">{active.productCode || "-"}</div>
                    <div className="text-sm text-muted-foreground">
                      {active.productName || (
                        <span className="italic">Product name unavailable</span>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-sm italic text-muted-foreground">Product not mapped</div>
                )}
                <div className="mt-1 text-xs text-muted-foreground">
                  Remaining: {fmtQty(active.qtyRemaining)}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Action</Label>
                  <Select value={String(action)} onValueChange={(v) => setAction(Number(v) as CarryAction)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Action" />
                    </SelectTrigger>
                    <SelectContent>
                      {CARRY_ACTION_SELECT.map((a) => (
                        <SelectItem key={a} value={String(a)}>
                          {CARRY_ACTION_LABELS[a]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="cf-target-month" className="text-xs">
                    Target Month
                  </Label>
                  <Input
                    id="cf-target-month"
                    type="month"
                    value={targetMonth}
                    onChange={(e) => setTargetMonth(e.target.value)}
                  />
                </div>
              </div>

              {needsDeadline && (
                <div className="space-y-1">
                  <Label htmlFor="cf-new-deadline" className="text-xs">
                    New Deadline
                  </Label>
                  <Input
                    id="cf-new-deadline"
                    type="date"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="w-[200px]"
                  />
                </div>
              )}

              {isPartial && (
                <div className="space-y-1">
                  <Label htmlFor="cf-carry-qty" className="text-xs">
                    Carry Quantity
                  </Label>
                  <Input
                    id="cf-carry-qty"
                    inputMode="decimal"
                    value={carryQty}
                    onChange={(e) => setCarryQty(e.target.value)}
                    className="w-[200px]"
                  />
                </div>
              )}

              {isSplit && (
                <div className="space-y-2">
                  <Label className="text-xs">Splits</Label>
                  {splits.map((split, index) => (
                    <div key={index} className="flex items-end gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Qty</Label>
                        <Input
                          inputMode="decimal"
                          value={split.qty}
                          onChange={(e) => updateSplit(index, { qty: e.target.value })}
                          className="w-[140px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Deadline</Label>
                        <Input
                          type="date"
                          value={split.deadline}
                          onChange={(e) => updateSplit(index, { deadline: e.target.value })}
                          className="w-[170px]"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => setSplits((prev) => prev.filter((_, i) => i !== index))}
                        disabled={splits.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSplits((prev) => [...prev, { qty: "", deadline: "" }])}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add split
                  </Button>
                </div>
              )}
            </div>
          )}
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
              <Button onClick={handleConfirm} disabled={!canConfirm || processMutation.isPending}>
                {processMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Process
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </ScrollableDialogFooter>
      </ScrollableDialogContent>
    </Dialog>
  )
}
