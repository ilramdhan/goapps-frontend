"use client"

import { useState, Suspense } from "react"
import { Plus, RefreshCw, Loader2 } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/common/page-header"
import { DataTablePagination } from "@/components/shared"
import { usePermissionContext } from "@/providers/permission-provider"

import {
  ShadeTable,
  ShadeFilters,
  ShadeFormDialog,
  ShadeDetailDialog,
} from "@/components/finance/shade"

import { useShades, useSyncShades } from "@/hooks/finance/use-shade"
import { useUrlState } from "@/lib/hooks"
import { type Shade, type ListShadesParams, ActiveFilter } from "@/types/finance/shade"

const defaultFilters: ListShadesParams = {
  page: 1,
  pageSize: 10,
  search: "",
  activeFilter: ActiveFilter.ACTIVE_FILTER_UNSPECIFIED,
  sourceFilter: "",
  sortBy: "code",
  sortOrder: "asc",
}

function ShadesPageContent() {
  const { hasPermission } = usePermissionContext()
  const canCreate = hasPermission("finance.master.shade.create")
  const canSync = hasPermission("finance.master.shade.sync")

  const [filters, setFilters] = useUrlState<ListShadesParams>({
    defaultValues: defaultFilters,
  })

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedShade, setSelectedShade] = useState<Shade | null>(null)

  const { data, isLoading, isError, error } = useShades(filters)
  const syncMutation = useSyncShades()

  const handleAddNew = () => {
    setSelectedShade(null)
    setIsFormOpen(true)
  }

  const handleView = (shade: Shade) => {
    setSelectedShade(shade)
    setIsDetailOpen(true)
  }

  const handleEditFromDetail = (shade: Shade) => {
    setIsDetailOpen(false)
    setSelectedShade(shade)
    setIsFormOpen(true)
  }

  const totalItems = data?.pagination?.totalItems ?? 0

  return (
    <div className="space-y-6">
      <PageHeader title="Shade Master" subtitle="Shade master synced from Oracle, plus manually-authored entries">
        {canSync && (
          <Button variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
            {syncMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sync from Oracle
          </Button>
        )}
        {canCreate && (
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add Shade
          </Button>
        )}
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Shade List</CardTitle>
          <CardDescription>{isLoading ? "Loading..." : `${totalItems} total shades`}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ShadeFilters filters={filters} onFiltersChange={setFilters} />

          {isError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
              {error instanceof Error ? error.message : "Failed to load shades"}
            </div>
          )}

          <ShadeTable data={data?.data || []} isLoading={isLoading} onView={handleView} />

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

      <ShadeFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} shade={selectedShade} />

      <ShadeDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        shade={selectedShade}
        onEdit={handleEditFromDetail}
      />
    </div>
  )
}

function ShadesPageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeader title="Shade Master" subtitle="Shade master synced from Oracle, plus manually-authored entries">
        <Button variant="outline" disabled>
          <RefreshCw className="mr-2 h-4 w-4" />
          Sync from Oracle
        </Button>
        <Button disabled>
          <Plus className="mr-2 h-4 w-4" />
          Add Shade
        </Button>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Shade List</CardTitle>
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

export default function ShadesPageClient() {
  return (
    <Suspense fallback={<ShadesPageSkeleton />}>
      <ShadesPageContent />
    </Suspense>
  )
}
