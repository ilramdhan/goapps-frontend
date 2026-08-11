"use client"

import { useState, Suspense } from "react"
import { Plus, Loader2 } from "lucide-react"

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
  SpinFixedCostFormDialog,
  SpinFixedCostDeleteDialog,
  SpinFixedCostFilters,
  SpinFixedCostTable,
  SpinFixedCostPagination,
} from "@/components/finance/spin-fixed-cost"

import { useSpinFixedCosts } from "@/hooks/finance/use-spin-fixed-cost"
import { useUrlState } from "@/lib/hooks"
import { usePermissionContext } from "@/providers/permission-provider"
import { PERMISSIONS } from "@/lib/rbac/permissions"
import {
  type SpinFixedCost,
  type ListSpinFixedCostsParams,
  ActiveFilter,
} from "@/types/finance/spin-fixed-cost"

const PAGE_TITLE = "Spin Fixed Cost"
const PAGE_SUBTITLE = "Monthly POY spinning fixed-cost pool shared by every POY product"

const defaultFilters: ListSpinFixedCostsParams = {
  page: 1,
  pageSize: 10,
  search: "",
  period: "",
  activeFilter: ActiveFilter.ACTIVE_FILTER_UNSPECIFIED,
  sortBy: "period",
  sortOrder: "desc",
}

function SpinFixedCostPageContent() {
  const [filters, setFilters] = useUrlState<ListSpinFixedCostsParams>({
    defaultValues: defaultFilters,
  })

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<SpinFixedCost | null>(null)

  const { hasPermission } = usePermissionContext()
  const canCreate = hasPermission(PERMISSIONS.SpinFixedCost.spinfixedcostCreate)

  const { data, isLoading, isError, error } = useSpinFixedCosts(filters)

  const handleAddNew = () => {
    setSelected(null)
    setIsFormOpen(true)
  }

  const handleEdit = (spinFixedCost: SpinFixedCost) => {
    setSelected(spinFixedCost)
    setIsFormOpen(true)
  }

  const handleDelete = (spinFixedCost: SpinFixedCost) => {
    setSelected(spinFixedCost)
    setIsDeleteOpen(true)
  }

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }))
  }

  const handlePageSizeChange = (pageSize: number) => {
    setFilters((prev) => ({ ...prev, pageSize, page: 1 }))
  }

  // Cycle asc -> desc on the same column, otherwise start on the new column.
  const handleSort = (sortKey: string) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: sortKey,
      sortOrder: prev.sortBy === sortKey && prev.sortOrder === "asc" ? "desc" : "asc",
      page: 1,
    }))
  }

  const totalItems = data?.pagination?.totalItems ?? 0

  return (
    <div>
      <PageHeader title={PAGE_TITLE} subtitle={PAGE_SUBTITLE}>
        {canCreate && (
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add Spin Fixed Cost
          </Button>
        )}
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Spin Fixed Cost List</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${totalItems} total periods`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SpinFixedCostFilters filters={filters} onFiltersChange={setFilters} />

          {isError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
              {error instanceof Error ? error.message : "Failed to load spin fixed costs"}
            </div>
          )}

          <SpinFixedCostTable
            data={data?.data || []}
            isLoading={isLoading}
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder === "asc" ? "asc" : "desc"}
            onSort={handleSort}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />

          <SpinFixedCostPagination
            pagination={data?.pagination}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </CardContent>
      </Card>

      <SpinFixedCostFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        spinFixedCost={selected}
      />

      <SpinFixedCostDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        spinFixedCost={selected}
      />
    </div>
  )
}

function SpinFixedCostPageSkeleton() {
  return (
    <div>
      <PageHeader title={PAGE_TITLE} subtitle={PAGE_SUBTITLE}>
        <Button disabled>
          <Plus className="mr-2 h-4 w-4" />
          Add Spin Fixed Cost
        </Button>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Spin Fixed Cost List</CardTitle>
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

export default function SpinFixedCostPageClient() {
  return (
    <Suspense fallback={<SpinFixedCostPageSkeleton />}>
      <SpinFixedCostPageContent />
    </Suspense>
  )
}
