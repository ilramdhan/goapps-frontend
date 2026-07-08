"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  CheckCircle2,
  FileStack,
  GitFork,
  Lock,
  PencilRuler,
  Plus,
  X,
} from "lucide-react"

import { DebouncedSearchInput, EmptyState, KpiCard, KpiGrid, PageHeader } from "@/components/common"
import { StatusBadge } from "@/components/common/status-badge"
import { RoutingResolver } from "@/components/finance/cost-product-request/routing-resolver"
import { ColumnVisibilityMenu, DataTablePagination, SortableHeader, useColumnVisibility } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { useRouteCounts, useRoutes } from "@/hooks/finance/use-cost-route"
import { useUrlState } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import type { ListRoutesParams, RouteStatus } from "@/types/finance/cost-route"

// Column definitions — id doubles as the sort key where sortable
const ROUTE_COLUMNS = [
  { id: "head_id",                header: "Head #",      canHide: false },
  { id: "product_code",           header: "Product" },
  { id: "status",                 header: "Status" },
  { id: "version",                header: "Version",     defaultHidden: false },
  { id: "level_count",            header: "# levels" },
  { id: "rm_count",               header: "# RM" },
] as const

type ColId = (typeof ROUTE_COLUMNS)[number]["id"]

const TABLE_ID = "finance-routes"

const defaultFilters: ListRoutesParams = {
  page: 1,
  pageSize: 20,
  search: "",
  status: "",
  sortBy: "",
  sortOrder: "asc",
}

export default function RoutesPageClient() {
  const router = useRouter()
  const [filters, setFilters] = useUrlState<ListRoutesParams>({ defaultValues: defaultFilters })
  const [resolverOpen, setResolverOpen] = useState(false)

  const { data, isLoading } = useRoutes(filters)
  const { data: counts, isLoading: countsLoading } = useRouteCounts()

  const columns = useMemo(() => [...ROUTE_COLUMNS], [])
  const { visibility, toggle, setAll, reset } = useColumnVisibility(TABLE_ID, columns)
  const show = (id: ColId) => visibility[id] !== false
  // Right edge padding goes on whichever column renders last (routes has no trailing actions column).
  const lastVisibleId = [...ROUTE_COLUMNS].reverse().find((c) => show(c.id))?.id
  const edgeRight = (id: ColId) => (id === lastVisibleId ? "pr-4" : "")

  function handleSort(sortKey: string) {
    const nextOrder =
      filters.sortBy === sortKey && filters.sortOrder === "asc" ? "desc" : "asc"
    setFilters({ ...filters, sortBy: sortKey as ListRoutesParams["sortBy"], sortOrder: nextOrder, page: 1 })
  }

  const sortProps = {
    currentSortBy: filters.sortBy,
    currentSortOrder: filters.sortOrder as "asc" | "desc" | undefined,
    onSort: handleSort,
  }

  const hasActiveFilters = !!filters.search || !!filters.status || !!filters.sortBy

  function clearFilters() {
    setFilters({
      ...filters,
      search: "",
      status: "",
      sortBy: "",
      sortOrder: "asc",
      page: 1,
    })
  }

  const items = data?.items ?? []
  const totalItems = data?.total ?? 0
  const totalPages = data?.totalPages ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Routes"
        subtitle="Multi-stage routings (DAG): one head per product, each stage produces an intermediate or FG product."
        className="pb-0"
      >
        <Button onClick={() => setResolverOpen(true)} aria-label="New route">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New route</span>
        </Button>
      </PageHeader>

      <KpiGrid cols={4}>
        <KpiCard title="Total routes" value={counts?.total ?? 0} icon={FileStack} loading={countsLoading} />
        <KpiCard title="Draft"    value={counts?.draft ?? 0}    icon={PencilRuler}  loading={countsLoading} />
        <KpiCard title="Complete" value={counts?.complete ?? 0} icon={CheckCircle2} loading={countsLoading} />
        <KpiCard title="Locked"   value={counts?.locked ?? 0}   icon={Lock}         loading={countsLoading} />
      </KpiGrid>

      {/* Filter bar — matches product-master grid pattern */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_170px_auto] lg:items-center">
        <DebouncedSearchInput
          value={filters.search || ""}
          onValueChange={(search) => setFilters({ ...filters, search, page: 1 })}
          placeholder="Search by product code or name…"
          className="h-9"
          containerClassName="min-w-0 sm:col-span-2 lg:col-span-1"
        />
        <Select
          value={filters.status || "ALL"}
          onValueChange={(v) => {
            setFilters({ ...filters, status: v === "ALL" ? "" : (v as RouteStatus), page: 1 })
          }}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="COMPLETE">Complete</SelectItem>
            <SelectItem value="LOCKED">Locked</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center justify-end gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-9" onClick={clearFilters}>
              <X className="mr-1.5 h-3.5 w-3.5" /> Clear
            </Button>
          )}
          <ColumnVisibilityMenu
            columns={columns}
            visibility={visibility}
            onToggle={toggle}
            onSetAll={setAll}
            onReset={reset}
            className="h-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {show("head_id") && (
                  <SortableHeader label="Head #" sortKey="head_id" className={cn("w-24 pl-4", edgeRight("head_id"))} {...sortProps} />
                )}
                {show("product_code") && (
                  <SortableHeader label="Product" sortKey="product_code" className={edgeRight("product_code")} {...sortProps} />
                )}
                {show("status") && (
                  <SortableHeader label="Status" sortKey="status" className={cn("w-28", edgeRight("status"))} {...sortProps} />
                )}
                {show("version") && (
                  <SortableHeader label="Version" sortKey="version" className={cn("w-24", edgeRight("version"))} {...sortProps} />
                )}
                {show("level_count") && (
                  <SortableHeader label="# levels" sortKey="level_count" className={cn("w-24 text-right", edgeRight("level_count"))} {...sortProps} />
                )}
                {show("rm_count") && (
                  <SortableHeader label="# RM" sortKey="rm_count" className={cn("w-20 text-right", edgeRight("rm_count"))} {...sortProps} />
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {show("head_id") && <TableCell className="pl-4"><Skeleton className="h-4 w-12" /></TableCell>}
                    {show("product_code") && <TableCell><Skeleton className="h-4 w-40" /></TableCell>}
                    {show("status") && <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>}
                    {show("version") && <TableCell><Skeleton className="h-4 w-8" /></TableCell>}
                    {show("level_count") && <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-8" /></TableCell>}
                    {show("rm_count") && <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-8" /></TableCell>}
                  </TableRow>
                ))}
              {!isLoading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={ROUTE_COLUMNS.filter((c) => show(c.id)).length} className="p-0">
                    <EmptyState
                      icon={GitFork}
                      title="No routes found"
                      description="Promote a routing draft or adjust your search filters."
                      className="border-0 rounded-none"
                    />
                  </TableCell>
                </TableRow>
              )}
              {items.map((h) => (
                <TableRow key={h.headId} className="relative cursor-pointer hover:bg-muted/50">
                  {show("head_id") && (
                    <TableCell className={cn("pl-4 font-mono text-xs", edgeRight("head_id"))}>
                      <Link href={`/finance/routes/${h.headId}`} className="absolute inset-0">
                        <span className="sr-only">Open route #{h.headId}</span>
                      </Link>
                      #{h.headId}
                    </TableCell>
                  )}
                  {show("product_code") && (
                    <TableCell className={edgeRight("product_code")}>
                      <div className="font-medium">{h.productCode || "—"}</div>
                      {h.productName && (
                        <div className="text-xs text-muted-foreground">{h.productName}</div>
                      )}
                    </TableCell>
                  )}
                  {show("status") && (
                    <TableCell className={edgeRight("status")}>
                      <StatusBadge status={h.routingStatus} type="route" size="sm" />
                    </TableCell>
                  )}
                  {show("version") && (
                    <TableCell className={cn("text-sm", edgeRight("version"))}>v{h.version}</TableCell>
                  )}
                  {show("level_count") && (
                    <TableCell className={cn("text-right text-sm tabular-nums", edgeRight("level_count"))}>{h.levelCount}</TableCell>
                  )}
                  {show("rm_count") && (
                    <TableCell className={cn("text-right text-sm tabular-nums", edgeRight("rm_count"))}>{h.rmCount}</TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {totalItems > 0 && (
        <DataTablePagination
          currentPage={filters.page ?? 1}
          pageSize={filters.pageSize ?? 20}
          totalItems={totalItems}
          totalPages={totalPages}
          onPageChange={(page) => setFilters({ ...filters, page })}
          onPageSizeChange={(pageSize) => setFilters({ ...filters, pageSize, page: 1 })}
        />
      )}

      <Dialog open={resolverOpen} onOpenChange={setResolverOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New route</DialogTitle>
          </DialogHeader>
          <RoutingResolver
            requestId={0}
            onResolved={(headId) => {
              setResolverOpen(false)
              router.push(`/finance/routes/${headId}`)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
