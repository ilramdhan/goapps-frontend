"use client"

import { useState } from "react"
import { Activity, AlertTriangle, CircleCheck, ListChecks } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeader } from "@/components/common/page-header"
import { KpiCard, KpiGrid } from "@/components/common"
import { EmptyState } from "@/components/common/empty-state"
import { Badge } from "@/components/ui/badge"
import { DataTable, type ColumnDef } from "@/components/shared"
import { cn } from "@/lib/utils"

import { useMorningReview } from "@/hooks/ppc/use-dashboard"
import { AREA_OPTIONS, AREA_LABELS, todayIso, humanizeEnumValue } from "@/types/ppc/common"
import type {
  MorningReviewMachineRow,
  MorningReviewIssue,
  MorningReviewPriority,
} from "@/types/ppc/dashboard"

function severityClass(sev: string): string {
  if (sev === "BLOCK") return "border-transparent bg-destructive/10 text-destructive"
  if (sev === "WARNING")
    return "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
  return "border-transparent bg-muted text-muted-foreground"
}

const machineColumns: ColumnDef<MorningReviewMachineRow>[] = [
  { id: "machineNo", header: "Machine", accessorKey: "machineNo", width: "w-[120px]" },
  { id: "area", header: "Area", cell: (r) => AREA_LABELS[r.area] ?? "—", width: "w-[80px]" },
  { id: "qtyTarget", header: "Target (kg)", cell: (r) => Number(r.qtyTarget).toLocaleString() },
  { id: "qtyActual", header: "Actual (kg)", cell: (r) => Number(r.qtyActual).toLocaleString() },
  {
    id: "variancePct",
    header: "Variance",
    cell: (r) => {
      const v = Number(r.variancePct)
      const cls = v < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
      return <span className={cls}>{v > 0 ? "+" : ""}{v.toFixed(1)}%</span>
    },
  },
  {
    id: "flag",
    header: "Status",
    cell: (r) => <span className="capitalize">{humanizeEnumValue(r.flag)}</span>,
    width: "w-[110px]",
  },
]

const priorityColumns: ColumnDef<MorningReviewPriority>[] = [
  { id: "transNo", header: "WO No", accessorKey: "transNo", width: "w-[130px]", cellClassName: "font-mono text-xs" },
  { id: "productCode", header: "Product", accessorKey: "productCode" },
  { id: "machineNo", header: "Machine", accessorKey: "machineNo", width: "w-[110px]" },
  { id: "deadline", header: "Deadline", accessorKey: "deadline", width: "w-[120px]" },
  { id: "qtyTarget", header: "Target (kg)", cell: (r) => Number(r.qtyTarget).toLocaleString() },
]

export default function MorningReviewClient() {
  const [date, setDate] = useState(todayIso())
  const [area, setArea] = useState(0)

  const { data, isLoading } = useMorningReview({ date, area })

  const issues: MorningReviewIssue[] = data?.openIssues ?? []
  const rows: MorningReviewMachineRow[] = data?.actualVsPlan ?? []
  const priorities: MorningReviewPriority[] = data?.priorities ?? []

  return (
    <div className="space-y-6">
      <PageHeader title="Morning Review" subtitle="Start-of-day production status">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-[160px]"
          />
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
        </div>
      </PageHeader>

      <KpiGrid cols={4}>
        <KpiCard
          title="Machines Running"
          value={`${data?.machinesRunning ?? 0} / ${data?.machinesTotal ?? 0}`}
          icon={Activity}
          loading={isLoading}
        />
        <KpiCard
          title="WOs Pending Approval"
          value={data?.wosPendingApproval ?? 0}
          icon={ListChecks}
          variant={(data?.wosPendingApproval ?? 0) > 0 ? "warning" : "default"}
          loading={isLoading}
        />
        <KpiCard
          title="Unmatched SO"
          value={data?.unmatchedSoCount ?? 0}
          icon={AlertTriangle}
          variant={(data?.unmatchedSoCount ?? 0) > 0 ? "warning" : "default"}
          loading={isLoading}
        />
        <KpiCard
          title="Open Issues"
          value={issues.length}
          icon={CircleCheck}
          variant={issues.length > 0 ? "destructive" : "success"}
          loading={isLoading}
        />
      </KpiGrid>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Actual vs Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={rows}
                columns={machineColumns}
                isLoading={isLoading}
                keyField="machineId"
                emptyMessage="No machine data"
                emptyDescription="No production recorded for this date yet."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Today&apos;s Priorities</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={priorities}
                columns={priorityColumns}
                isLoading={isLoading}
                keyField="woId"
                emptyMessage="No priorities"
                emptyDescription="No priority work orders for this date."
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Open Issues</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading && <div className="h-24 animate-pulse rounded-md bg-muted" />}
              {!isLoading && issues.length === 0 && (
                <EmptyState title="No open issues" description="Everything looks clear." />
              )}
              {!isLoading &&
                issues.map((issue, i) => (
                  <div key={i} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{issue.title}</span>
                      <Badge variant="outline" className={cn("text-[10px]", severityClass(issue.severity))}>
                        {humanizeEnumValue(issue.severity)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{issue.detail}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {humanizeEnumValue(issue.issueType)}
                    </p>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
