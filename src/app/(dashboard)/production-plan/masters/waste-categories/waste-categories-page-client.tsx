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
  WasteCategoriesTable,
  WasteCategoriesFilters,
  WasteCategoryFormDialog,
} from "@/components/ppc/waste-categories"

import { useWasteCategories, useDeleteWasteCategory } from "@/hooks/ppc/use-masters"
import { useUrlState } from "@/lib/hooks"
import type { WasteCategoryMaster, ListWasteCategoryMastersParams } from "@/types/ppc/master"
import { AreaCode, ActiveFilter } from "@/types/ppc/common"

const defaultFilters: ListWasteCategoryMastersParams = {
  page: 1,
  pageSize: 10,
  search: "",
  area: AreaCode.AREA_CODE_UNSPECIFIED,
  type: "",
  activeFilter: ActiveFilter.ACTIVE_FILTER_UNSPECIFIED,
}

function WasteCategoriesContent() {
  const [filters, setFilters] = useUrlState<ListWasteCategoryMastersParams>({
    defaultValues: defaultFilters,
  })

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selected, setSelected] = useState<WasteCategoryMaster | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<WasteCategoryMaster | null>(null)

  const { data, isLoading, isError, error } = useWasteCategories(filters)
  const deleteMutation = useDeleteWasteCategory()

  const handleAddNew = () => {
    setSelected(null)
    setIsFormOpen(true)
  }

  const handleEdit = (row: WasteCategoryMaster) => {
    setSelected(row)
    setIsFormOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(String(deleteTarget.categoryId))
      setDeleteTarget(null)
    } catch (e) {
      console.error("Failed to delete waste category:", e)
    }
  }

  const totalItems = data?.pagination?.totalItems ?? 0

  return (
    <div>
      <PageHeader title="Waste Categories" subtitle="Waste and downgrade categories per production area">
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Waste Category List</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${totalItems} total waste categories`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <WasteCategoriesFilters filters={filters} onFiltersChange={setFilters} />

          {isError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
              {error instanceof Error ? error.message : "Failed to load waste categories"}
            </div>
          )}

          <WasteCategoriesTable
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

      <WasteCategoryFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} category={selected} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Waste Category"
        description={`Are you sure you want to delete "${deleteTarget?.code}"? This action cannot be undone.`}
        variant="destructive"
        isLoading={deleteMutation.isPending}
        confirmText="Delete"
        onConfirm={handleDelete}
      />
    </div>
  )
}

export default function WasteCategoriesPageClient() {
  return (
    <Suspense fallback={null}>
      <WasteCategoriesContent />
    </Suspense>
  )
}
