"use client"

import { Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import type { RMCost, RMCostHistory } from "@/types/finance/rm-cost"
import { RM_COST_TRIGGER_REASON_LABELS } from "@/types/finance/rm-cost"
import { RM_GROUP_FLAG_LABELS } from "@/types/finance/rm-group"
import {
  RMGroupFlag,
  RMValuationFlag,
  RMMarketingFlag,
} from "@/types/generated/finance/v1/rm_group"
import { CostV2InputsPanel } from "./cost-v2-inputs-panel"
import { CostDetailSnapshotsPanel } from "./cost-detail-snapshots-panel"

interface CostDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cost: RMCost | null
  defaultTab?: "detail" | "history" | "inputs" | "snapshots"
  history?: RMCostHistory[]
  isHistoryLoading?: boolean
}

function formatVal(val: number | undefined, digits = 6): string {
  if (val === undefined || val === null) return "—"
  return val.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  })
}

function flagLabel(flag: number | undefined): string {
  if (flag === undefined) return "—"
  return RM_GROUP_FLAG_LABELS[flag as RMGroupFlag] || "—"
}

// Short badge labels for V2 valuation flag (no parenthetical descriptor).
function valuationFlagLabel(flag: RMValuationFlag | undefined): string {
  switch (flag) {
    case RMValuationFlag.RM_VALUATION_FLAG_CR:
      return "CR"
    case RMValuationFlag.RM_VALUATION_FLAG_SR:
      return "SR"
    case RMValuationFlag.RM_VALUATION_FLAG_PR:
      return "PR"
    case RMValuationFlag.RM_VALUATION_FLAG_CL:
      return "CL"
    case RMValuationFlag.RM_VALUATION_FLAG_SL:
      return "SL"
    case RMValuationFlag.RM_VALUATION_FLAG_FL:
      return "FL"
    case RMValuationFlag.RM_VALUATION_FLAG_NONE:
      return "NONE"
    case RMValuationFlag.RM_VALUATION_FLAG_UNSPECIFIED:
    default:
      return "AUTO"
  }
}

// Short badge labels for V2 marketing flag.
function marketingFlagLabel(flag: RMMarketingFlag | undefined): string {
  switch (flag) {
    case RMMarketingFlag.RM_MARKETING_FLAG_SP:
      return "SP"
    case RMMarketingFlag.RM_MARKETING_FLAG_PP:
      return "PP"
    case RMMarketingFlag.RM_MARKETING_FLAG_FP:
      return "FP"
    case RMMarketingFlag.RM_MARKETING_FLAG_NONE:
      return "NONE"
    case RMMarketingFlag.RM_MARKETING_FLAG_UNSPECIFIED:
    default:
      return "AUTO"
  }
}

function formatDateTime(ts: string | undefined): string {
  if (!ts) return "—"
  try {
    return new Date(ts).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return ts
  }
}

function RateRow({ label, value }: { label: string; value: number | undefined }) {
  const isZero = (value ?? 0) === 0
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-mono text-sm ${isZero ? "text-muted-foreground/50" : ""}`}>
        {formatVal(value)}
      </span>
    </div>
  )
}

function CostRow({
  label,
  value,
  flagText,
  flagUsedText,
}: {
  label: string
  value: number | undefined
  /** Configured flag label (e.g. "AUTO", "CL", "CONS"). */
  flagText: string
  /** Resolved flag label after cascade (e.g. AUTO → "CL"). When equal to
   *  flagText, the cascade arrow is omitted. */
  flagUsedText: string
}) {
  const cascaded = flagText !== flagUsedText && flagUsedText !== ""
  return (
    <div className="flex items-center justify-between py-2">
      <div className="space-y-0.5">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-1 text-xs">
          <Badge variant="outline" className="text-[10px]">
            {flagText}
          </Badge>
          {cascaded && (
            <>
              <span className="text-muted-foreground">→</span>
              <Badge variant="secondary" className="text-[10px]">
                {flagUsedText}
              </Badge>
            </>
          )}
        </div>
      </div>
      <span className="font-mono text-sm font-medium">{formatVal(value, 4)}</span>
    </div>
  )
}

export function CostDetailDrawer({
  open,
  onOpenChange,
  cost,
  defaultTab = "detail",
  history,
  isHistoryLoading,
}: CostDetailDrawerProps) {
  if (!cost) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full !max-w-none sm:!max-w-2xl lg:!max-w-4xl p-0"
      >
        <div className="flex h-full flex-col">
          <SheetHeader className="sticky top-0 z-10 border-b bg-background px-6 py-4">
            <SheetTitle className="font-mono">{cost.rmCode}</SheetTitle>
            <SheetDescription>
              Period {cost.period} • {cost.rmName || "—"}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            <Tabs key={`${cost.rmCostId}-${defaultTab}`} defaultValue={defaultTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="detail">Detail</TabsTrigger>
                <TabsTrigger value="snapshots">Items</TabsTrigger>
                <TabsTrigger value="inputs">Edit Inputs</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="detail" className="mt-4 space-y-6">
                <div>
                  <h4 className="text-sm font-medium mb-2">V2 Rates (group totals)</h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-md border p-3 bg-muted/30">
                  <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Base</p>
                  <RateRow label="CR" value={cost.crRate} />
                  <RateRow label="SR" value={cost.srRate} />
                  <RateRow label="PR" value={cost.prRate} />
                </div>
                <div className="rounded-md border p-3 bg-muted/30">
                  <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Valuation Landed</p>
                  <RateRow label="CL" value={cost.clRate} />
                  <RateRow label="SL" value={cost.slRate} />
                  <RateRow label="FL" value={cost.flRate} />
                </div>
                <div className="rounded-md border p-3 bg-muted/30">
                  <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Marketing Inputs</p>
                  <RateRow label="Fix Rate (FR)" value={cost.marketingDefaultValue} />
                  <RateRow label="Sim Rate" value={cost.simulationRate} />
                  <RateRow label="Proj Freight" value={cost.marketingFreightRate} />
                  <RateRow
                    label="Proj Anti %"
                    value={cost.marketingAntiDumpingPct !== undefined && cost.marketingAntiDumpingPct !== null ? cost.marketingAntiDumpingPct * 100 : undefined}
                  />
                  <RateRow
                    label="Proj Duty %"
                    value={cost.marketingDutyPct !== undefined && cost.marketingDutyPct !== null ? cost.marketingDutyPct * 100 : undefined}
                  />
                  <RateRow label="Proj Transport" value={cost.marketingTransportRate} />
                </div>
                <div className="rounded-md border p-3 bg-muted/30">
                  <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Marketing Landed</p>
                  <RateRow label="SP" value={cost.spRate} />
                  <RateRow label="PP" value={cost.ppRate} />
                  <RateRow label="FP" value={cost.fpRate} />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="text-sm font-medium mb-2">Selected Costs</h4>
              <div className="rounded-md border p-3 space-y-1">
                <CostRow
                  label="Valuation"
                  value={cost.costValuation}
                  flagText={valuationFlagLabel(cost.valuationFlag)}
                  flagUsedText={valuationFlagLabel(cost.valuationFlagUsed)}
                />
                <Separator />
                <CostRow
                  label="Marketing"
                  value={cost.costMarketing}
                  flagText={marketingFlagLabel(cost.marketingFlag)}
                  flagUsedText={marketingFlagLabel(cost.marketingFlagUsed)}
                />
                <Separator />
                <CostRow
                  label="Simulation"
                  value={cost.costSimulation}
                  flagText={flagLabel(cost.flagSimulation)}
                  flagUsedText={flagLabel(cost.flagSimulationUsed)}
                />
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="text-sm font-medium mb-2">Metadata</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">UOM</span>
                  <span>{cost.uomCode || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Calculated At</span>
                  <span className="text-xs">{formatDateTime(cost.calculatedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Calculated By</span>
                  <span className="text-xs">{cost.calculatedBy || "—"}</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="snapshots" className="mt-4">
            <CostDetailSnapshotsPanel rmCostId={cost.rmCostId} />
          </TabsContent>

          <TabsContent value="inputs" className="mt-4">
            {/* key forces remount when row changes so internal state resets cleanly */}
            <CostV2InputsPanel key={cost.rmCostId} cost={cost} />
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {isHistoryLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !history || history.length === 0 ? (
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                No history records for this RM code in {cost.period}.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Calculated</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Valuation</TableHead>
                      <TableHead className="text-right">Marketing</TableHead>
                      <TableHead className="text-right">Simulation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((h) => (
                      <TableRow key={h.historyId}>
                        <TableCell className="text-xs">
                          {formatDateTime(h.calculatedAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {RM_COST_TRIGGER_REASON_LABELS[h.triggerReason] || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          <div>{formatVal(h.costValuation, 4)}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {flagLabel(h.flagValuationUsed)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          <div>{formatVal(h.costMarketing, 4)}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {flagLabel(h.flagMarketingUsed)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          <div>{formatVal(h.costSimulation, 4)}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {flagLabel(h.flagSimulationUsed)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
