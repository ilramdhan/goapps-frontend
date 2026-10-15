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
  ProductGradeTable,
  ProductGradeFilters,
  ProductGradeFormDialog,
  ProductGradeDeleteDialog,
  ProductGradeImportDialog,
} from "@/components/finance/product-grade"

import {
  useProductGrades,
  useExportProductGrades,
} from "@/hooks/finance/use-product-grade"
import { useLookupSyncAfterSave } from "@/hooks/finance/use-lookup-sync-after-save"
import { useUrlState } from "@/lib/hooks"
import type { ProductGrade, ListProductGradesParams } from "@/types/finance/product-grade"
import { ActiveFilter } from "@/types/finance/product-grade"

const defaultFilters: ListProductGradesParams = {
  search: "",
  activeFilter: ActiveFilter.ACTIVE_FILTER_UNSPECIFIED,
  page: 1,
  pageSize: 20,
  sortBy: "code",
  sortOrder: "asc",
}

function ProductGradePageContent() {
  const [filters, setFilters] = useUrlState<ListProductGradesParams>({ defaultValues: defaultFilters })
  const { data, isLoading } = useProductGrades(filters)
  const exportMutation = useExportProductGrades()

  const { onSaved: onLookupSaved, notice: lookupSyncNotice } = useLookupSyncAfterSave("PRODUCT_GRADE")
  const [selectedItem, setSelectedItem] = useState<ProductGrade | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  function openCreate() {
    setSelectedItem(null)
    setFormOpen(true)
  }

  function openEdit(item: ProductGrade) {
    setSelectedItem(item)
    setFormOpen(true)
  }

  function openDelete(item: ProductGrade) {
    setSelectedItem(item)
    setDeleteDialogOpen(true)
  }

  const items = data?.data ?? []
  const pagination = data?.pagination
  const totalItems = Number(pagination?.totalItems || "0")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Grades"
        subtitle="Manage product grade classifications for yarn master data."
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
            <Plus className="mr-2 h-4 w-4" /> Add Grade
          </Button>
        </div>
      </PageHeader>

      {lookupSyncNotice}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Product Grades</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${totalItems} total product grades`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProductGradeFilters filters={filters} onFiltersChange={setFilters} />

          <ProductGradeTable
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

      <ProductGradeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        productGrade={selectedItem}
        onSuccess={() => {
          if (selectedItem) onLookupSaved(selectedItem.pgCode)
        }}
      />

      <ProductGradeDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        productGrade={selectedItem}
      />

      <ProductGradeImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
      />
    </div>
  )
}

function ProductGradePageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Grades"
        subtitle="Manage product grade classifications for yarn master data."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" disabled>
            <Download className="mr-2 h-4 w-4" />
            Export/Import
          </Button>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" /> Add Grade
          </Button>
        </div>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Product Grades</CardTitle>
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

export default function ProductGradePageClient() {
  return (
    <Suspense fallback={<ProductGradePageSkeleton />}>
      <ProductGradePageContent />
    </Suspense>
  )
}
