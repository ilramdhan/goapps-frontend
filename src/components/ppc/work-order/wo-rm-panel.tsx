"use client"

import { useEffect, useState } from "react"
import { Loader2, Plus, Trash2, Pencil } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

import type { WorkOrder, WORmAllocationInput } from "@/types/ppc/work-order"
import { RMSource, humanizeEnumValue } from "@/types/ppc/common"
import { RMSource as RMSourceEnum } from "@/types/generated/ppc/v1/common"
import { rMSourceToJSON } from "@/types/generated/ppc/v1/common"
import { useSaveWORmAllocations } from "@/hooks/ppc/use-work-order"

const RM_SOURCE_OPTIONS = [
  { value: RMSourceEnum.RM_SOURCE_STORE, label: "Store" },
  { value: RMSourceEnum.RM_SOURCE_CAPTIVE, label: "Captive" },
  { value: RMSourceEnum.RM_SOURCE_MIXED, label: "Mixed" },
]

interface WORmPanelProps {
  workOrder: WorkOrder
}

function emptyLine(): WORmAllocationInput {
  return {
    crmRmId: 0,
    rmType: "",
    lotNo: "",
    rmSource: RMSourceEnum.RM_SOURCE_STORE,
    freshBox: "",
    shadeCode: "",
    qtyAllocated: "",
    notes: "",
  }
}

export function WORmPanel({ workOrder }: WORmPanelProps) {
  const allocations = workOrder.rmAllocations ?? []
  const saveMutation = useSaveWORmAllocations()
  const [editorOpen, setEditorOpen] = useState(false)
  const [lines, setLines] = useState<WORmAllocationInput[]>([])

  useEffect(() => {
    if (editorOpen) {
      setLines(
        allocations.length > 0
          ? allocations.map((a) => ({
              crmRmId: a.crmRmId,
              rmType: a.rmType,
              lotNo: a.lotNo,
              rmSource: a.rmSource,
              freshBox: a.freshBox,
              shadeCode: a.shadeCode,
              qtyAllocated: a.qtyAllocated,
              notes: a.notes,
            }))
          : [emptyLine()]
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorOpen])

  const updateLine = (idx: number, patch: Partial<WORmAllocationInput>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
  }

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({ woId: workOrder.woId, allocations: lines })
      setEditorOpen(false)
    } catch (e) {
      console.error("Failed to save RM allocations:", e)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold">RM Allocations</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setEditorOpen(true)}>
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
                  <TableHead>RM ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Lot</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Shade</TableHead>
                  <TableHead>Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocations.map((a) => (
                  <TableRow key={a.wraId}>
                    <TableCell>{a.crmRmId}</TableCell>
                    <TableCell>{humanizeEnumValue(a.rmType) || "-"}</TableCell>
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
        <ScrollableDialogContent className="sm:max-w-[820px]">
          <ScrollableDialogHeader>
            <DialogTitle>Edit RM Allocations</DialogTitle>
            <DialogDescription>Replace the raw-material allocation lines for this work order.</DialogDescription>
          </ScrollableDialogHeader>
          <ScrollableDialogBody className="space-y-3">
            {lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-2 rounded-md border p-3 md:grid-cols-7">
                <Input
                  type="number"
                  placeholder="RM ID"
                  value={line.crmRmId || ""}
                  onChange={(e) => updateLine(idx, { crmRmId: Number(e.target.value) })}
                  className="h-8"
                />
                <Input
                  placeholder="Type"
                  value={line.rmType}
                  onChange={(e) => updateLine(idx, { rmType: e.target.value })}
                  className="h-8"
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setLines((prev) => [...prev, emptyLine()])}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Line
            </Button>
          </ScrollableDialogBody>
          <ScrollableDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditorOpen(false)}
              disabled={saveMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Allocations
            </Button>
          </ScrollableDialogFooter>
        </ScrollableDialogContent>
      </Dialog>
    </Card>
  )
}
