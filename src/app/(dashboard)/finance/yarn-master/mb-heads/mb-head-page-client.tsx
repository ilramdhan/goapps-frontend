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
  MBHeadTable,
  MBHeadFilters,
  MBHeadFormDialogLegacy,
  MBHeadDeleteDialog,
  MBHeadImportDialog,
} from "@/components/finance/mb-head"

import { useMBHeads, useExportMBHeads } from "@/hooks/finance/use-mb-head"
import { useUrlState } from "@/lib/hooks"
import type { MBHead, ListMBHeadsParams } from "@/types/finance/mb-head"
import { ActiveFilter } from "@/types/finance/mb-head"

const DEFAULT_FILTERS: ListMBHeadsParams = {
  page: 1,
  pageSize: 20,
  search: "",
  activeFilter: ActiveFilter.ACTIVE_FILTER_UNSPECIFIED,
  sortBy: "code",
  sortOrder: "asc",
}

function MBHeadPageContent() {
  const [filters, setFilters] = useUrlState<ListMBHeadsParams>({
    defaultValues: DEFAULT_FILTERS,
  })

  const { data, isLoading } = useMBHeads(filters)
  const exportMutation = useExportMBHeads()

  const [selectedItem, setSelectedItem] = useState<MBHead | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  function openCreate() {
    setSelectedItem(null)
    setDialogOpen(true)
  }

  function openEdit(item: MBHead) {
    setSelectedItem(item)
    setDialogOpen(true)
  }

  function openDelete(item: MBHead) {
    setSelectedItem(item)
    setDeleteDialogOpen(true)
  }

  const items = data?.data ?? []
  const pagination = data?.pagination
  const totalItems = Number(pagination?.totalItems || "0")

  return (
    <div className="space-y-6">
      <PageHeader
        title="MB Heads"
        subtitle="Manage MB head master data for yarn manufacturing."
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
              <DropdownMenuItem onClick={() => setImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Import from Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add MB Head
          </Button>
        </div>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">MB Head List</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${totalItems} total MB heads`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <MBHeadFilters filters={filters} onFiltersChange={setFilters} />

          <MBHeadTable
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

      <MBHeadFormDialogLegacy
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mbHead={selectedItem}
      />

      <MBHeadDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        mbHead={selectedItem}
        onSuccess={() => setDeleteDialogOpen(false)}
      />

      <MBHeadImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
      />
    </div>
  )
}

function MBHeadPageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="MB Heads"
        subtitle="Manage MB head master data for yarn manufacturing."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" disabled>
            <Download className="mr-2 h-4 w-4" />
            Export/Import
          </Button>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" />
            Add MB Head
          </Button>
        </div>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">MB Head List</CardTitle>
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

export default function MBHeadPageClient() {
  return (
    <Suspense fallback={<MBHeadPageSkeleton />}>
      <MBHeadPageContent />
    </Suspense>
  )
}
