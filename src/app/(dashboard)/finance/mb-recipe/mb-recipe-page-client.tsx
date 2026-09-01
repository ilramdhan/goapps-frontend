"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Plus, Download, Upload, Loader2, FileSpreadsheet } from "lucide-react"

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
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  MbRecipeTable,
  useMbRecipeTableColumns,
  MBRecipeFormDialog,
  MbRecipeBulkToolbar,
  MbRecipeBulkJobProgressDialog,
} from "@/components/finance/mb-recipe"
import { MBHeadImportDialog } from "@/components/finance/mb-head"
import { ColumnVisibilityMenu, DataTablePagination } from "@/components/shared"
import { useMBHeads, useExportMBHeads, useExportMBRecipeFull, mbHeadKeys } from "@/hooks/finance/use-mb-head"
import { useUrlState } from "@/lib/hooks"
import {
  ActiveFilter,
  ACTIVE_FILTER_OPTIONS,
  type ListMBHeadsParams,
  type MBHeadEntryStatus,
  type MBRecipeFullCheckStatusCalc,
} from "@/types/finance/mb-head"

/**
 * The derived check-status choices offered on the FULL export only.
 *
 * ⛔ Deliberately NOT wired into the paginated MB Head list filters (user decision
 * K-26, form A): the list keeps its existing filter set untouched.
 *
 * ⚠ Only "Boughtout", "Approved" and "Waiting" are produced by the backend today.
 * "Current", "Outdated" and "Rejected" are legal per the CHECK constraint but will
 * export ZERO ROWS until the corresponding user gates are decided — they are listed
 * anyway so the option set matches the database contract rather than silently drifting
 * from it. ⛔ Do not remove them to "clean up" an empty result.
 */
const CHECK_STATUS_CALC_EXPORT_OPTIONS: MBRecipeFullCheckStatusCalc[] = [
  "Waiting",
  "Current",
  "Boughtout",
  "Approved",
  "Outdated",
  "Rejected",
]

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
  const exportFullMutation = useExportMBRecipeFull()
  const queryClient = useQueryClient()

  // Bulk MB Head lifecycle regenerate (Super Admin, Phase F) — selection lives here
  // (not inside MbRecipeTable) so both the table's checkboxes and the toolbar/dialog
  // below share the same state. Keyed by mbhId → entryStatus AT SELECTION TIME (not
  // just the id) so the dialog's adaptive per-status orchestration works even after
  // the user paginates away from the page a row was selected on.
  const [selectedIds, setSelectedIds] = useState<Map<string, MBHeadEntryStatus>>(new Map())
  const [bulkProgressOpen, setBulkProgressOpen] = useState(false)

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
                {exportMutation.isPending || exportFullMutation.isPending ? (
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
              {/*
                Audit-only opt-in: includes REJECTED MB Heads in the export. Default
                path above stays byte-identical (no includeRejected param sent, so the
                BFF/backend default excludes rejected documents).
              */}
              <DropdownMenuItem
                onClick={() =>
                  exportMutation.mutate({ activeFilter: filters.activeFilter, includeRejected: true })
                }
                disabled={exportMutation.isPending}
              >
                <Download className="mr-2 h-4 w-4" />
                Export to Excel (Include Rejected — Audit)
              </DropdownMenuItem>
              {/*
                P12 full export: a READ-ONLY report (recipe + composition + MB cost,
                one row per composition line). Kept as a separate action from
                "Export to Excel" above, which is the round-trip IMPORT format (D7)
                and must stay byte-identical.
              */}
              <DropdownMenuItem
                onClick={() => exportFullMutation.mutate({ activeFilter: filters.activeFilter })}
                disabled={exportFullMutation.isPending}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export Full Recipe (with Cost)
              </DropdownMenuItem>
              {/*
                Audit-only opt-in: includes REJECTED MB Heads in the full-recipe export.
                Default path above stays as-is (no includeRejected param sent, so the
                BFF/backend default excludes rejected documents).
              */}
              <DropdownMenuItem
                onClick={() =>
                  exportFullMutation.mutate({ activeFilter: filters.activeFilter, includeRejected: true })
                }
                disabled={exportFullMutation.isPending}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export Full Recipe (Include Rejected — Audit)
              </DropdownMenuItem>
              {/*
                Optional derived-check-status narrowing for the SAME full export. The
                plain item above stays the default path and sends NO checkStatusCalc at
                all, which means ALL rows — the NULL / "Belum dihitung" heads included.
                Picking a status here EXCLUDES those NULL heads, because SQL equality
                never matches NULL.
              */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export Full Recipe by Check Status
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {CHECK_STATUS_CALC_EXPORT_OPTIONS.map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() =>
                        exportFullMutation.mutate({
                          activeFilter: filters.activeFilter,
                          checkStatusCalc: status,
                        })
                      }
                      disabled={exportFullMutation.isPending}
                    >
                      {status}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
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

      <MbRecipeBulkToolbar
        selectedCount={selectedIds.size}
        onConfirm={() => setBulkProgressOpen(true)}
      />

      <MbRecipeTable
        items={items}
        isLoading={isLoading}
        sortBy={filters.sortBy}
        sortOrder={filters.sortOrder as "asc" | "desc" | undefined}
        onSort={handleSort}
        visibility={visibility}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
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

      <MBRecipeFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <MBHeadImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <MbRecipeBulkJobProgressDialog
        open={bulkProgressOpen}
        onOpenChange={setBulkProgressOpen}
        selection={selectedIds}
        onSettled={() => {
          queryClient.invalidateQueries({ queryKey: mbHeadKeys.lists() })
          setSelectedIds(new Map())
        }}
      />
    </div>
  )
}
