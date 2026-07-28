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
  WorkOrderTable,
  WorkOrderFilters,
  WorkOrderFormDialog,
} from "@/components/ppc/work-order"

import { useWorkOrders, useDeleteWorkOrder } from "@/hooks/ppc/use-work-order"
import { useUrlState } from "@/lib/hooks"
import type { WorkOrder, ListWorkOrdersParams } from "@/types/ppc/work-order"
import { AreaCode, WOStatus } from "@/types/ppc/common"

const defaultFilters: ListWorkOrdersParams = {
  page: 1,
  pageSize: 10,
  search: "",
  area: AreaCode.AREA_CODE_UNSPECIFIED,
  status: WOStatus.WO_STATUS_UNSPECIFIED,
  lotNo: "",
  sortBy: "wo_no",
  sortOrder: "desc",
}

function WorkOrdersContent() {
  const [filters, setFilters] = useUrlState<ListWorkOrdersParams>({
    defaultValues: defaultFilters,
  })

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selected, setSelected] = useState<WorkOrder | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<WorkOrder | null>(null)

  const { data, isLoading, isError, error } = useWorkOrders(filters)
  const deleteMutation = useDeleteWorkOrder()

  const handleAddNew = () => {
    setSelected(null)
    setIsFormOpen(true)
  }

  const handleEdit = (wo: WorkOrder) => {
    setSelected(wo)
    setIsFormOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(String(deleteTarget.woId))
      setDeleteTarget(null)
    } catch (e) {
      console.error("Failed to delete work order:", e)
    }
  }

  const totalItems = data?.pagination?.totalItems ?? 0

  return (
    <div>
      <PageHeader title="Work Orders" subtitle="Manage production work orders and approvals">
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Create Work Order
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Work Order List</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${totalItems} total work orders`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <WorkOrderFilters filters={filters} onFiltersChange={setFilters} />

          {isError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
              {error instanceof Error ? error.message : "Failed to load work orders"}
            </div>
          )}

          <WorkOrderTable
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

      <WorkOrderFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} workOrder={selected} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Work Order"
        description={`Are you sure you want to delete "${deleteTarget?.woNo}"? This action cannot be undone.`}
        variant="destructive"
        isLoading={deleteMutation.isPending}
        confirmText="Delete"
        onConfirm={handleDelete}
      />
    </div>
  )
}

export default function WorkOrdersPageClient() {
  return (
    <Suspense fallback={null}>
      <WorkOrdersContent />
    </Suspense>
  )
}
