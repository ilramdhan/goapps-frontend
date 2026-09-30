"use client"

import { Plus } from "lucide-react"
import { Suspense, useState } from "react"

import { PageHeader } from "@/components/common/page-header"
import { DebouncedSearchInput } from "@/components/common/debounced-search-input"
import { TableSkeleton } from "@/components/loading"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { DataTablePagination } from "@/components/shared"
import { ConfirmDialog } from "@/components/shared/confirm-dialog/confirm-dialog"
import { YarnTxWeightFormDialog, YarnTxWeightGroupTable } from "@/components/finance/yarn-tx-weight"
import { useCostProductTypes } from "@/hooks/finance/use-cost-product-type"
import { useYarnTxWeightGroups, useDeleteYarnTxWeightGroup } from "@/hooks/finance/use-yarn-tx-weight"
import { useUrlState } from "@/lib/hooks"
import { usePermissionContext } from "@/providers/permission-provider"
import type { ListYarnTxWeightGroupsParams, YarnTxWeightGroup } from "@/types/finance/yarn-tx-weight"

const ALL = "all"

const defaultFilters: ListYarnTxWeightGroupsParams = {
  search: "",
  productTypeId: 0,
  sortBy: "code",
  sortOrder: "asc",
  page: 1,
  pageSize: 20,
}

function YarnTxWeightPageContent() {
  const { hasPermission } = usePermissionContext()
  const canCreate = hasPermission("finance.master.yarntxweight.create")
  const canUpdate = hasPermission("finance.master.yarntxweight.update")
  const canDelete = hasPermission("finance.master.yarntxweight.delete")

  const [filters, setFilters] = useUrlState<ListYarnTxWeightGroupsParams>({ defaultValues: defaultFilters })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<YarnTxWeightGroup | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<YarnTxWeightGroup | null>(null)

  const { data, isLoading } = useYarnTxWeightGroups(filters)
  const { data: productTypesData } = useCostProductTypes({
    activeFilter: "all",
    sortBy: "type_code",
    sortOrder: "asc",
    page: 1,
    pageSize: 100,
  })
  const productTypes = productTypesData?.items ?? []
  const deleteMutation = useDeleteYarnTxWeightGroup()
  const items = data?.items ?? []
  const totalItems = Number(data?.totalItems ?? 0)
  const totalPages = Number(data?.totalPages ?? 0)

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }
  function openEdit(group: YarnTxWeightGroup) {
    setEditing(group)
    setFormOpen(true)
  }

  const deleteTypes = deleteTarget?.productTypes.map((pt) => pt.code).join(", ")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yarn TX Weight"
        subtitle="Grade weight configs (AE/A9/A/B/C), each shared by one or more product types. Product types without a config use the ratio fallback AX_WT × grade% ÷ AX%."
      >
        {canCreate && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Config
          </Button>
        )}
      </PageHeader>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_240px] sm:items-center">
            <DebouncedSearchInput
              value={filters.search || ""}
              onValueChange={(search) => setFilters({ ...filters, search, page: 1 })}
              placeholder="Search by code, name or product type…"
              containerClassName="min-w-0"
              className="h-9"
            />
            <Select
              value={filters.productTypeId ? String(filters.productTypeId) : ALL}
              onValueChange={(v) =>
                setFilters({ ...filters, productTypeId: v === ALL ? 0 : Number(v), page: 1 })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Product Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Product Types</SelectItem>
                {productTypes.map((pt) => (
                  <SelectItem key={pt.typeId} value={String(pt.typeId)}>
                    {pt.typeCode} — {pt.typeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <YarnTxWeightGroupTable
            items={items}
            isLoading={isLoading}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
          />

          {totalItems > 0 && (
            <DataTablePagination
              currentPage={Number(data?.currentPage ?? filters.page ?? 1)}
              pageSize={Number(data?.pageSize ?? filters.pageSize ?? 20)}
              totalItems={totalItems}
              totalPages={totalPages}
              onPageChange={(page) => setFilters({ ...filters, page })}
              onPageSizeChange={(pageSize) => setFilters({ ...filters, pageSize, page: 1 })}
            />
          )}
        </CardContent>
      </Card>

      <YarnTxWeightFormDialog open={formOpen} onOpenChange={setFormOpen} group={editing} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete TX Weight Config"
        description={`Config "${deleteTarget?.code}" will be deleted.${deleteTypes ? ` Its product types (${deleteTypes}) become unassigned and` : " Its product types"} fall back to the ratio formula on the next calculation.`}
        variant="destructive"
        confirmText="Delete"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.groupId, { onSuccess: () => setDeleteTarget(null) })
          }
        }}
      />
    </div>
  )
}

export default function YarnTxWeightPageClient() {
  return (
    <Suspense fallback={<TableSkeleton rows={6} />}>
      <YarnTxWeightPageContent />
    </Suspense>
  )
}
