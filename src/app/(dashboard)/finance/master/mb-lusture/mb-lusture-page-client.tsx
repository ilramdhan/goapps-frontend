"use client"

import { Plus, Download, Upload, Loader2 } from "lucide-react"
import { useState } from "react"

import { PageHeader } from "@/components/common/page-header"
import { DebouncedSearchInput } from "@/components/common/debounced-search-input"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ColumnVisibilityMenu, DataTablePagination } from "@/components/shared"
import { ConfirmDialog } from "@/components/shared/confirm-dialog/confirm-dialog"
import {
  MbLustureFormDialog,
  MbLustureImportDialog,
  MbLustureTable,
  useMbLustureTableColumns,
} from "@/components/finance/mb-lusture"
import { useMbLustures, useDeleteMbLusture, useExportMbLustures } from "@/hooks/finance/use-mb-lusture"
import { useUrlState } from "@/lib/hooks"
import { ActiveFilter, ACTIVE_FILTER_OPTIONS, type ListMbLustureParams, type MbLusture } from "@/types/finance/mb-lusture"

const defaultFilters: ListMbLustureParams = {
  search: "",
  activeFilter: ActiveFilter.ACTIVE_FILTER_ACTIVE,
  sortBy: "",
  sortDir: "",
  page: 1,
  pageSize: 20,
}

export default function MbLusturePageClient() {
  const [filters, setFilters] = useUrlState<ListMbLustureParams>({ defaultValues: defaultFilters })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<MbLusture | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MbLusture | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const { data, isLoading } = useMbLustures(filters)
  const { columns, visibility, toggle, setAll, reset } = useMbLustureTableColumns()
  const deleteMutation = useDeleteMbLusture()
  const exportMutation = useExportMbLustures()
  const items = data?.items ?? []
  const totalItems = Number(data?.totalItems ?? 0)

  function handleSort(sortKey: string) {
    const nextDir = filters.sortBy === sortKey && filters.sortDir === "asc" ? "desc" : "asc"
    setFilters({ ...filters, sortBy: sortKey, sortDir: nextDir, page: 1 })
  }

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }
  function openEdit(l: MbLusture) {
    setEditing(l)
    setFormOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="MB Lusture" subtitle="Master lookup for MB Recipe lusture code/name.">
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

          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Lusture
          </Button>
        </div>
      </PageHeader>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_170px_auto] lg:items-center">
            <DebouncedSearchInput
              value={filters.search || ""}
              onValueChange={(search) => setFilters({ ...filters, search, page: 1 })}
              placeholder="Search by code or name…"
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

          <MbLustureTable
            items={items}
            isLoading={isLoading}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
            sortBy={filters.sortBy}
            sortOrder={filters.sortDir as "asc" | "desc" | undefined}
            onSort={handleSort}
            visibility={visibility}
          />

          {totalItems > 0 && (
            <DataTablePagination
              currentPage={Number(data?.currentPage ?? 1)}
              pageSize={Number(data?.pageSize ?? 20)}
              totalItems={totalItems}
              totalPages={Number(data?.totalPages ?? 0)}
              onPageChange={(page) => setFilters({ ...filters, page })}
              onPageSizeChange={(pageSize) => setFilters({ ...filters, pageSize, page: 1 })}
            />
          )}
        </CardContent>
      </Card>

      <MbLustureFormDialog open={formOpen} onOpenChange={setFormOpen} mbLusture={editing} />
      <MbLustureImportDialog open={importOpen} onOpenChange={setImportOpen} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete MB Lusture"
        description={`"${deleteTarget?.displayName}" will be permanently deleted.`}
        variant="destructive"
        confirmText="Delete"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.mblId, { onSuccess: () => setDeleteTarget(null) })
          }
        }}
      />
    </div>
  )
}
