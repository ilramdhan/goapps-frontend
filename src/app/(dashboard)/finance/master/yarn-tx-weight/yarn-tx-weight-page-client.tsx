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
import { YarnTxWeightFormDialog, YarnTxWeightTable } from "@/components/finance/yarn-tx-weight"
import { useCostProductTypes } from "@/hooks/finance/use-cost-product-type"
import { useYarnTxWeights, useDeleteYarnTxWeight } from "@/hooks/finance/use-yarn-tx-weight"
import { useUrlState } from "@/lib/hooks"
import { usePermissionContext } from "@/providers/permission-provider"
import {
  TX_WEIGHT_GRADES,
  type ListYarnTxWeightParams,
  type TxWeightGradeCode,
  type YarnTxWeightRow,
} from "@/types/finance/yarn-tx-weight"

const ALL = "all"

const defaultFilters: ListYarnTxWeightParams = {
  search: "",
  productTypeId: 0,
  grade: "",
  sortBy: "product_type",
  sortOrder: "asc",
  page: 1,
  pageSize: 100,
}

function YarnTxWeightPageContent() {
  const { hasPermission } = usePermissionContext()
  const canCreate = hasPermission("finance.master.yarntxweight.create")
  const canUpdate = hasPermission("finance.master.yarntxweight.update")
  const canDelete = hasPermission("finance.master.yarntxweight.delete")

  const [filters, setFilters] = useUrlState<ListYarnTxWeightParams>({ defaultValues: defaultFilters })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<YarnTxWeightRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<YarnTxWeightRow | null>(null)

  const { data, isLoading } = useYarnTxWeights(filters)
  const { data: productTypesData } = useCostProductTypes({
    activeFilter: "all",
    sortBy: "type_code",
    sortOrder: "asc",
    page: 1,
    pageSize: 100,
  })
  const productTypes = productTypesData?.items ?? []
  const deleteMutation = useDeleteYarnTxWeight()
  const items = data?.items ?? []
  const totalItems = Number(data?.totalItems ?? 0)
  const totalPages = Number(data?.totalPages ?? 0)

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }
  function openEdit(row: YarnTxWeightRow) {
    setEditing(row)
    setFormOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yarn TX Weight"
        subtitle="Grade weight rules (AE/A9/A/B/C) per product type. Product types without a rule use the ratio fallback AX_WT × grade% ÷ AX%."
      >
        {canCreate && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Rule
          </Button>
        )}
      </PageHeader>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_220px_140px] lg:items-center">
            <DebouncedSearchInput
              value={filters.search || ""}
              onValueChange={(search) => setFilters({ ...filters, search, page: 1 })}
              placeholder="Search by product type or description…"
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
            <Select
              value={filters.grade || ALL}
              onValueChange={(v) =>
                setFilters({ ...filters, grade: v === ALL ? "" : (v as TxWeightGradeCode), page: 1 })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Grades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Grades</SelectItem>
                {TX_WEIGHT_GRADES.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <YarnTxWeightTable
            items={items}
            isLoading={isLoading}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
          />

          {totalPages > 1 && (
            <DataTablePagination
              currentPage={Number(data?.currentPage ?? 1)}
              pageSize={Number(data?.pageSize ?? 100)}
              totalItems={totalItems}
              totalPages={totalPages}
              onPageChange={(page) => setFilters({ ...filters, page })}
              onPageSizeChange={(pageSize) => setFilters({ ...filters, pageSize, page: 1 })}
            />
          )}
        </CardContent>
      </Card>

      <YarnTxWeightFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        txWeight={editing}
        defaultProductTypeId={filters.productTypeId || undefined}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete TX Weight Rule"
        description={`Rule "${deleteTarget?.productTypeCode} · ${deleteTarget?.grade}" will be deleted. That grade will fall back to the ratio formula on the next calculation.`}
        variant="destructive"
        confirmText="Delete"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
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
