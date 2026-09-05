"use client"

import { useState, useMemo, Suspense } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Plus,
  Pencil,
  RefreshCw,
  Loader2,
  Upload,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import { PageHeader } from "@/components/common/page-header"

import {
  GroupFormDialog,
  ItemPickerDialog,
  ItemListTable,
  GroupItemsImportDialog,
  GroupItemV2EditDialog,
} from "@/components/finance/rm-pricing/groups"
import { CostRecalculateDialog } from "@/components/finance/rm-pricing/costs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useRMGroup } from "@/hooks/finance/use-rm-group"
import { useRemoveItemsFromGroup } from "@/hooks/finance/use-rm-group-items"
import { useSyncPeriods } from "@/hooks/finance/use-oracle-sync"
import { useGroupItemRates } from "@/hooks/finance/use-group-item-rates"

import type { RMGroupHead, RMGroupDetail } from "@/types/finance/rm-group"
import {
  RM_VALUATION_FLAG_LABELS,
  RM_MARKETING_FLAG_LABELS,
} from "@/types/finance/rm-group"
import {
  RMValuationFlag,
  RMMarketingFlag,
} from "@/types/generated/finance/v1/rm_group"

function formatDecimal(val: number | undefined, digits = 6): string {
  if (val === undefined || val === null) return "—"
  return val.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  })
}

/** Format a decimal-stored percent (0.04) as a whole-percent string ("4.00"). */
function formatPctFromDecimal(val: number | undefined, digits = 2): string {
  if (val === undefined || val === null) return "—"
  return (val * 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  })
}

function valuationFlagLabel(flag: number | undefined): string {
  if (flag === undefined) return "AUTO"
  return RM_VALUATION_FLAG_LABELS[flag as RMValuationFlag] || "AUTO"
}

function marketingFlagLabel(flag: number | undefined): string {
  if (flag === undefined) return "AUTO"
  return RM_MARKETING_FLAG_LABELS[flag as RMMarketingFlag] || "AUTO"
}

function GroupDetailContent() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.groupId as string

  const { data, isLoading, isError, error } = useRMGroup(groupId)
  const removeItemsMutation = useRemoveItemsFromGroup()

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isRecalcOpen, setIsRecalcOpen] = useState(false)
  const [editValuationDetail, setEditValuationDetail] = useState<RMGroupDetail | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState("")

  const { data: periodsData } = useSyncPeriods()
  const periods = useMemo(() => periodsData?.periods || [], [periodsData?.periods])

  // Auto-select the latest period on first load. Using useMemo avoids the
  // lint error from calling setState inside useEffect.
  const effectivePeriod = useMemo(() => {
    if (selectedPeriod) return selectedPeriod
    return periods.length > 0 ? periods[0] : ""
  }, [selectedPeriod, periods])

  const { data: ratesData, isLoading: ratesLoading } = useGroupItemRates(
    groupId,
    effectivePeriod
  )
  const rates = ratesData?.data || []

  const group = data?.data as (RMGroupHead & { details?: RMGroupDetail[] }) | undefined
  const details = group?.details || []

  const handleRemoveItem = async (item: RMGroupDetail) => {
    if (!groupId) return
    try {
      await removeItemsMutation.mutateAsync({
        groupHeadId: groupId,
        groupDetailIds: [item.groupDetailId],
      })
    } catch (error) {
      console.error("Failed to remove item:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError || !group) {
    return (
      <div>
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center text-destructive">
          {error instanceof Error ? error.message : "Failed to load RM group"}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-w-0 overflow-hidden">
      <PageHeader
        title={`${group.groupCode} — ${group.groupName}`}
        subtitle={group.isActive ? "Active" : "Inactive"}
      >
        <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0">
          <Button variant="outline" onClick={() => router.back()} size="sm" className="h-9">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button variant="outline" onClick={() => setIsRecalcOpen(true)} size="sm" className="h-9">
            <RefreshCw className="mr-2 h-4 w-4" />
            Recalculate
          </Button>
          <Button variant="outline" onClick={() => setIsEditOpen(true)} size="sm" className="h-9">
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6">
        {/* Group Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="min-w-0">
            <CardHeader className="pb-2 text-sm font-medium">
              Marketing Inputs
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duty %</span>
                  <span className="font-mono">{formatPctFromDecimal(group.costPercentage)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transport Rate</span>
                  <span className="font-mono">{formatDecimal(group.costPerKg, 4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Freight Rate</span>
                  <span className="font-mono">
                    {formatDecimal(group.marketingFreightRate, 4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Anti Dumping %</span>
                  <span className="font-mono">
                    {formatPctFromDecimal(group.marketingAntiDumpingPct)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Default Value</span>
                  <span className="font-mono">
                    {formatDecimal(group.marketingDefaultValue, 4)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader className="pb-2 text-sm font-medium">
              Selection Flags
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Valuation</span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {valuationFlagLabel(group.valuationFlag)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Marketing</span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {marketingFlagLabel(group.marketingFlag)}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground pt-2 border-t">
                  AUTO uses cascade fallback (CL→SL→FL→PR / SP→PP→FP).
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader className="pb-2 text-sm font-medium">
              Details
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">Colourant</span>
                  <span className="truncate text-right">{group.colourant || "—"}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">CI Name</span>
                  <span className="truncate text-right">{group.ciName || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items</span>
                  <Badge variant="secondary">{details.length}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Items List with per-stage rates */}
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Group Items</CardTitle>
                <CardDescription>
                  {details.length} item{details.length !== 1 ? "s" : ""} · rates shown for selected period
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Select value={effectivePeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Period" />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => setIsPickerOpen(true)} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Items
                </Button>
                <Button
                  onClick={() => setIsImportOpen(true)}
                  size="sm"
                  variant="outline"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Import Items
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <ItemListTable
              data={details}
              isLoading={isLoading}
              onRemove={handleRemoveItem}
              onEditValuation={setEditValuationDetail}
              rates={rates}
              ratesLoading={ratesLoading}
              period={effectivePeriod}
            />
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <GroupFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        group={group}
      />

      <ItemPickerDialog
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        groupHeadId={groupId}
        groupCode={group.groupCode || ""}
      />

      <GroupItemsImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        groupHeadId={groupId}
        groupCode={group.groupCode || ""}
      />

      <CostRecalculateDialog
        open={isRecalcOpen}
        onOpenChange={setIsRecalcOpen}
        defaultGroupHeadId={groupId}
      />

      <GroupItemV2EditDialog
        open={!!editValuationDetail}
        onOpenChange={(open) => !open && setEditValuationDetail(null)}
        detail={editValuationDetail}
      />
    </div>
  )
}

export default function GroupDetailPageClient() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <GroupDetailContent />
    </Suspense>
  )
}
