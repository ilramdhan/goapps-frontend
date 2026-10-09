"use client"

import { useState, Suspense } from "react"
import { Plus, Loader2 } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/common/page-header"
import { DataTablePagination } from "@/components/shared"
import { usePermissionContext } from "@/providers/permission-provider"

import {
  SuperbaCostSpTable,
  SuperbaCostSpFilters,
  SuperbaCostSpFormDialog,
  SuperbaCostSpDeleteDialog,
  SuperbaSyncButton,
} from "@/components/finance/superba-cost-sp"
import { lastSyncLabel } from "@/components/finance/superba-cost-sp/superba-sync-button"

import { useSuperbaCostSps, useSuperbaLastSync } from "@/hooks/finance/use-superba-cost-sp"
import { useUrlState } from "@/lib/hooks"
import {
  type SuperbaCostSp,
  type ListSuperbaCostSpsParams,
  ActiveFilter,
} from "@/types/finance/superba-cost-sp"

const defaultFilters: ListSuperbaCostSpsParams = {
  page: 1,
  pageSize: 10,
  search: "",
  activeFilter: ActiveFilter.ACTIVE_FILTER_UNSPECIFIED,
  sourceFilter: "",
  sortBy: "shade_code",
  sortOrder: "asc",
}

const SUBTITLE = "Per-shade MB cost marketing for SUPERBA products (Old Value is used by costing)"

function PageContent() {
  const { hasPermission } = usePermissionContext()
  const canCreate = hasPermission("finance.master.superbacostsp.create")
  const canSync = hasPermission("finance.master.superbacostsp.sync")

  const [filters, setFilters] = useUrlState<ListSuperbaCostSpsParams>({ defaultValues: defaultFilters })

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<SuperbaCostSp | null>(null)

  const { data, isLoading, isError, error } = useSuperbaCostSps(filters)
  const totalItems = data?.pagination?.totalItems ?? 0
  const { data: lastSyncedAt } = useSuperbaLastSync()

  return (
    <div className="space-y-6">
      <PageHeader title="Superba Cost SP" subtitle={SUBTITLE}>
        {canSync && <SuperbaSyncButton lastSyncedAt={lastSyncedAt} />}
        {canCreate && (
          <Button
            onClick={() => {
              setSelected(null)
              setIsFormOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Row
          </Button>
        )}
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Superba Cost SP List</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${totalItems} total rows`} · {lastSyncLabel(lastSyncedAt)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SuperbaCostSpFilters filters={filters} onFiltersChange={setFilters} />

          {isError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
              {error instanceof Error ? error.message : "Failed to load Superba Cost SP"}
            </div>
          )}

          <SuperbaCostSpTable
            data={data?.data || []}
            isLoading={isLoading}
            onEdit={(row) => {
              setSelected(row)
              setIsFormOpen(true)
            }}
            onDelete={(row) => {
              setSelected(row)
              setIsDeleteOpen(true)
            }}
          />

          {totalItems > 0 && (
            <DataTablePagination
              currentPage={data?.pagination?.currentPage ?? 1}
              pageSize={data?.pagination?.pageSize ?? 10}
              totalItems={Number(totalItems)}
              totalPages={data?.pagination?.totalPages ?? 0}
              onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
              onPageSizeChange={(pageSize) => setFilters((prev) => ({ ...prev, pageSize, page: 1 }))}
            />
          )}
        </CardContent>
      </Card>

      <SuperbaCostSpFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} row={selected} />
      <SuperbaCostSpDeleteDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} row={selected} />
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeader title="Superba Cost SP" subtitle={SUBTITLE} />
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    </div>
  )
}

export default function SuperbaCostSpsPageClient() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent />
    </Suspense>
  )
}
