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
  ParametersTable,
  ParametersFilters,
  ParameterFormDialog,
} from "@/components/ppc/product-machine-parameters"

import {
  useProductMachineParameters,
  useDeleteProductMachineParameter,
} from "@/hooks/ppc/use-masters"
import { useUrlState } from "@/lib/hooks"
import type {
  ProductMachineParameter,
  ListProductMachineParametersParams,
} from "@/types/ppc/master"

const defaultFilters: ListProductMachineParametersParams = {
  page: 1,
  pageSize: 10,
}

function ParametersContent() {
  const [filters, setFilters] = useUrlState<ListProductMachineParametersParams>({
    defaultValues: defaultFilters,
  })

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selected, setSelected] = useState<ProductMachineParameter | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductMachineParameter | null>(null)

  const { data, isLoading, isError, error } = useProductMachineParameters(filters)
  const deleteMutation = useDeleteProductMachineParameter()

  const handleAddNew = () => {
    setSelected(null)
    setIsFormOpen(true)
  }

  const handleEdit = (row: ProductMachineParameter) => {
    setSelected(row)
    setIsFormOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(String(deleteTarget.pmpId))
      setDeleteTarget(null)
    } catch (e) {
      console.error("Failed to delete parameter:", e)
    }
  }

  const totalItems = data?.pagination?.totalItems ?? 0

  return (
    <div>
      <PageHeader
        title="Product Machine Parameters"
        subtitle="Parameter values per product-machine pair"
      >
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Parameter
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Parameter List</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${totalItems} total parameters`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ParametersFilters filters={filters} onFiltersChange={setFilters} />

          {isError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
              {error instanceof Error ? error.message : "Failed to load parameters"}
            </div>
          )}

          <ParametersTable
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

      <ParameterFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} parameter={selected} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Parameter"
        description="Are you sure you want to delete this parameter entry? This action cannot be undone."
        variant="destructive"
        isLoading={deleteMutation.isPending}
        confirmText="Delete"
        onConfirm={handleDelete}
      />
    </div>
  )
}

export default function ParametersPageClient() {
  return (
    <Suspense fallback={null}>
      <ParametersContent />
    </Suspense>
  )
}
