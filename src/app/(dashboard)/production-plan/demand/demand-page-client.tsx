"use client"

import { Suspense, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, DownloadCloud, CalendarPlus, Loader2 } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/common"
import { DataTablePagination } from "@/components/shared"

import {
  DemandTable,
  DemandFilters,
  DemandFormDialog,
  DemandDeleteDialog,
  PullFromOrionDialog,
  CarryForwardWizard,
  MapProductDialog,
  ConfirmDemandDialog,
} from "@/components/ppc/demand"

import { useDemands } from "@/hooks/ppc/use-demand"
import { useUrlState } from "@/lib/hooks"
import type { Demand, ListDemandsParams } from "@/types/ppc/demand"
import { DemandType, DemandStatus } from "@/types/ppc/common"

type TabKey = "all" | "byOrder" | "mts"

interface DemandTabState extends ListDemandsParams {
  tab?: TabKey
}

const LOCKED_TYPE: Record<TabKey, DemandType | undefined> = {
  all: undefined,
  byOrder: DemandType.DEMAND_TYPE_CONTRACT,
  mts: DemandType.DEMAND_TYPE_MTS,
}

const defaultFilters: DemandTabState = {
  page: 1,
  pageSize: 10,
  search: "",
  month: "",
  status: DemandStatus.DEMAND_STATUS_UNSPECIFIED,
  type: DemandType.DEMAND_TYPE_UNSPECIFIED,
  tab: "all",
  sortBy: "deadline",
  sortOrder: "asc",
}

function DemandPageContent() {
  const router = useRouter()

  const [filters, setFilters] = useUrlState<DemandTabState>({
    defaultValues: defaultFilters,
  })

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isPullOpen, setIsPullOpen] = useState(false)
  const [isCarryOpen, setIsCarryOpen] = useState(false)
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null)
  const [mapProductTarget, setMapProductTarget] = useState<Demand | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<Demand | null>(null)

  const tab: TabKey = filters.tab ?? "all"
  const lockedType = LOCKED_TYPE[tab]

  // Effective query params: locked type overrides the free type filter.
  const queryParams: ListDemandsParams = useMemo(() => {
    const rest = { ...filters }
    delete (rest as { tab?: TabKey }).tab
    return {
      ...rest,
      type: lockedType ?? rest.type,
    }
  }, [filters, lockedType])

  const { data, isLoading, isError, error } = useDemands(queryParams)

  const handleTabChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      tab: value as TabKey,
      type: LOCKED_TYPE[value as TabKey] ?? DemandType.DEMAND_TYPE_UNSPECIFIED,
      page: 1,
    }))
  }

  const handleAddNew = () => {
    setSelectedDemand(null)
    setIsFormOpen(true)
  }

  const handleView = (demand: Demand) => {
    router.push(`/production-plan/demand/${demand.demandId}`)
  }

  const handleEdit = (demand: Demand) => {
    setSelectedDemand(demand)
    setIsFormOpen(true)
  }

  const handleDelete = (demand: Demand) => {
    setSelectedDemand(demand)
    setIsDeleteOpen(true)
  }

  // Confirm opens a pre-check dialog rather than firing immediately: a demand
  // is often missing data that a confirmed demand is expected to carry, and the
  // dialog lets the planner fill it in the same action.
  const handleConfirm = (demand: Demand) => {
    setConfirmTarget(demand)
  }

  const handleMapProduct = (demand: Demand) => {
    setMapProductTarget(demand)
  }

  const totalItems = data?.pagination?.totalItems ?? 0

  const table = (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Demands</CardTitle>
        <CardDescription>{isLoading ? "Loading..." : `${totalItems} total demands`}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <DemandFilters filters={filters} onFiltersChange={setFilters} lockedType={lockedType} />

        {isError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
            {error instanceof Error ? error.message : "Failed to load demands"}
          </div>
        )}

        <DemandTable
          data={data?.data ?? []}
          isLoading={isLoading}
          onView={handleView}
          onEdit={handleEdit}
          onConfirm={handleConfirm}
          onMapProduct={handleMapProduct}
          onDelete={handleDelete}
        />

        <DataTablePagination
          currentPage={filters.page ?? 1}
          pageSize={filters.pageSize ?? 10}
          totalItems={totalItems}
          totalPages={data?.pagination?.totalPages ?? 0}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
          onPageSizeChange={(pageSize) => setFilters((prev) => ({ ...prev, pageSize, page: 1 }))}
        />
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <PageHeader title="Production Demand" subtitle="Layer-1 production commitments — contracts, MTS, and samples">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setIsCarryOpen(true)}>
            <CalendarPlus className="mr-2 h-4 w-4" />
            Start New Month
          </Button>
          <Button variant="outline" onClick={() => setIsPullOpen(true)}>
            <DownloadCloud className="mr-2 h-4 w-4" />
            Pull from Orion
          </Button>
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add Demand
          </Button>
        </div>
      </PageHeader>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="byOrder">By Order</TabsTrigger>
          <TabsTrigger value="mts">MTS</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          {table}
        </TabsContent>
        <TabsContent value="byOrder" className="mt-4">
          {table}
        </TabsContent>
        <TabsContent value="mts" className="mt-4">
          {table}
        </TabsContent>
      </Tabs>

      <DemandFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} demand={selectedDemand} />
      <DemandDeleteDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} demand={selectedDemand} />
      <PullFromOrionDialog open={isPullOpen} onOpenChange={setIsPullOpen} />
      <CarryForwardWizard open={isCarryOpen} onOpenChange={setIsCarryOpen} />
      <MapProductDialog
        open={!!mapProductTarget}
        onOpenChange={(open) => !open && setMapProductTarget(null)}
        demand={mapProductTarget}
      />
      <ConfirmDemandDialog
        open={!!confirmTarget}
        onOpenChange={(open) => !open && setConfirmTarget(null)}
        demand={confirmTarget}
      />
    </div>
  )
}

function DemandPageFallback() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}

export default function DemandPageClient() {
  return (
    <Suspense fallback={<DemandPageFallback />}>
      <DemandPageContent />
    </Suspense>
  )
}
