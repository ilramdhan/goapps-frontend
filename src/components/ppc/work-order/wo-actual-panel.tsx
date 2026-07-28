"use client"

import { useState } from "react"
import { Loader2, SlidersHorizontal, Sparkles } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyState } from "@/components/common"

import type { WorkOrder, WOProductionActual } from "@/types/ppc/work-order"
import { QtyAxisSource, humanizeEnumValue } from "@/types/ppc/common"
import { qtyAxisSourceToJSON, qtySourceToJSON } from "@/types/generated/ppc/v1/common"
import { useWOProductionActual, useAdjustWOActual, useSuggestWOActual } from "@/hooks/ppc/use-work-order"

interface WOActualPanelProps {
  workOrder: WorkOrder
}

function axisSourceLabel(source: QtyAxisSource): string {
  return humanizeEnumValue(qtyAxisSourceToJSON(source).replace("QTY_AXIS_SOURCE_", ""))
}

export function WOActualPanel({ workOrder }: WOActualPanelProps) {
  const { data: actuals = [], isLoading } = useWOProductionActual(workOrder.woId)
  const adjustMutation = useAdjustWOActual()
  const suggestMutation = useSuggestWOActual()

  const [target, setTarget] = useState<WOProductionActual | null>(null)
  const [qtyActual, setQtyActual] = useState("")
  const [reason, setReason] = useState("")
  const [suggestion, setSuggestion] = useState<{ qty: string; source: string } | null>(null)
  // Track the open row so we can seed the adjust form during render (not in an
  // effect). Keyed by actualId so re-selecting a different row reseeds.
  const [seededId, setSeededId] = useState<number | null>(null)
  if (target && target.actualId !== seededId) {
    setSeededId(target.actualId)
    setQtyActual(target.qtyActual || "")
    setReason("")
    setSuggestion(null)
  } else if (!target && seededId !== null) {
    setSeededId(null)
  }

  const handleSuggest = async () => {
    if (!target) return
    const res = await suggestMutation.mutateAsync({
      woId: workOrder.woId,
      date: target.date,
      shift: target.shift,
    })
    const src = humanizeEnumValue(qtySourceToJSON(res.qtySource).replace("QTY_SOURCE_", ""))
    setQtyActual(res.suggestedQtyKg || "")
    setSuggestion({ qty: res.suggestedQtyKg || "0", source: src })
  }

  const handleAdjust = async () => {
    if (!target) return
    try {
      await adjustMutation.mutateAsync({
        woId: workOrder.woId,
        date: target.date,
        shift: target.shift,
        qtyActual,
        reason,
      })
      setTarget(null)
    } catch (e) {
      console.error("Failed to adjust actual:", e)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Production Actuals</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : actuals.length === 0 ? (
          <EmptyState
            title="No production actuals"
            description="Actuals appear once production data is synced from the shop floor."
          />
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Qty Bobbin</TableHead>
                  <TableHead>Qty Actual</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {actuals.map((a) => (
                  <TableRow key={a.actualId}>
                    <TableCell>{a.date || "-"}</TableCell>
                    <TableCell>{a.shift || "-"}</TableCell>
                    <TableCell>{a.qtyBobbin || "-"}</TableCell>
                    <TableCell className="font-medium">{a.qtyActual || "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {axisSourceLabel(a.qtySource)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setTarget(a)}>
                        <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
                        Adjust
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Adjust Actual</DialogTitle>
            <DialogDescription>
              {target ? `${target.date} · Shift ${target.shift}` : ""} — set qty actual away from the
              immutable bobbin baseline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <label className="text-xs text-muted-foreground">Qty Actual (kg)</label>
                <Input
                  value={qtyActual}
                  onChange={(e) => setQtyActual(e.target.value)}
                  disabled={adjustMutation.isPending}
                />
              </div>
              <Button
                variant="outline"
                onClick={handleSuggest}
                disabled={suggestMutation.isPending}
              >
                {suggestMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Suggest
              </Button>
            </div>
            {suggestion && (
              <p className="text-xs text-muted-foreground">
                Suggested {suggestion.qty} kg (source: {suggestion.source})
              </p>
            )}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Reason</label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Why is the actual different from the bobbin baseline?"
                disabled={adjustMutation.isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)} disabled={adjustMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleAdjust} disabled={adjustMutation.isPending || !qtyActual || !reason}>
              {adjustMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
