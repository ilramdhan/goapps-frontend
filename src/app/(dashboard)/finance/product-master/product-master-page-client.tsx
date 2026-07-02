"use client"

import { CheckCircle2, ChevronDown, FileSpreadsheet, Package, PauseCircle, Plus, Upload } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { PageHeader } from "@/components/common/page-header"
import { KpiCard, KpiGrid } from "@/components/common"
import { DebouncedSearchInput } from "@/components/common/debounced-search-input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  DeactivateProductMasterDialog,
  ProductDetailDrawer,
  ProductMasterFormDialog,
  ProductMasterTable,
  useProductMasterTableColumns,
} from "@/components/finance/cost-product-master"
import { BulkImportDialog } from "@/components/finance/costing/bulk-import-dialog"
import { ImportDialog } from "@/components/finance/costing/import-dialog"
import { ProductTypeMultiCombobox } from "@/components/finance/comboboxes"
import { ColumnVisibilityMenu, DataTablePagination } from "@/components/shared"
import { useCostProductMasterCounts, useCostProductMasters, costProductMasterKeys } from "@/hooks/finance/use-cost-product-master"
import { useExportData } from "@/hooks/finance/use-cost-import"
import { useUrlState } from "@/lib/hooks"
import { exportBulkProductRouting } from "@/services/finance/cost-import-api"
import type { CostProductMaster, ListCostProductMastersParams } from "@/types/finance/cost-product-master"

const defaultFilters: ListCostProductMastersParams = {
  search: "",
  productTypeIds: [],
  activeFilter: "active",
  // sortBy/sortOrder must be listed here — useUrlState only tracks keys present in defaultValues.
  sortBy: "",
  sortOrder: undefined,
  page: 1,
  pageSize: 20,
}

type FilterKey = keyof ListCostProductMastersParams
type FilterValue = ListCostProductMastersParams[FilterKey]

// Custom URL (de)serialization so productTypeIds appears as CSV (?productTypeIds=1,2,3)
// instead of JSON, and is omitted entirely when empty.
function serializeFilters(key: FilterKey, value: FilterValue): string | undefined {
  if (key === "productTypeIds") {
    return Array.isArray(value) && value.length > 0 ? value.join(",") : undefined
  }
  if (value === undefined || value === null || value === "") return undefined
  return String(value)
}

function deserializeFilters(key: FilterKey, value: string | null, defaultValue: FilterValue): FilterValue {
  if (key === "productTypeIds") {
    if (!value) return defaultValue
    return value
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0)
  }
  if (value === null) return defaultValue
  if (typeof defaultValue === "number") {
    const num = Number(value)
    return Number.isNaN(num) ? defaultValue : num
  }
  return value as FilterValue
}

export default function ProductMasterPageClient() {
  const [filters, setFilters] = useUrlState<ListCostProductMastersParams>({
    defaultValues: defaultFilters,
    serialize: serializeFilters,
    deserialize: deserializeFilters,
  })
  const { data, isLoading } = useCostProductMasters(filters)
  const { data: counts, isLoading: countsLoading } = useCostProductMasterCounts()
  const queryClient = useQueryClient()
  const router = useRouter()

  const { columns, visibility, toggle, setAll, reset } = useProductMasterTableColumns()

  const [formOpen, setFormOpen] = useState(false)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [viewId, setViewId] = useState<number | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [bulkImportOpen, setBulkImportOpen] = useState(false)
  const [paramsImportOpen, setParamsImportOpen] = useState(false)
  // Both bulk menu items open the same unified ETL dialog, differing only by kind.
  const [editing, setEditing] = useState<CostProductMaster | null>(null)
  const [bulkExportLoading, setBulkExportLoading] = useState(false)

  const { exportEntity, loading: exportLoading } = useExportData()

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }
  function openEdit(p: CostProductMaster) {
    setEditing(p)
    setFormOpen(true)
  }
  function openDeactivate(p: CostProductMaster) {
    setEditing(p)
    setDeactivateOpen(true)
  }
  function openView(p: CostProductMaster) {
    setViewId(p.productSysId)
    setViewOpen(true)
  }

  function handleSort(sortKey: string) {
    // asc → desc toggle on the active column; a new column always starts asc.
    const nextOrder = filters.sortBy === sortKey && filters.sortOrder === "asc" ? "desc" : "asc"
    setFilters({ ...filters, sortBy: sortKey, sortOrder: nextOrder, page: 1 })
  }

  function handleExport() {
    void exportEntity("product_master")
  }

  async function handleBulkExport() {
    setBulkExportLoading(true)
    try {
      const isFiltered = !!filters.search || (filters.productTypeIds?.length ?? 0) > 0
      const visibleItems = data?.items ?? []
      const productSysIds = isFiltered ? visibleItems.map((p) => p.productSysId) : undefined
      const result = await exportBulkProductRouting({ productSysIds })
      toast.success(`Export dijadwalkan — Job #${result.jobId}`, {
        description: "File akan tersedia di halaman Import Jobs setelah selesai diproses.",
        action: {
          label: "Lihat Jobs",
          onClick: () => router.push("/finance/import-jobs"),
        },
        duration: 8000,
      })
    } catch (e) {
      toast.error(`Export gagal: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBulkExportLoading(false)
    }
  }

  const items = data?.items ?? []
  const pagination = data?.pagination
  const totalItems = Number(pagination?.totalItems ?? 0)
  const selectedTypeCount = filters.productTypeIds?.length ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Master"
        subtitle="Costing product identity (CPM_). Codes are auto-generated as CST + type + YYMM + 6-digit sequence."
        className="pb-0"
      >
        {/* Import dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" aria-label="Import">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Import</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setImportOpen(true)}>
              Import Produk
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setBulkImportOpen(true)}>
              Import Produk + Routing (Bulk)
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setParamsImportOpen(true)}>
              Import Params Saja (Bulk)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Export dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={exportLoading || bulkExportLoading} aria-label="Export">
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={handleExport}>
              Export Produk
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void handleBulkExport()}>
              Export Produk + Routing
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button onClick={openCreate} aria-label="New product">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New product</span>
        </Button>
      </PageHeader>

      <KpiGrid cols={3}>
        <KpiCard title="Total products" value={counts?.total ?? 0} icon={Package} loading={countsLoading} />
        <KpiCard title="Active" value={counts?.active ?? 0} icon={CheckCircle2} loading={countsLoading} />
        <KpiCard title="Inactive" value={counts?.inactive ?? 0} icon={PauseCircle} loading={countsLoading} />
      </KpiGrid>

      {/* Filter toolbar — equal h-9 controls; the 260px cell hosts the multi-select type combobox. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_260px_170px_auto] lg:items-center">
        <DebouncedSearchInput
          value={filters.search || ""}
          onValueChange={(search) => setFilters({ ...filters, search, page: 1 })}
          placeholder="Search by code, name, or ERP item…"
          containerClassName="min-w-0 sm:col-span-2 lg:col-span-1"
          className="h-9"
        />
        <ProductTypeMultiCombobox
          value={filters.productTypeIds ?? []}
          onChange={(productTypeIds) => setFilters({ ...filters, productTypeIds, page: 1 })}
          placeholder="All product types"
          className="h-9"
        />
        <Select
          value={filters.activeFilter || "active"}
          onValueChange={(v) => setFilters({ ...filters, activeFilter: v as "all" | "active" | "inactive", page: 1 })}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active only</SelectItem>
            <SelectItem value="inactive">Inactive only</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center justify-end">
          <ColumnVisibilityMenu
            columns={columns}
            visibility={visibility}
            onToggle={toggle}
            onSetAll={setAll}
            onReset={reset}
            className="h-9"
          />
        </div>
      </div>

      {selectedTypeCount > 0 ? (
        <div className="text-xs text-muted-foreground">
          Filtering by {selectedTypeCount} {selectedTypeCount === 1 ? "product type" : "product types"}.{" "}
          <button
            type="button"
            className="font-medium underline underline-offset-2 hover:text-foreground"
            onClick={() => setFilters({ ...filters, productTypeIds: [], page: 1 })}
          >
            Clear
          </button>
        </div>
      ) : null}

      <ProductMasterTable
        items={items}
        isLoading={isLoading}
        onEdit={openEdit}
        onDeactivate={openDeactivate}
        onView={openView}
        sortBy={filters.sortBy}
        sortOrder={filters.sortOrder}
        onSort={handleSort}
        visibility={visibility}
      />

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

      <ImportDialog
        entity="product_master"
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={() =>
          queryClient.invalidateQueries({ queryKey: costProductMasterKeys.all })
        }
      />
      <ProductMasterFormDialog open={formOpen} onOpenChange={setFormOpen} product={editing} />
      <DeactivateProductMasterDialog
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        product={editing}
      />
      <BulkImportDialog open={bulkImportOpen} onOpenChange={setBulkImportOpen} kind="product_routing" />
      <BulkImportDialog open={paramsImportOpen} onOpenChange={setParamsImportOpen} kind="params_only" />
      <ProductDetailDrawer productSysId={viewId} open={viewOpen} onOpenChange={setViewOpen} />
    </div>
  )
}
