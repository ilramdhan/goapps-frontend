"use client"

import { Suspense, useState } from "react"
import { Plus, Download, Upload, Loader2 } from "lucide-react"

import { PageHeader } from "@/components/common/page-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTablePagination } from "@/components/shared"
import {
  InterminglingTable,
  InterminglingFilters,
  InterminglingFormDialog,
  InterminglingDeleteDialog,
  InterminglingImportDialog,
} from "@/components/finance/intermingling"

import {
  useInterminglings,
  useExportInterminglings,
} from "@/hooks/finance/use-intermingling"
import { useLookupSyncAfterSave } from "@/hooks/finance/use-lookup-sync-after-save"
import { useUrlState } from "@/lib/hooks"
import type { Intermingling, ListInterminglingsParams } from "@/types/finance/intermingling"
import { ActiveFilter } from "@/types/finance/intermingling"

const DEFAULT_FILTERS: ListInterminglingsParams = {
  page: 1,
  pageSize: 20,
  search: "",
  activeFilter: ActiveFilter.ACTIVE_FILTER_UNSPECIFIED,
  sortBy: "code",
  sortOrder: "asc",
}

function InterminglingPageContent() {
  const [filters, setFilters] = useUrlState<ListInterminglingsParams>({
    defaultValues: DEFAULT_FILTERS,
  })

  const { data, isLoading } = useInterminglings(filters)
  const exportMutation = useExportInterminglings()

  const { onSaved: onLookupSaved, notice: lookupSyncNotice } = useLookupSyncAfterSave("INTERMINGLING")
  const [selectedItem, setSelectedItem] = useState<Intermingling | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  function openCreate() {
    setSelectedItem(null)
    setDialogOpen(true)
  }

  function openEdit(item: Intermingling) {
    setSelectedItem(item)
    setDialogOpen(true)
  }

  function openDelete(item: Intermingling) {
    setSelectedItem(item)
    setDeleteDialogOpen(true)
  }

  const items = data?.data ?? []
  const pagination = data?.pagination
  const totalItems = Number(pagination?.totalItems || "0")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Interminglings"
        subtitle="Manage intermingling master data for yarn manufacturing."
      >
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
            <Plus className="mr-2 h-4 w-4" />
            Add Intermingling
          </Button>
        </div>
      </PageHeader>

      {lookupSyncNotice}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Intermingling List</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${totalItems} total interminglings`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <InterminglingFilters filters={filters} onFiltersChange={setFilters} />

          <InterminglingTable
            data={items}
            isLoading={isLoading}
            onEdit={openEdit}
            onDelete={openDelete}
          />

          <DataTablePagination
            currentPage={Number(pagination?.currentPage ?? 1)}
            pageSize={Number(pagination?.pageSize ?? 20)}
            totalItems={totalItems}
            totalPages={Number(pagination?.totalPages ?? 0)}
            onPageChange={(page) => setFilters({ ...filters, page })}
            onPageSizeChange={(pageSize) => setFilters({ ...filters, pageSize, page: 1 })}
          />
        </CardContent>
      </Card>

      <InterminglingFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        intermingling={selectedItem}
        onSuccess={() => {
          if (selectedItem) onLookupSaved(selectedItem.intmCode)
        }}
      />

      <InterminglingDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        intermingling={selectedItem}
        onSuccess={() => setDeleteDialogOpen(false)}
      />

      <InterminglingImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
      />
    </div>
  )
}

function InterminglingPageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Interminglings"
        subtitle="Manage intermingling master data for yarn manufacturing."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" disabled>
            <Download className="mr-2 h-4 w-4" />
            Export/Import
          </Button>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" />
            Add Intermingling
          </Button>
        </div>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Intermingling List</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function InterminglingPageClient() {
  return (
    <Suspense fallback={<InterminglingPageSkeleton />}>
      <InterminglingPageContent />
    </Suspense>
  )
}
