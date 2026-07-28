"use client"

import { useState, Suspense } from "react"
import { Loader2, Plus, RefreshCw } from "lucide-react"

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

import { LotsTable, LotsFilters, LotFormDialog } from "@/components/ppc/lots"

import { useLotMasters, useDeleteLotMaster, useSyncLots } from "@/hooks/ppc/use-lot"
import { useUrlState } from "@/lib/hooks"
import type { LotMaster, ListLotMastersParams } from "@/types/ppc/master"

const defaultFilters: ListLotMastersParams = {
  page: 1,
  pageSize: 10,
  search: "",
  itemCode: "",
  shadeCode: "",
  source: "",
  prodType: "",
}

function LotsContent() {
  const [filters, setFilters] = useUrlState<ListLotMastersParams>({
    defaultValues: defaultFilters,
  })

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selected, setSelected] = useState<LotMaster | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LotMaster | null>(null)

  const { data, isLoading, isError, error } = useLotMasters(filters)
  const deleteMutation = useDeleteLotMaster()
  const syncMutation = useSyncLots()

  const handleAddNew = () => {
    setSelected(null)
    setIsFormOpen(true)
  }

  const handleEdit = (lot: LotMaster) => {
    setSelected(lot)
    setIsFormOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.lotNo)
      setDeleteTarget(null)
    } catch (e) {
      console.error("Failed to delete lot:", e)
    }
  }

  const totalItems = data?.pagination?.totalItems ?? 0

  return (
    <div>
      <PageHeader
        title="Lots"
        subtitle="Lot master (imported from Oracle MMSMERGE) plus hand-added lots"
      >
        <Button
          variant="outline"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
        >
          {syncMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Sync from Oracle
        </Button>
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Lot
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Lot List</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${totalItems} total lots`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LotsFilters filters={filters} onFiltersChange={setFilters} />

          {isError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
              {error instanceof Error ? error.message : "Failed to load lots"}
            </div>
          )}

          <LotsTable
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

      <LotFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} lot={selected} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Lot"
        description={`Are you sure you want to delete lot "${deleteTarget?.lotNo}"? This action cannot be undone.`}
        variant="destructive"
        isLoading={deleteMutation.isPending}
        confirmText="Delete"
        onConfirm={handleDelete}
      />
    </div>
  )
}

export default function LotsPageClient() {
  return (
    <Suspense fallback={null}>
      <LotsContent />
    </Suspense>
  )
}
