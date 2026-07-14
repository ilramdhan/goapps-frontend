"use client"

import { useState } from "react"
import { Plus, Download, Upload, Loader2 } from "lucide-react"

import { PageHeader } from "@/components/common/page-header"
import { DebouncedSearchInput } from "@/components/common/debounced-search-input"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MbRecipeTable, useMbRecipeTableColumns } from "@/components/finance/mb-recipe"
import { MBHeadFormDialog, MBHeadImportDialog } from "@/components/finance/mb-head"
import { ColumnVisibilityMenu, DataTablePagination } from "@/components/shared"
import { useMBHeads, useExportMBHeads } from "@/hooks/finance/use-mb-head"
import { useUrlState } from "@/lib/hooks"
import { ActiveFilter, ACTIVE_FILTER_OPTIONS, type ListMBHeadsParams } from "@/types/finance/mb-head"

const defaultFilters: ListMBHeadsParams = {
  search: "",
  activeFilter: ActiveFilter.ACTIVE_FILTER_ACTIVE,
  sortBy: "",
  sortOrder: "",
  page: 1,
  pageSize: 20,
}

export default function MbRecipePageClient() {
  const [filters, setFilters] = useUrlState<ListMBHeadsParams>({ defaultValues: defaultFilters })
  const { data, isLoading } = useMBHeads(filters)
  const { columns, visibility, toggle, setAll, reset } = useMbRecipeTableColumns()
  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const exportMutation = useExportMBHeads()

  function handleSort(sortKey: string) {
    const nextOrder = filters.sortBy === sortKey && filters.sortOrder === "asc" ? "desc" : "asc"
    setFilters({ ...filters, sortBy: sortKey, sortOrder: nextOrder, page: 1 })
  }

  const items = data?.data ?? []
  const pagination = data?.pagination
  const totalItems = Number(pagination?.totalItems ?? 0)

  return (
    <div className="space-y-6">
      <PageHeader title="MB Recipe" subtitle="Manage MB batch cost recipes — composition, parameters, and approval workflow.">
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                {exportMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Export/Import
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => exportMutation.mutate({ activeFilter: filters.activeFilter })}
                disabled={exportMutation.isPending}
              >
                <Download className="mr-2 h-4 w-4" />
                Export to Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Import from Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New MB Recipe
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_170px_auto] lg:items-center">
        <DebouncedSearchInput
          value={filters.search || ""}
          onValueChange={(search) => setFilters({ ...filters, search, page: 1 })}
          placeholder="Search by dev code, shade code, or shade name…"
          containerClassName="min-w-0"
          className="h-9"
        />
        <Select
          value={String(filters.activeFilter ?? ActiveFilter.ACTIVE_FILTER_ACTIVE)}
          onValueChange={(v) => setFilters({ ...filters, activeFilter: Number(v) as ActiveFilter, page: 1 })}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTIVE_FILTER_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
            ))}
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

      <MbRecipeTable
        items={items}
        isLoading={isLoading}
        sortBy={filters.sortBy}
        sortOrder={filters.sortOrder as "asc" | "desc" | undefined}
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

      <MBHeadFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <MBHeadImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}
