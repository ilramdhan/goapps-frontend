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

import {
  MachineGroupsTable,
  MachineGroupsFilters,
  MachineGroupFormDialog,
} from "@/components/ppc/machine-groups"
import { ConfirmDialog } from "@/components/shared"
import { DataTablePagination } from "@/components/shared"

import { useMachineGroups, useDeleteMachineGroup } from "@/hooks/ppc/use-masters"
import { useUrlState } from "@/lib/hooks"
import type { MachineGroup, ListMachineGroupsParams } from "@/types/ppc/master"
import { AreaCode } from "@/types/ppc/common"

const defaultFilters: ListMachineGroupsParams = {
  page: 1,
  pageSize: 10,
  search: "",
  area: AreaCode.AREA_CODE_UNSPECIFIED,
}

function MachineGroupsContent() {
  const [filters, setFilters] = useUrlState<ListMachineGroupsParams>({
    defaultValues: defaultFilters,
  })

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selected, setSelected] = useState<MachineGroup | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MachineGroup | null>(null)

  const { data, isLoading, isError, error } = useMachineGroups(filters)
  const deleteMutation = useDeleteMachineGroup()

  const handleAddNew = () => {
    setSelected(null)
    setIsFormOpen(true)
  }

  const handleEdit = (group: MachineGroup) => {
    setSelected(group)
    setIsFormOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(String(deleteTarget.groupId))
      setDeleteTarget(null)
    } catch (e) {
      console.error("Failed to delete machine group:", e)
    }
  }

  const totalItems = data?.pagination?.totalItems ?? 0

  return (
    <div>
      <PageHeader title="Machine Groups" subtitle="Manage machine groups per production area">
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Group
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Machine Group List</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${totalItems} total machine groups`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <MachineGroupsFilters filters={filters} onFiltersChange={setFilters} />

          {isError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
              {error instanceof Error ? error.message : "Failed to load machine groups"}
            </div>
          )}

          <MachineGroupsTable
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

      <MachineGroupFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} group={selected} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Machine Group"
        description={`Are you sure you want to delete "${deleteTarget?.groupName}"? This action cannot be undone.`}
        variant="destructive"
        isLoading={deleteMutation.isPending}
        confirmText="Delete"
        onConfirm={handleDelete}
      />
    </div>
  )
}

export default function MachineGroupsPageClient() {
  return (
    <Suspense fallback={null}>
      <MachineGroupsContent />
    </Suspense>
  )
}
