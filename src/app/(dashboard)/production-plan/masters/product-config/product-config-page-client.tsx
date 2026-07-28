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
  ProductConfigTable,
  ProductConfigFilters,
  ProductConfigFormDialog,
} from "@/components/ppc/product-ppc-config"

import { useProductPPCConfigs, useDeleteProductPPCConfig } from "@/hooks/ppc/use-masters"
import { useUrlState } from "@/lib/hooks"
import type { ProductPPCConfig, ListProductPPCConfigsParams } from "@/types/ppc/master"

const defaultFilters: ListProductPPCConfigsParams = {
  page: 1,
  pageSize: 10,
  search: "",
  commodityWatchOnly: false,
}

function ProductConfigContent() {
  const [filters, setFilters] = useUrlState<ListProductPPCConfigsParams>({
    defaultValues: defaultFilters,
  })

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selected, setSelected] = useState<ProductPPCConfig | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductPPCConfig | null>(null)

  const { data, isLoading, isError, error } = useProductPPCConfigs(filters)
  const deleteMutation = useDeleteProductPPCConfig()

  const handleAddNew = () => {
    setSelected(null)
    setIsFormOpen(true)
  }

  const handleEdit = (config: ProductPPCConfig) => {
    setSelected(config)
    setIsFormOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(String(deleteTarget.configId))
      setDeleteTarget(null)
    } catch (e) {
      console.error("Failed to delete product config:", e)
    }
  }

  const totalItems = data?.pagination?.totalItems ?? 0

  return (
    <div>
      <PageHeader title="Product Config" subtitle="PPC planning configuration per costing product">
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Config
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Product Config List</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${totalItems} total product configs`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProductConfigFilters filters={filters} onFiltersChange={setFilters} />

          {isError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
              {error instanceof Error ? error.message : "Failed to load product configs"}
            </div>
          )}

          <ProductConfigTable
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

      <ProductConfigFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} config={selected} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Product Config"
        description={`Are you sure you want to delete the config for "${deleteTarget?.productCode}"? This action cannot be undone.`}
        variant="destructive"
        isLoading={deleteMutation.isPending}
        confirmText="Delete"
        onConfirm={handleDelete}
      />
    </div>
  )
}

export default function ProductConfigPageClient() {
  return (
    <Suspense fallback={null}>
      <ProductConfigContent />
    </Suspense>
  )
}
