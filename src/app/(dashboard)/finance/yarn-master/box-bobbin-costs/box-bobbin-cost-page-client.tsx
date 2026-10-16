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
  BoxBobbinCostFilters,
  BoxBobbinCostTable,
  BoxBobbinCostFormDialog,
  BoxBobbinCostDeleteDialog,
  BoxBobbinCostImportDialog,
} from "@/components/finance/box-bobbin-cost"

import { useBoxBobbinCosts, useExportBoxBobbinCosts } from "@/hooks/finance/use-box-bobbin-cost"
import { useLookupSyncAfterSave } from "@/hooks/finance/use-lookup-sync-after-save"
import { useUrlState } from "@/lib/hooks"
import { ActiveFilter } from "@/types/finance/box-bobbin-cost"
import type { BoxBobbinCost, ListBoxBobbinCostsParams } from "@/types/finance/box-bobbin-cost"

const defaultFilters: ListBoxBobbinCostsParams = {
  search: "",
  activeFilter: ActiveFilter.ACTIVE_FILTER_UNSPECIFIED,
  page: 1,
  pageSize: 20,
}

function BoxBobbinCostPageContent() {
  const [filters, setFilters] = useUrlState<ListBoxBobbinCostsParams>({ defaultValues: defaultFilters })
  const { data, isLoading } = useBoxBobbinCosts(filters)
  const exportMutation = useExportBoxBobbinCosts()

  const { onSaved: onLookupSaved, notice: lookupSyncNotice } = useLookupSyncAfterSave("BOX_BOBBIN_COST")
  const [selectedItem, setSelectedItem] = useState<BoxBobbinCost | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  function openCreate() {
    setSelectedItem(null)
    setDialogOpen(true)
  }

  function openEdit(item: BoxBobbinCost) {
    setSelectedItem(item)
    setDialogOpen(true)
  }

  function openDelete(item: BoxBobbinCost) {
    setSelectedItem(item)
    setDeleteDialogOpen(true)
  }

  const items = data?.data ?? []
  const pagination = data?.pagination
  const totalItems = Number(pagination?.totalItems || "0")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Box/Bobbin Costs"
        subtitle="Manage box and bobbin cost master data for yarn production."
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
            <Plus className="mr-2 h-4 w-4" /> Add Box/Bobbin Cost
          </Button>
        </div>
      </PageHeader>

      {lookupSyncNotice}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Box/Bobbin Cost List</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${totalItems} total box/bobbin costs`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <BoxBobbinCostFilters filters={filters} onFiltersChange={setFilters} />

          <BoxBobbinCostTable
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

      <BoxBobbinCostFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        boxBobbinCost={selectedItem}
        onSuccess={() => {
          if (selectedItem) onLookupSaved(selectedItem.bbcCode)
        }}
      />

      <BoxBobbinCostDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        boxBobbinCost={selectedItem}
      />

      <BoxBobbinCostImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
      />
    </div>
  )
}

function BoxBobbinCostPageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Box/Bobbin Costs"
        subtitle="Manage box and bobbin cost master data for yarn production."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" disabled>
            <Download className="mr-2 h-4 w-4" />
            Export/Import
          </Button>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" /> Add Box/Bobbin Cost
          </Button>
        </div>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Box/Bobbin Cost List</CardTitle>
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

export default function BoxBobbinCostPageClient() {
  return (
    <Suspense fallback={<BoxBobbinCostPageSkeleton />}>
      <BoxBobbinCostPageContent />
    </Suspense>
  )
}
