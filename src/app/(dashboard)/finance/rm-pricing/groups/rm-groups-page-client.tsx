"use client"

import { useState, useMemo, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Plus, Loader2, Download, Upload } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/common/page-header"

import {
  GroupTable,
  GroupFormDialog,
  GroupDeleteDialog,
  GroupFilters,
  GroupPagination,
  RMGroupImportDialog,
} from "@/components/finance/rm-pricing/groups"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { useRMGroups, useExportRMGroups } from "@/hooks/finance/use-rm-group"
import { useSyncPeriods } from "@/hooks/finance/use-oracle-sync"
import { useUrlState } from "@/lib/hooks"
import {
  type RMGroupHead,
  type ListRMGroupsParams,
  ActiveFilter,
} from "@/types/finance/rm-group"

const defaultFilters: ListRMGroupsParams = {
  page: 1,
  pageSize: 10,
  search: "",
  activeFilter: ActiveFilter.ACTIVE_FILTER_UNSPECIFIED,
  sortBy: "code",
  sortOrder: "asc",
}

function RMGroupsPageContent() {
  const router = useRouter()
  const [filters, setFilters] = useUrlState<ListRMGroupsParams>({
    defaultValues: defaultFilters,
  })

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<RMGroupHead | null>(null)
  const exportMutation = useExportRMGroups()

  // This list page is period-blind (edits here always target the anchor
  // row) — pass the latest sync period so create/update write straight
  // through to the anchor row per the "latest period write-through" rule.
  const { data: periodsData } = useSyncPeriods()
  const latestPeriod = useMemo(
    () => periodsData?.periods?.[0] || "",
    [periodsData?.periods]
  )

  const handleExport = () => {
    // Export honors active_filter + search from the list-page filters.
    // Selected-mode (group_head_ids) is exposed via the BFF route for
    // programmatic callers; the list page itself doesn't expose multi-select
    // export (yet) — Filtered + All cover the bulk-migration workflow.
    exportMutation.mutate({
      activeFilter: filters.activeFilter,
      search: filters.search,
    })
  }

  // Use isFetching (not isLoading) so background refetches triggered on
  // navigation between pages also show the loading state — without this, the
  // cached-but-stale list briefly renders as "empty" until the refetch
  // resolves, which looked like a blank list to the operator.
  const { data, isFetching, isError, error } = useRMGroups(filters)
  const isLoading = isFetching

  const handleAddNew = () => {
    setSelectedGroup(null)
    setIsFormOpen(true)
  }

  const handleEdit = (group: RMGroupHead) => {
    setSelectedGroup(group)
    setIsFormOpen(true)
  }

  const handleDelete = (group: RMGroupHead) => {
    setSelectedGroup(group)
    setIsDeleteOpen(true)
  }

  const handleView = (group: RMGroupHead) => {
    router.push(`/finance/rm-pricing/groups/${group.groupHeadId}`)
  }

  const handleFormSuccess = (groupHeadId: string) => {
    // After create: navigate to the group detail page to add items
    // After edit: stay on list (or navigate, either works)
    if (!selectedGroup) {
      // This was a create — navigate to detail page
      router.push(`/finance/rm-pricing/groups/${groupHeadId}`)
    }
  }

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }))
  }

  const handlePageSizeChange = (pageSize: number) => {
    setFilters((prev) => ({ ...prev, pageSize, page: 1 }))
  }

  const totalItems = data?.pagination?.totalItems ?? 0

  return (
    <div className="w-full min-w-0 overflow-hidden">
      <PageHeader
        title="RM Groups"
        subtitle="Manage raw material groupings for cost calculation"
      >
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={exportMutation.isPending}>
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
                onClick={handleExport}
                disabled={exportMutation.isPending}
              >
                <Download className="mr-2 h-4 w-4" />
                Export to Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Import from Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add RM Group
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Group List</CardTitle>
            <CardDescription>
              {isLoading
                ? "Loading..."
                : `${totalItems} total RM groups`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <GroupFilters filters={filters} onFiltersChange={setFilters} />

            {isError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
                {error instanceof Error
                  ? error.message
                  : "Failed to load RM groups"}
              </div>
            )}

            <GroupTable
              data={data?.data || []}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onView={handleView}
            />

            <GroupPagination
              pagination={data?.pagination}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </CardContent>
        </Card>
      </div>

      <GroupFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        group={selectedGroup}
        period={latestPeriod}
        onSuccess={handleFormSuccess}
      />

      <GroupDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        group={selectedGroup}
      />

      <RMGroupImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
      />
    </div>
  )
}

function RMGroupsPageSkeleton() {
  return (
    <div className="w-full min-w-0 overflow-hidden space-y-4">
      <PageHeader
        title="RM Groups"
        subtitle="Manage raw material groupings for cost calculation"
      >
        <div className="flex items-center gap-2">
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" />
            Add RM Group
          </Button>
        </div>
      </PageHeader>
      <div className="grid grid-cols-1 gap-6">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Group List</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function RMGroupsPageClient() {
  return (
    <Suspense fallback={<RMGroupsPageSkeleton />}>
      <RMGroupsPageContent />
    </Suspense>
  )
}
