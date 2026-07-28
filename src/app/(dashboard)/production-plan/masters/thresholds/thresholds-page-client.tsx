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
  ThresholdsTable,
  ThresholdsFilters,
  ThresholdFormDialog,
} from "@/components/ppc/overrun-threshold"

import { useOverrunThresholds, useDeleteOverrunThreshold } from "@/hooks/ppc/use-masters"
import { useUrlState } from "@/lib/hooks"
import type { OverrunThresholdConfig, ListOverrunThresholdConfigsParams } from "@/types/ppc/master"
import { ThresholdLevel, ActiveFilter } from "@/types/ppc/common"

const defaultFilters: ListOverrunThresholdConfigsParams = {
  page: 1,
  pageSize: 10,
  level: ThresholdLevel.THRESHOLD_LEVEL_UNSPECIFIED,
  activeFilter: ActiveFilter.ACTIVE_FILTER_UNSPECIFIED,
}

function ThresholdsContent() {
  const [filters, setFilters] = useUrlState<ListOverrunThresholdConfigsParams>({
    defaultValues: defaultFilters,
  })

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selected, setSelected] = useState<OverrunThresholdConfig | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OverrunThresholdConfig | null>(null)

  const { data, isLoading, isError, error } = useOverrunThresholds(filters)
  const deleteMutation = useDeleteOverrunThreshold()

  const handleAddNew = () => {
    setSelected(null)
    setIsFormOpen(true)
  }

  const handleEdit = (row: OverrunThresholdConfig) => {
    setSelected(row)
    setIsFormOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(String(deleteTarget.thresholdId))
      setDeleteTarget(null)
    } catch (e) {
      console.error("Failed to delete threshold:", e)
    }
  }

  const totalItems = data?.pagination?.totalItems ?? 0

  return (
    <div>
      <PageHeader title="Overrun Thresholds" subtitle="Warning and block thresholds by scope level">
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Threshold
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Threshold List</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${totalItems} total thresholds`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ThresholdsFilters filters={filters} onFiltersChange={setFilters} />

          {isError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
              {error instanceof Error ? error.message : "Failed to load thresholds"}
            </div>
          )}

          <ThresholdsTable
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

      <ThresholdFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} threshold={selected} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Threshold"
        description="Are you sure you want to delete this threshold config? This action cannot be undone."
        variant="destructive"
        isLoading={deleteMutation.isPending}
        confirmText="Delete"
        onConfirm={handleDelete}
      />
    </div>
  )
}

export default function ThresholdsPageClient() {
  return (
    <Suspense fallback={null}>
      <ThresholdsContent />
    </Suspense>
  )
}
