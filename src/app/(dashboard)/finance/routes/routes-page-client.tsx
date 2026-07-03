"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle2,
  ChevronDown,
  FileStack,
  GitFork,
  Lock,
  PencilRuler,
  Plus,
} from "lucide-react"

import { DebouncedSearchInput, EmptyState, KpiCard, KpiGrid, PageHeader } from "@/components/common"
import { StatusBadge } from "@/components/common/status-badge"
import { CreateRoutingWizard } from "@/components/finance/cost-product-request/create-routing-wizard"
import { ColumnVisibilityMenu, DataTablePagination, SortableHeader, useColumnVisibility } from "@/components/shared"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useRouteCounts, useRoutes } from "@/hooks/finance/use-cost-route"
import { useUrlState } from "@/lib/hooks"
import type { ListRoutesParams, RouteStatus } from "@/types/finance/cost-route"

// Column definitions — id doubles as the sort key where sortable
const ROUTE_COLUMNS = [
  { id: "head_id",                header: "Head #",      canHide: false },
  { id: "product_code",           header: "Product" },
  { id: "status",                 header: "Status" },
  { id: "version",                header: "Version",     defaultHidden: false },
  { id: "promoted_from_draft_id", header: "From draft",  defaultHidden: true },
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
  const [wizardOpen, setWizardOpen] = useState(false)

  const { data, isLoading } = useRoutes(filters)
  const { data: counts, isLoading: countsLoading } = useRouteCounts()

  const columns = useMemo(() => [...ROUTE_COLUMNS], [])
  const { visibility, toggle, setAll, reset } = useColumnVisibility(TABLE_ID, columns)
  const show = (id: ColId) => visibility[id] !== false

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">New route</span>
              <span className="sm:hidden">New</span>
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setWizardOpen(true)}>
              From product (wizard)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </PageHeader>

      <KpiGrid cols={4}>
        <KpiCard title="Total routes" value={counts?.total ?? 0} icon={FileStack} loading={countsLoading} />
        <KpiCard title="Draft"    value={counts?.draft ?? 0}    icon={PencilRuler} variant="warning"  loading={countsLoading} />
        <KpiCard title="Complete" value={counts?.complete ?? 0} icon={CheckCircle2} variant="success" loading={countsLoading} />
        <KpiCard title="Locked"   value={counts?.locked ?? 0}   icon={Lock}        loading={countsLoading} />
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
        <div className="flex items-center justify-end">
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
                  <SortableHeader label="Head #" sortKey="head_id" className="w-24 pl-4" {...sortProps} />
                )}
                {show("product_code") && (
                  <SortableHeader label="Product" sortKey="product_code" {...sortProps} />
                )}
                {show("status") && (
                  <SortableHeader label="Status" sortKey="status" className="w-28" {...sortProps} />
                )}
                {show("version") && (
                  <SortableHeader label="Version" sortKey="version" className="w-24" {...sortProps} />
                )}
                {show("promoted_from_draft_id") && (
                  <TableHead className="w-28">From draft</TableHead>
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
                    {show("promoted_from_draft_id") && <TableCell><Skeleton className="h-4 w-10" /></TableCell>}
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
                <TableRow
                  key={h.headId}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/finance/routes/${h.headId}`)}
                >
                  {show("head_id") && (
                    <TableCell className="pl-4 font-mono text-xs">#{h.headId}</TableCell>
                  )}
                  {show("product_code") && (
                    <TableCell>
                      <div className="font-medium">{h.productCode || "—"}</div>
                      {h.productName && (
                        <div className="text-xs text-muted-foreground">{h.productName}</div>
                      )}
                    </TableCell>
                  )}
                  {show("status") && (
                    <TableCell>
                      <StatusBadge status={h.routingStatus} type="route" size="sm" />
                    </TableCell>
                  )}
                  {show("version") && (
                    <TableCell className="text-sm">v{h.version}</TableCell>
                  )}
                  {show("promoted_from_draft_id") && (
                    <TableCell className="text-sm">
                      {h.promotedFromDraftId ? `#${h.promotedFromDraftId}` : "—"}
                    </TableCell>
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

      <CreateRoutingWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        requestId={0}
      />
    </div>
  )
}
