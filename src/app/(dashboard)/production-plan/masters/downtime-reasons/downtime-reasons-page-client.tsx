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
  DowntimeReasonsTable,
  DowntimeReasonsFilters,
  DowntimeReasonFormDialog,
} from "@/components/ppc/downtime-reasons"

import { useDowntimeReasons, useDeleteDowntimeReason } from "@/hooks/ppc/use-masters"
import { useUrlState } from "@/lib/hooks"
import type { DowntimeReasonMaster, ListDowntimeReasonMastersParams } from "@/types/ppc/master"
import { AreaCode, ActiveFilter } from "@/types/ppc/common"

const defaultFilters: ListDowntimeReasonMastersParams = {
  page: 1,
  pageSize: 10,
  search: "",
  area: AreaCode.AREA_CODE_UNSPECIFIED,
  activeFilter: ActiveFilter.ACTIVE_FILTER_UNSPECIFIED,
}

function DowntimeReasonsContent() {
  const [filters, setFilters] = useUrlState<ListDowntimeReasonMastersParams>({
    defaultValues: defaultFilters,
  })

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selected, setSelected] = useState<DowntimeReasonMaster | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DowntimeReasonMaster | null>(null)

  const { data, isLoading, isError, error } = useDowntimeReasons(filters)
  const deleteMutation = useDeleteDowntimeReason()

  const handleAddNew = () => {
    setSelected(null)
    setIsFormOpen(true)
  }

  const handleEdit = (row: DowntimeReasonMaster) => {
    setSelected(row)
    setIsFormOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(String(deleteTarget.reasonId))
      setDeleteTarget(null)
    } catch (e) {
      console.error("Failed to delete downtime reason:", e)
    }
  }

  const totalItems = data?.pagination?.totalItems ?? 0

  return (
    <div>
      <PageHeader title="Downtime Reasons" subtitle="Downtime reason codes per production area">
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Reason
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Downtime Reason List</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${totalItems} total downtime reasons`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DowntimeReasonsFilters filters={filters} onFiltersChange={setFilters} />

          {isError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
              {error instanceof Error ? error.message : "Failed to load downtime reasons"}
            </div>
          )}

          <DowntimeReasonsTable
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

      <DowntimeReasonFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} reason={selected} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Downtime Reason"
        description={`Are you sure you want to delete "${deleteTarget?.code}"? This action cannot be undone.`}
        variant="destructive"
        isLoading={deleteMutation.isPending}
        confirmText="Delete"
        onConfirm={handleDelete}
      />
    </div>
  )
}

export default function DowntimeReasonsPageClient() {
  return (
    <Suspense fallback={null}>
      <DowntimeReasonsContent />
    </Suspense>
  )
}
