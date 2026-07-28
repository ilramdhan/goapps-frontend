"use client"

import { useState, Suspense } from "react"
import { RefreshCw, Loader2, Plus, Download, Upload } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/common"
import { DataTablePagination } from "@/components/shared"

import {
  CustomersTable,
  CustomersFilters,
  CustomerFormDialog,
  CustomerImportDialog,
} from "@/components/ppc/customers"

import {
  useCustomers,
  useSyncCustomers,
  useExportCustomers,
} from "@/hooks/ppc/use-customer"
import { useUrlState } from "@/lib/hooks"
import type { Customer, ListCustomersParams } from "@/types/ppc/customer"
import { ActiveFilter } from "@/types/ppc/common"

const defaultFilters: ListCustomersParams = {
  page: 1,
  pageSize: 10,
  search: "",
  activeFilter: ActiveFilter.ACTIVE_FILTER_UNSPECIFIED,
  customerSource: "",
}

function CustomersContent() {
  const [filters, setFilters] = useUrlState<ListCustomersParams>({
    defaultValues: defaultFilters,
  })

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [selected, setSelected] = useState<Customer | null>(null)

  const { data, isLoading, isError, error } = useCustomers(filters)
  const syncMutation = useSyncCustomers()
  const exportMutation = useExportCustomers()

  const handleCreate = () => {
    setSelected(null)
    setIsFormOpen(true)
  }

  const handleEdit = (customer: Customer) => {
    setSelected(customer)
    setIsFormOpen(true)
  }

  const handleExport = () => {
    exportMutation.mutate({
      search: filters.search,
      activeFilter: filters.activeFilter,
      customerSource: filters.customerSource,
    })
  }

  const totalItems = data?.pagination?.totalItems ?? 0

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Customer master (synced from Orion) plus hand-added customers"
      >
        <Button variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
          {syncMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Sync from Orion
        </Button>
        <Button variant="outline" onClick={handleExport} disabled={exportMutation.isPending}>
          {exportMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export
        </Button>
        <Button variant="outline" onClick={() => setIsImportOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Import
        </Button>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Customer List</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${totalItems} total customers`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CustomersFilters filters={filters} onFiltersChange={setFilters} />

          {isError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
              {error instanceof Error ? error.message : "Failed to load customers"}
            </div>
          )}

          <CustomersTable data={data?.data || []} isLoading={isLoading} onEdit={handleEdit} />

          {totalItems > 0 && (
            <DataTablePagination
              currentPage={data?.pagination?.currentPage ?? 1}
              pageSize={data?.pagination?.pageSize ?? 10}
              totalItems={totalItems}
              totalPages={data?.pagination?.totalPages ?? 0}
              onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
              onPageSizeChange={(pageSize) => setFilters((prev) => ({ ...prev, pageSize, page: 1 }))}
            />
          )}
        </CardContent>
      </Card>

      <CustomerFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} customer={selected} />
      <CustomerImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
    </div>
  )
}

export default function CustomersPageClient() {
  return (
    <Suspense fallback={null}>
      <CustomersContent />
    </Suspense>
  )
}
