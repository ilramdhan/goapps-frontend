"use client"

import { useState } from "react"
import { RefreshCw, Loader2 } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/common/page-header"
import { DataTable, DataTablePagination, type ColumnDef } from "@/components/shared"
import { ShiftEntryForm } from "@/components/ppc/daily-performance/shift-entry-form"

import {
  useMachineShiftLogs,
  useEfficiencySnapshots,
  useRecalcEfficiency,
} from "@/hooks/ppc/use-daily-performance"
import { AREA_OPTIONS, AREA_LABELS, todayLocalIso } from "@/types/ppc/common"
import type { MachineShiftLog, EfficiencySnapshot } from "@/types/ppc/daily-performance"

const pct = (s: string) => `${(Number(s) || 0).toFixed(1)}%`

const logColumns: ColumnDef<MachineShiftLog>[] = [
  { id: "machineNo", header: "Machine", accessorKey: "machineNo", width: "w-[120px]" },
  { id: "date", header: "Date", accessorKey: "date", width: "w-[120px]" },
  { id: "shift", header: "Shift", accessorKey: "shift", width: "w-[70px]" },
  { id: "positionsTotal", header: "Positions", accessorKey: "positionsTotal" },
  { id: "positionsRunning", header: "Running", accessorKey: "positionsRunning" },
  { id: "runningMinutes", header: "Run Min", accessorKey: "runningMinutes" },
  { id: "status", header: "Status", accessorKey: "status", width: "w-[90px]" },
]

const snapColumns: ColumnDef<EfficiencySnapshot>[] = [
  { id: "machineId", header: "Machine", cell: (r) => (r.machineId ? `#${r.machineId}` : "—"), width: "w-[100px]" },
  { id: "area", header: "Area", cell: (r) => AREA_LABELS[r.area] ?? "—", width: "w-[80px]" },
  { id: "scope", header: "Scope", accessorKey: "scope" },
  { id: "date", header: "Date", accessorKey: "date", width: "w-[110px]" },
  { id: "shift", header: "Shift", accessorKey: "shift", width: "w-[70px]" },
  { id: "effProductionPct", header: "Eff Prod", cell: (r) => pct(r.effProductionPct) },
  { id: "effRunningPct", header: "Eff Run", cell: (r) => pct(r.effRunningPct) },
  { id: "wastePct", header: "Waste", cell: (r) => pct(r.wastePct) },
]

export default function DailyPerfClient() {
  const [tab, setTab] = useState("entry")
  // Local, not UTC: the entry form on this same screen records a local
  // production date, and the tables below must not disagree with it by a day.
  const [date, setDate] = useState(todayLocalIso())
  const [area, setArea] = useState(0)
  const [logPage, setLogPage] = useState(1)
  const [snapPage, setSnapPage] = useState(1)

  const recalc = useRecalcEfficiency()
  const logs = useMachineShiftLogs({ area, date, page: logPage, pageSize: 10 })
  const snaps = useEfficiencySnapshots({ area, dateFrom: date, dateTo: date, page: snapPage, pageSize: 10 })

  // The date/area/recalc toolbar scopes the two read-only tables, not the entry
  // form — the form carries its own machine, date and shift. Showing it on the
  // entry tab invited the operator to set a date in the wrong place.
  const showTableFilters = tab !== "entry"

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader title="Daily Performance" subtitle="Shift entry, machine logs, and efficiency">
        {showTableFilters && (
          <div className="flex flex-wrap items-center gap-2">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-[160px]" />
            <Select value={String(area)} onValueChange={(v) => setArea(Number(v))}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Area" />
              </SelectTrigger>
              <SelectContent>
                {AREA_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              disabled={recalc.isPending}
              onClick={() => recalc.mutate({ area, date })}
            >
              {recalc.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Recalc Efficiency
            </Button>
          </div>
        )}
      </PageHeader>

      <Tabs value={tab} onValueChange={setTab} className="min-w-0">
        {/* h-12 not the h-9 default: the operator switches tabs with a thumb. */}
        <TabsList className="h-12">
          <TabsTrigger value="entry" className="px-4">
            Shift Entry
          </TabsTrigger>
          <TabsTrigger value="logs" className="px-4">
            Machine Logs
          </TabsTrigger>
          <TabsTrigger value="efficiency" className="px-4">
            Efficiency
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entry" className="mt-4 min-w-0">
          <ShiftEntryForm />
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Machine Shift Logs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DataTable
                data={logs.data?.data ?? []}
                columns={logColumns}
                isLoading={logs.isLoading}
                keyField="logId"
                emptyMessage="No shift logs"
                emptyDescription="No machine shift logs for this date."
              />
              <DataTablePagination
                currentPage={logs.data?.pagination.currentPage ?? 1}
                pageSize={logs.data?.pagination.pageSize ?? 10}
                totalItems={logs.data?.pagination.totalItems ?? 0}
                totalPages={logs.data?.pagination.totalPages ?? 0}
                onPageChange={setLogPage}
                onPageSizeChange={() => setLogPage(1)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="efficiency" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Efficiency Snapshots</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DataTable
                data={snaps.data?.data ?? []}
                columns={snapColumns}
                isLoading={snaps.isLoading}
                keyField="snapshotId"
                emptyMessage="No snapshots"
                emptyDescription="No efficiency snapshots for this date."
              />
              <DataTablePagination
                currentPage={snaps.data?.pagination.currentPage ?? 1}
                pageSize={snaps.data?.pagination.pageSize ?? 10}
                totalItems={snaps.data?.pagination.totalItems ?? 0}
                totalPages={snaps.data?.pagination.totalPages ?? 0}
                onPageChange={setSnapPage}
                onPageSizeChange={() => setSnapPage(1)}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
