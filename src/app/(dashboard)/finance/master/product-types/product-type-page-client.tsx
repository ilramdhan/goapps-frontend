"use client"

import { Plus } from "lucide-react"
import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { PageHeader } from "@/components/common/page-header"
import { DebouncedSearchInput } from "@/components/common/debounced-search-input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataTablePagination } from "@/components/shared"
import {
  OilConfigDialog,
  ProductTypeFormDialog,
  ProductTypeTable,
} from "@/components/finance/cost-product-type"
import { ImportExportToolbar } from "@/components/finance/costing/import-export-toolbar"
import { useCostProductTypes, costProductTypeKeys } from "@/hooks/finance/use-cost-product-type"
import { useUrlState } from "@/lib/hooks"
import type { CostProductType, ListCostProductTypesParams } from "@/types/finance/cost-product-type"

const defaultFilters: ListCostProductTypesParams = {
  search: "",
  activeFilter: "",
  page: 1,
  pageSize: 20,
}

export default function ProductTypePageClient() {
  const [filters, setFilters] = useUrlState<ListCostProductTypesParams>({ defaultValues: defaultFilters })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CostProductType | null>(null)
  const [oilConfigOpen, setOilConfigOpen] = useState(false)
  const [oilConfigTarget, setOilConfigTarget] = useState<CostProductType | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useCostProductTypes(filters)
  const items = data?.items ?? []
  const pagination = data?.pagination
  const totalItems = Number(pagination?.totalItems ?? 0)

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }
  function openEdit(t: CostProductType) {
    setEditing(t)
    setFormOpen(true)
  }
  function openOilConfig(t: CostProductType) {
    setOilConfigTarget(t)
    setOilConfigOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Types"
        subtitle="Master lookup driving the auto-generated product code prefix (CST + type + YYMM + seq)."
      >
        <ImportExportToolbar
          entity="product_type"
          onImportSuccess={() =>
            queryClient.invalidateQueries({ queryKey: costProductTypeKeys.all })
          }
        />
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> New type
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DebouncedSearchInput
          value={filters.search || ""}
          onValueChange={(search) => setFilters({ ...filters, search, page: 1 })}
          placeholder="Search by code or name…"
        />
        <Select
          value={filters.activeFilter || "all"}
          onValueChange={(v) =>
            setFilters({
              ...filters,
              activeFilter: v === "all" ? "" : (v as "active" | "inactive"),
              page: 1,
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active only</SelectItem>
            <SelectItem value="inactive">Inactive only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ProductTypeTable items={items} isLoading={isLoading} onEdit={openEdit} onOilConfig={openOilConfig} />

      {totalItems > 0 && (
        <DataTablePagination
          currentPage={Number(pagination?.currentPage ?? 1)}
          pageSize={Number(pagination?.pageSize ?? 20)}
          totalItems={totalItems}
          totalPages={Number(pagination?.totalPages ?? 0)}
          onPageChange={(page) => setFilters({ ...filters, page })}
          onPageSizeChange={(pageSize) => setFilters({ ...filters, pageSize, page: 1 })}
        />
      )}

      <ProductTypeFormDialog open={formOpen} onOpenChange={setFormOpen} productType={editing} />
      <OilConfigDialog open={oilConfigOpen} onOpenChange={setOilConfigOpen} productType={oilConfigTarget} />
    </div>
  )
}
