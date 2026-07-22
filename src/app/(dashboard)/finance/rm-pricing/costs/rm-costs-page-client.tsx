"use client"

import { useState, Suspense, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw, Loader2 } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/common/page-header"

import {
  CostTable,
  CostDetailDrawer,
  CostRecalculateDialog,
  CostFilters,
  CostPagination,
} from "@/components/finance/rm-pricing/costs"
import { ExportRMCostButton } from "@/components/finance/rm-pricing/costs/export-rm-cost-button"

import { useRMCosts, useRMCostHistory, useRMCostPeriods } from "@/hooks/finance/use-rm-cost"
import { useUrlState } from "@/lib/hooks"
import type { RMCost, ListRMCostsParams } from "@/types/finance/rm-cost"

const defaultFilters: ListRMCostsParams = {
  page: 1,
  pageSize: 10,
  period: "",
  search: "",
  sortBy: "rm_code",
  sortOrder: "asc",
}

function RMCostsPageContent() {
  const router = useRouter()
  const [filters, setFilters] = useUrlState<ListRMCostsParams>({
    defaultValues: defaultFilters,
  })

  const [isRecalcOpen, setIsRecalcOpen] = useState(false)
  const [selectedCost, setSelectedCost] = useState<RMCost | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailTab, setDetailTab] = useState<"detail" | "history">("detail")

  const { data: periodsData, isLoading: periodsLoading } = useRMCostPeriods()
  const availablePeriods = periodsData?.periods || []

  const { data, isLoading, isError, error } = useRMCosts(filters)

  // Track whether the initial auto-select has fired (declared before listLoading uses it).
  const autoSelectedRef = useRef(false)

  // Keep a ref to the latest filters.period so the auto-select effect always
  // reads the most up-to-date value (avoids stale-closure issues).
  const filtersPeriodRef = useRef(filters.period)
  filtersPeriodRef.current = filters.period

  // Once autoSelectedRef is true the user has either received a default period
  // or deliberately picked "All Periods" (period=""), so we no longer block on
  // !filters.period.  Also skip the "waiting" gate when a period is already
  // present from the URL (e.g. after a page reload with ?period=202604).
  const listLoading = periodsLoading || (!autoSelectedRef.current && availablePeriods.length > 0 && !filters.period) || isLoading

  // Auto-select the latest available period ONCE on first load when the user
  // has not explicitly picked anything yet. Without the ref guard, selecting
  // "All Period" (which sets filters.period="") immediately snaps back to the
  // latest period.
  useEffect(() => {
    if (autoSelectedRef.current) return
    if (availablePeriods.length === 0) return
    autoSelectedRef.current = true
    // Read period from ref to guarantee we see the latest value (the URL may
    // already carry a period param after a page reload).
    if (!filtersPeriodRef.current) {
      setFilters((prev) => ({ ...prev, period: availablePeriods[0], page: 1 }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availablePeriods.length])

  const historyQuery = useRMCostHistory(
    isDetailOpen && selectedCost
      ? { period: selectedCost.period || "", rmCode: selectedCost.rmCode || "", pageSize: 20 }
      : {}
  )

  const handleViewDetail = (cost: RMCost) => {
    setSelectedCost(cost)
    setDetailTab("detail")
    setIsDetailOpen(true)
  }

  const handleViewHistory = (cost: RMCost) => {
    setSelectedCost(cost)
    setDetailTab("history")
    setIsDetailOpen(true)
  }

  const handleViewItems = (cost: RMCost) => {
    if (!cost.groupHeadId) return
    router.push(`/finance/rm-pricing/groups/${cost.groupHeadId}`)
  }

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }))
  }

  const handlePageSizeChange = (pageSize: number) => {
    setFilters((prev) => ({ ...prev, pageSize, page: 1 }))
  }

  const totalItems = data?.pagination?.totalItems ?? 0

  return (
    <div className="w-full min-w-0 overflow-hidden">
      <PageHeader
        title="RM Costs"
        subtitle="View calculated raw material costs per period"
      >
        <div className="flex items-center gap-2">
          <ExportRMCostButton
            filters={{
              period: filters.period || "",
              rmType: filters.rmType,
              groupHeadId: filters.groupHeadId,
              search: filters.search,
            }}
            disabled={listLoading}
          />
          <Button onClick={() => setIsRecalcOpen(true)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Recalculate
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Cost Data</CardTitle>
            <CardDescription>
              {listLoading
                ? "Loading..."
                : `${totalItems} total cost records`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CostFilters
              filters={filters}
              onFiltersChange={setFilters}
              availablePeriods={availablePeriods}
              defaultPeriod={availablePeriods[0] || ""}
            />

            {isError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
                {error instanceof Error
                  ? error.message
                  : "Failed to load RM costs"}
              </div>
            )}

            <CostTable
              data={data?.data || []}
              isLoading={listLoading}
              onViewDetail={handleViewDetail}
              onViewHistory={handleViewHistory}
              onViewItems={handleViewItems}
            />

            <CostPagination
              pagination={data?.pagination}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </CardContent>
        </Card>
      </div>

      <CostDetailDrawer
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        cost={selectedCost}
        defaultTab={detailTab}
        history={historyQuery.data?.data || []}
        isHistoryLoading={historyQuery.isLoading}
      />

      <CostRecalculateDialog
        open={isRecalcOpen}
        onOpenChange={setIsRecalcOpen}
      />
    </div>
  )
}

function RMCostsPageSkeleton() {
  return (
    <div className="w-full min-w-0 overflow-hidden space-y-4">
      <PageHeader
        title="RM Costs"
        subtitle="View calculated raw material costs per period"
      >
        <Button disabled>
          <RefreshCw className="mr-2 h-4 w-4" />
          Recalculate
        </Button>
      </PageHeader>
      <div className="grid grid-cols-1 gap-6">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Cost Data</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function RMCostsPageClient() {
  return (
    <Suspense fallback={<RMCostsPageSkeleton />}>
      <RMCostsPageContent />
    </Suspense>
  )
}
