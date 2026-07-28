"use client"

import { useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Plus, Loader2 } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/common/page-header"
import { DataTablePagination } from "@/components/shared"

import { PlanItemTable } from "@/components/ppc/plan/plan-item-table"
import { PlanItemFilters } from "@/components/ppc/plan/plan-item-filters"
import { PlanItemFormDialog } from "@/components/ppc/plan/plan-item-form-dialog"
import { PlanItemDeleteDialog } from "@/components/ppc/plan/plan-item-delete-dialog"
import { PlanItemConfirmDialog } from "@/components/ppc/plan/plan-item-confirm-dialog"
import { PlanGantt } from "@/components/ppc/plan/plan-gantt"

import { usePlanItems } from "@/hooks/ppc/use-plan-item"
import { useUrlState } from "@/lib/hooks"
import type { PlanItem, ListPlanItemsParams } from "@/types/ppc/plan-item"
import { PlanItemType, PlanItemStatus, currentMonth } from "@/types/ppc/common"

const defaultFilters: ListPlanItemsParams = {
  page: 1,
  pageSize: 10,
  search: "",
  month: currentMonth(),
  type: PlanItemType.PLAN_ITEM_TYPE_UNSPECIFIED,
  status: PlanItemStatus.PLAN_ITEM_STATUS_UNSPECIFIED,
  sortBy: "sequence",
  sortOrder: "asc",
}

function PlanPageContent() {
  const router = useRouter()
  const [filters, setFilters] = useUrlState<ListPlanItemsParams>({
    defaultValues: defaultFilters,
  })

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [selected, setSelected] = useState<PlanItem | null>(null)

  const { data, isLoading, isError, error } = usePlanItems(filters)

  const handleAddNew = () => {
    setSelected(null)
    setIsFormOpen(true)
  }

  const handleView = (item: PlanItem) => {
    router.push(`/production-plan/plan/${item.planItemId}`)
  }

  const handleEdit = (item: PlanItem) => {
    setSelected(item)
    setIsFormOpen(true)
  }

  const handleConfirm = (item: PlanItem) => {
    setSelected(item)
    setIsConfirmOpen(true)
  }

  const handleDelete = (item: PlanItem) => {
    setSelected(item)
    setIsDeleteOpen(true)
  }

  const pagination = data?.pagination
  const totalItems = pagination?.totalItems ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Plan"
        subtitle="Plan items and machine timeline for the selected month"
      >
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Plan Item
        </Button>
      </PageHeader>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="gantt">Gantt</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Plan Items</CardTitle>
              <CardDescription>
                {isLoading ? "Loading..." : `${totalItems} total plan items`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <PlanItemFilters filters={filters} onFiltersChange={setFilters} />

              {isError && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
                  {error instanceof Error ? error.message : "Failed to load plan items"}
                </div>
              )}

              <PlanItemTable
                data={data?.data ?? []}
                isLoading={isLoading}
                onView={handleView}
                onEdit={handleEdit}
                onConfirm={handleConfirm}
                onDelete={handleDelete}
              />

              {totalItems > 0 && (
                <DataTablePagination
                  currentPage={pagination?.currentPage ?? 1}
                  pageSize={pagination?.pageSize ?? 10}
                  totalItems={totalItems}
                  totalPages={pagination?.totalPages ?? 0}
                  onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
                  onPageSizeChange={(pageSize) =>
                    setFilters((prev) => ({ ...prev, pageSize, page: 1 }))
                  }
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gantt">
          <PlanGantt />
        </TabsContent>
      </Tabs>

      <PlanItemFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        planItem={selected}
      />

      <PlanItemConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        planItem={selected}
      />

      <PlanItemDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        planItem={selected}
      />
    </div>
  )
}

function PlanPageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Plan"
        subtitle="Plan items and machine timeline for the selected month"
      >
        <Button disabled>
          <Plus className="mr-2 h-4 w-4" />
          Add Plan Item
        </Button>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Plan Items</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PlanPageClient() {
  return (
    <Suspense fallback={<PlanPageSkeleton />}>
      <PlanPageContent />
    </Suspense>
  )
}
