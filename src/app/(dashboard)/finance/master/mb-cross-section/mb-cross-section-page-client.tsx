"use client"

import { Plus } from "lucide-react"
import { useState } from "react"

import { PageHeader } from "@/components/common/page-header"
import { DebouncedSearchInput } from "@/components/common/debounced-search-input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ColumnVisibilityMenu, DataTablePagination } from "@/components/shared"
import { ConfirmDialog } from "@/components/shared/confirm-dialog/confirm-dialog"
import {
  MbCrossSectionFormDialog,
  MbCrossSectionFactorFormDialog,
  MbCrossSectionTable,
  MbCrossSectionFactorTable,
  useMbCrossSectionTableColumns,
  useMbCrossSectionFactorTableColumns,
} from "@/components/finance/mb-cross-section"
import {
  useMbCrossSections,
  useDeleteMbCrossSection,
  useMbCrossSectionFactors,
  useDeleteMbCrossSectionFactor,
} from "@/hooks/finance/use-mb-cross-section"
import { useUrlState } from "@/lib/hooks"
import {
  ActiveFilter,
  ACTIVE_FILTER_OPTIONS,
  type ListMbCrossSectionParams,
  type ListMbCrossSectionFactorParams,
  type NormalizedMbCrossSection,
  type NormalizedMbCrossSectionFactor,
} from "@/types/finance/mb-cross-section"

const defaultFilters: ListMbCrossSectionParams = {
  search: "",
  activeFilter: ActiveFilter.ACTIVE_FILTER_ACTIVE,
  sortBy: "",
  sortDir: "",
  page: 1,
  pageSize: 20,
}

function MasterTab() {
  const [filters, setFilters] = useUrlState<ListMbCrossSectionParams>({ defaultValues: defaultFilters })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<NormalizedMbCrossSection | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<NormalizedMbCrossSection | null>(null)

  const { data, isLoading } = useMbCrossSections(filters)
  const { columns, visibility, toggle, setAll, reset } = useMbCrossSectionTableColumns()
  const deleteMutation = useDeleteMbCrossSection()
  const items = data?.items ?? []
  const totalItems = Number(data?.totalItems ?? 0)

  function handleSort(sortKey: string) {
    const nextDir = filters.sortBy === sortKey && filters.sortDir === "asc" ? "desc" : "asc"
    setFilters({ ...filters, sortBy: sortKey, sortDir: nextDir, page: 1 })
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_170px_auto_auto] lg:items-center">
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
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ColumnVisibilityMenu
            columns={columns}
            visibility={visibility}
            onToggle={toggle}
            onSetAll={setAll}
            onReset={reset}
            className="h-9"
          />
          <Button
            className="h-9"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Cross Section
          </Button>
        </div>

        <MbCrossSectionTable
          items={items}
          isLoading={isLoading}
          onEdit={(row) => {
            setEditing(row)
            setFormOpen(true)
          }}
          onDelete={setDeleteTarget}
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

        <MbCrossSectionFormDialog open={formOpen} onOpenChange={setFormOpen} mbCrossSection={editing} />

        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title="Delete MB Cross Section"
          description={`"${deleteTarget?.code}" will be permanently deleted.`}
          variant="destructive"
          confirmText="Delete"
          isLoading={deleteMutation.isPending}
          onConfirm={() => {
            if (deleteTarget) {
              deleteMutation.mutate(deleteTarget.mbcsId, { onSuccess: () => setDeleteTarget(null) })
            }
          }}
        />
      </CardContent>
    </Card>
  )
}

function FactorTab() {
  const [filters, setFilters] = useState<ListMbCrossSectionFactorParams>(defaultFilters)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<NormalizedMbCrossSectionFactor | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<NormalizedMbCrossSectionFactor | null>(null)

  const { data, isLoading } = useMbCrossSectionFactors(filters)
  const { columns, visibility, toggle, setAll, reset } = useMbCrossSectionFactorTableColumns()
  const deleteMutation = useDeleteMbCrossSectionFactor()
  const items = data?.items ?? []
  const totalItems = Number(data?.totalItems ?? 0)

  function handleSort(sortKey: string) {
    const nextDir = filters.sortBy === sortKey && filters.sortDir === "asc" ? "desc" : "asc"
    setFilters({ ...filters, sortBy: sortKey, sortDir: nextDir, page: 1 })
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_170px_auto_auto] lg:items-center">
          <DebouncedSearchInput
            value={filters.search || ""}
            onValueChange={(search) => setFilters({ ...filters, search, page: 1 })}
            placeholder="Search by from/to code…"
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
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ColumnVisibilityMenu
            columns={columns}
            visibility={visibility}
            onToggle={toggle}
            onSetAll={setAll}
            onReset={reset}
            className="h-9"
          />
          <Button
            className="h-9"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Factor
          </Button>
        </div>

        <MbCrossSectionFactorTable
          items={items}
          isLoading={isLoading}
          onEdit={(row) => {
            setEditing(row)
            setFormOpen(true)
          }}
          onDelete={setDeleteTarget}
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

        <MbCrossSectionFactorFormDialog open={formOpen} onOpenChange={setFormOpen} factor={editing} />

        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title="Delete Conversion Factor"
          description={`"${deleteTarget?.fromCode} → ${deleteTarget?.toCode}" will be permanently deleted.`}
          variant="destructive"
          confirmText="Delete"
          isLoading={deleteMutation.isPending}
          onConfirm={() => {
            if (deleteTarget) {
              deleteMutation.mutate(deleteTarget.mbcfId, { onSuccess: () => setDeleteTarget(null) })
            }
          }}
        />
      </CardContent>
    </Card>
  )
}

export default function MbCrossSectionPageClient() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="MB Cross Section"
        subtitle="Cross-section master codes and their directed LDR conversion factors."
      />

      <Tabs defaultValue="master" className="space-y-4">
        <TabsList>
          <TabsTrigger value="master">Cross Sections</TabsTrigger>
          <TabsTrigger value="factors">Conversion Factors</TabsTrigger>
        </TabsList>
        <TabsContent value="master">
          <MasterTab />
        </TabsContent>
        <TabsContent value="factors">
          <FactorTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
