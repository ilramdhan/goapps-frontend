"use client"

// Two-part shift-entry form: Part 1 = machine positions + running,
// Part 2 = downtime entries + waste entries. status FINAL recomputes efficiency.

import { useState } from "react"
import { Plus, Trash2, Loader2 } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useSubmitShiftEntry } from "@/hooks/ppc/use-daily-performance"
import { useDowntimeReasons, useWasteCategories } from "@/hooks/ppc/use-masters"
import { AREA_OPTIONS, todayIso } from "@/types/ppc/common"
import type { AreaCode } from "@/types/generated/ppc/v1/common"
import type { DowntimeEntry, WasteEntry } from "@/types/ppc/daily-performance"
import { MachineCombobox, ShiftCombobox } from "@/components/ppc/comboboxes"

export function ShiftEntryForm() {
  const submit = useSubmitShiftEntry()

  const [area, setArea] = useState(1)
  const [machineId, setMachineId] = useState("")
  const [date, setDate] = useState(todayIso())
  const [shift, setShift] = useState("1")
  const [positionsTotal, setPositionsTotal] = useState("")
  const [positionsRunning, setPositionsRunning] = useState("")
  const [status, setStatus] = useState<"DRAFT" | "FINAL">("DRAFT")
  const [downtime, setDowntime] = useState<DowntimeEntry[]>([])
  const [waste, setWaste] = useState<WasteEntry[]>([])

  const { data: reasons } = useDowntimeReasons({ area, pageSize: 100 })
  const { data: categories } = useWasteCategories({ area, pageSize: 100 })

  const addDowntime = () => setDowntime((d) => [...d, { reasonId: 0, durationMin: 0, notes: "" }])
  const addWaste = () => setWaste((w) => [...w, { categoryId: 0, qtyKg: "", isUpset: false, notes: "" }])

  async function handleSubmit(finalize: boolean) {
    await submit.mutateAsync({
      machineId: Number(machineId),
      date,
      shift,
      positionsTotal: Number(positionsTotal) || 0,
      positionsRunning: positionsRunning || "0",
      runningMinutes: 0, // derived server-side (v1.2)
      status: finalize ? "FINAL" : "DRAFT",
      downtimeEntries: downtime.filter((d) => d.reasonId > 0),
      wasteEntries: waste.filter((w) => w.categoryId > 0),
    })
    setStatus(finalize ? "FINAL" : "DRAFT")
  }

  return (
    <div className="space-y-6">
      {/* Part 1 — machine + positions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Shift &amp; Positions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Area</Label>
            <Select value={String(area)} onValueChange={(v) => setArea(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AREA_OPTIONS.filter((o) => o.value !== 0).map((o) => (
                  <SelectItem key={o.value} value={String(o.value)}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Machine</Label>
            <MachineCombobox
              value={machineId ? Number(machineId) : undefined}
              area={area ? (area as AreaCode) : undefined}
              onChange={(id) => setMachineId(String(id))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Shift</Label>
            <ShiftCombobox value={shift} onChange={(code) => setShift(code)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Positions Total</Label>
            <Input value={positionsTotal} onChange={(e) => setPositionsTotal(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Positions Running</Label>
            <Input value={positionsRunning} onChange={(e) => setPositionsRunning(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Part 2a — downtime */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold">Downtime Events</CardTitle>
          <Button variant="outline" size="sm" onClick={addDowntime}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {downtime.length === 0 && <p className="text-xs text-muted-foreground">No downtime entries.</p>}
          {downtime.map((d, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <div className="min-w-[180px] flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Reason</Label>
                <Select
                  value={String(d.reasonId || "")}
                  onValueChange={(v) =>
                    setDowntime((arr) => arr.map((x, xi) => (xi === i ? { ...x, reasonId: Number(v) } : x)))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {(reasons?.data ?? []).map((r) => (
                      <SelectItem key={r.reasonId} value={String(r.reasonId)}>
                        {r.code} — {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-28 space-y-1">
                <Label className="text-xs text-muted-foreground">Duration (min)</Label>
                <Input
                  type="number"
                  value={d.durationMin ?? ""}
                  onChange={(e) =>
                    setDowntime((arr) =>
                      arr.map((x, xi) => (xi === i ? { ...x, durationMin: Number(e.target.value) } : x))
                    )
                  }
                />
              </div>
              <div className="min-w-[140px] flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Input
                  value={d.notes ?? ""}
                  onChange={(e) =>
                    setDowntime((arr) => arr.map((x, xi) => (xi === i ? { ...x, notes: e.target.value } : x)))
                  }
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDowntime((arr) => arr.filter((_, xi) => xi !== i))}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Part 2b — waste */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold">Waste / Downgrade</CardTitle>
          <Button variant="outline" size="sm" onClick={addWaste}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {waste.length === 0 && <p className="text-xs text-muted-foreground">No waste entries.</p>}
          {waste.map((w, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <div className="min-w-[180px] flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Select
                  value={String(w.categoryId || "")}
                  onValueChange={(v) =>
                    setWaste((arr) => arr.map((x, xi) => (xi === i ? { ...x, categoryId: Number(v) } : x)))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(categories?.data ?? []).map((c) => (
                      <SelectItem key={c.categoryId} value={String(c.categoryId)}>
                        {c.code} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-28 space-y-1">
                <Label className="text-xs text-muted-foreground">Qty (kg)</Label>
                <Input
                  value={w.qtyKg}
                  onChange={(e) =>
                    setWaste((arr) => arr.map((x, xi) => (xi === i ? { ...x, qtyKg: e.target.value } : x)))
                  }
                />
              </div>
              <div className="min-w-[140px] flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Input
                  value={w.notes ?? ""}
                  onChange={(e) =>
                    setWaste((arr) => arr.map((x, xi) => (xi === i ? { ...x, notes: e.target.value } : x)))
                  }
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setWaste((arr) => arr.filter((_, xi) => xi !== i))}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="mr-auto text-xs text-muted-foreground">
          {status === "FINAL" ? "Last saved as FINAL (efficiency recomputed)." : "Draft — not yet finalized."}
        </span>
        <Button variant="outline" disabled={submit.isPending || !machineId} onClick={() => handleSubmit(false)}>
          {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Draft
        </Button>
        <Button disabled={submit.isPending || !machineId} onClick={() => handleSubmit(true)}>
          {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Final
        </Button>
      </div>
    </div>
  )
}
