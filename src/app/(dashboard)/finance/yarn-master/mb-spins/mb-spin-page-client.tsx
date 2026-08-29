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
  MBSpinDeleteDialog,
  MBSpinDuplicateDialog,
  MBSpinFilters,
  MBSpinFormDialog,
  MBSpinTable,
  MBSpinImportDialog,
} from "@/components/finance/mb-spin"

import { useMBSpins, useExportMBSpins } from "@/hooks/finance/use-mb-spin"
import { useUrlState } from "@/lib/hooks"
import type { MBSpin, ListMBSpinsParams } from "@/types/finance/mb-spin"
import { ActiveFilter } from "@/types/finance/mb-spin"

const defaultFilters: ListMBSpinsParams = {
  search: "",
  activeFilter: ActiveFilter.ACTIVE_FILTER_UNSPECIFIED,
  page: 1,
  pageSize: 20,
  sortBy: "code",
  sortOrder: "asc",
}

function MBSpinPageContent() {
  const [filters, setFilters] = useUrlState<ListMBSpinsParams>({ defaultValues: defaultFilters })
  const { data, isLoading } = useMBSpins(filters)
  const exportMutation = useExportMBSpins()

  const [selectedItem, setSelectedItem] = useState<MBSpin | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  function openCreate() {
    setSelectedItem(null)
    setDialogOpen(true)
  }

  function openEdit(mbSpin: MBSpin) {
    setSelectedItem(mbSpin)
    setDialogOpen(true)
  }

  function openDelete(mbSpin: MBSpin) {
    setSelectedItem(mbSpin)
    setDeleteDialogOpen(true)
  }

  function openDuplicate(mbSpin: MBSpin) {
    setSelectedItem(mbSpin)
    setDuplicateDialogOpen(true)
  }

  const items = data?.data ?? []
  const pagination = data?.pagination
  const totalItems = Number(pagination?.totalItems || "0")

  return (
    <div className="space-y-6">
      <PageHeader
        title="MB Spins"
        subtitle="Manage MB Spin master data."
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
            <Plus className="mr-2 h-4 w-4" /> Add MB Spin
          </Button>
        </div>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">MB Spin List</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${totalItems} total MB spins`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <MBSpinFilters filters={filters} onFiltersChange={setFilters} />
          <MBSpinTable
            data={items}
            isLoading={isLoading}
            onEdit={openEdit}
            onDelete={openDelete}
            onDuplicate={openDuplicate}
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

      <MBSpinFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mbSpin={selectedItem}
      />
      <MBSpinDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        mbSpin={selectedItem}
      />
      <MBSpinDuplicateDialog
        open={duplicateDialogOpen}
        onOpenChange={setDuplicateDialogOpen}
        mbSpin={selectedItem}
      />
      <MBSpinImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
      />
    </div>
  )
}

function MBSpinPageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeader title="MB Spins" subtitle="Manage MB Spin master data.">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" disabled>
            <Download className="mr-2 h-4 w-4" />
            Export/Import
          </Button>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" /> Add MB Spin
          </Button>
        </div>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">MB Spin List</CardTitle>
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

export default function MBSpinPageClient() {
  return (
    <Suspense fallback={<MBSpinPageSkeleton />}>
      <MBSpinPageContent />
    </Suspense>
  )
}
