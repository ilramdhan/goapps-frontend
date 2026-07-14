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
  MbParamFormDialog,
  MbParamOptionFormDialog,
  MbParamImportDialog,
  MbParamTable,
  useMbParamTableColumns,
} from "@/components/finance/mb-param"
import {
  useMbParams,
  useDeleteMbParam,
  useDeleteMbParamOption,
  useExportMbParams,
} from "@/hooks/finance/use-mb-param"
import { useUrlState } from "@/lib/hooks"
import { ActiveFilter, ACTIVE_FILTER_OPTIONS, type ListMbParamsParams, type MbParam, type MbParamOption } from "@/types/finance/mb-param"

const defaultFilters: ListMbParamsParams = {
  search: "",
  activeFilter: ActiveFilter.ACTIVE_FILTER_ACTIVE,
  sortBy: "",
  sortDir: "",
  page: 1,
  pageSize: 20,
}

export default function MbParamPageClient() {
  const [filters, setFilters] = useUrlState<ListMbParamsParams>({ defaultValues: defaultFilters })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<MbParam | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MbParam | null>(null)

  const [optionFormOpen, setOptionFormOpen] = useState(false)
  const [optionParam, setOptionParam] = useState<MbParam | null>(null)
  const [editingOption, setEditingOption] = useState<MbParamOption | null>(null)
  const [deleteOptionTarget, setDeleteOptionTarget] = useState<{ param: MbParam; option: MbParamOption } | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const { data, isLoading } = useMbParams(filters)
  const { columns, visibility, toggle, setAll, reset } = useMbParamTableColumns()
  const deleteMutation = useDeleteMbParam()
  const deleteOptionMutation = useDeleteMbParamOption()
  const exportMutation = useExportMbParams()
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
  function openEdit(p: MbParam) {
    setEditing(p)
    setFormOpen(true)
  }
  function openAddOption(param: MbParam) {
    setOptionParam(param)
    setEditingOption(null)
    setOptionFormOpen(true)
  }
  function openEditOption(param: MbParam, option: MbParamOption) {
    setOptionParam(param)
    setEditingOption(option)
    setOptionFormOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="MB Param" subtitle="Master parameters used in MB Recipe (scalar or picklist).">
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
            <Plus className="mr-2 h-4 w-4" /> Add Parameter
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

          <MbParamTable
            items={items}
            isLoading={isLoading}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
            onAddOption={openAddOption}
            onEditOption={openEditOption}
            onDeleteOption={(param, option) => setDeleteOptionTarget({ param, option })}
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

      <MbParamFormDialog open={formOpen} onOpenChange={setFormOpen} param={editing} />
      <MbParamImportDialog open={importOpen} onOpenChange={setImportOpen} />

      {optionParam && (
        <MbParamOptionFormDialog
          open={optionFormOpen}
          onOpenChange={setOptionFormOpen}
          mbpId={optionParam.mbpId}
          mbpCode={optionParam.code}
          option={editingOption}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Parameter"
        description={`"${deleteTarget?.name}" will be permanently deleted.`}
        variant="destructive"
        confirmText="Delete"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.mbpId, { onSuccess: () => setDeleteTarget(null) })
          }
        }}
      />

      <ConfirmDialog
        open={!!deleteOptionTarget}
        onOpenChange={(open) => !open && setDeleteOptionTarget(null)}
        title="Delete Option"
        description={`"${deleteOptionTarget?.option.code}" will be permanently deleted.`}
        variant="destructive"
        confirmText="Delete"
        isLoading={deleteOptionMutation.isPending}
        onConfirm={() => {
          if (deleteOptionTarget) {
            deleteOptionMutation.mutate(
              { mbpId: deleteOptionTarget.param.mbpId, mbpoId: deleteOptionTarget.option.mbpoId },
              { onSuccess: () => setDeleteOptionTarget(null) }
            )
          }
        }}
      />
    </div>
  )
}
