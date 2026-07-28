"use client"

import { useState, Suspense } from "react"
import { Plus } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/common"
import { ConfirmDialog, DataTablePagination } from "@/components/shared"

import {
  CapacityTable,
  CapacityFilters,
  CapacityFormDialog,
} from "@/components/ppc/product-machine-capacity"

import {
  useProductMachineCapacities,
  useDeleteProductMachineCapacity,
} from "@/hooks/ppc/use-masters"
import { useUrlState } from "@/lib/hooks"
import type { ProductMachineCapacity, ListProductMachineCapacitiesParams } from "@/types/ppc/master"

const defaultFilters: ListProductMachineCapacitiesParams = {
  page: 1,
  pageSize: 10,
}

function CapacitiesContent() {
  const [filters, setFilters] = useUrlState<ListProductMachineCapacitiesParams>({
    defaultValues: defaultFilters,
  })

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selected, setSelected] = useState<ProductMachineCapacity | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductMachineCapacity | null>(null)

  const { data, isLoading, isError, error } = useProductMachineCapacities(filters)
  const deleteMutation = useDeleteProductMachineCapacity()

  const handleAddNew = () => {
    setSelected(null)
    setIsFormOpen(true)
  }

  const handleEdit = (row: ProductMachineCapacity) => {
    setSelected(row)
    setIsFormOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(String(deleteTarget.capacityId))
      setDeleteTarget(null)
    } catch (e) {
      console.error("Failed to delete capacity:", e)
    }
  }

  const totalItems = data?.pagination?.totalItems ?? 0

  return (
    <div>
      <PageHeader
        title="Product Machine Capacities"
        subtitle="Planning capacity and efficiency per product-machine pair"
      >
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Capacity
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Capacity List</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${totalItems} total capacities`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CapacityFilters filters={filters} onFiltersChange={setFilters} />

          {isError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
              {error instanceof Error ? error.message : "Failed to load capacities"}
            </div>
          )}

          <CapacityTable
            data={data?.data || []}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={setDeleteTarget}
          />

          {totalItems > 0 && (
            <DataTablePagination
              currentPage={data?.pagination?.currentPage ?? 1}
              pageSize={data?.pagination?.pageSize ?? 10}
              totalItems={totalItems}
              totalPages={data?.pagination?.totalPages ?? 0}
              onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
              onPageSizeChange={(pageSize) => setFilters((prev) => ({ ...prev, pageSize, page: 1 }))}
            />
          )}
        </CardContent>
      </Card>

      <CapacityFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} capacity={selected} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Capacity"
        description="Are you sure you want to delete this capacity entry? This action cannot be undone."
        variant="destructive"
        isLoading={deleteMutation.isPending}
        confirmText="Delete"
        onConfirm={handleDelete}
      />
    </div>
  )
}

export default function CapacitiesPageClient() {
  return (
    <Suspense fallback={null}>
      <CapacitiesContent />
    </Suspense>
  )
}
