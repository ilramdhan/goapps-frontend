"use client"

import { useState } from "react"
import { Ban, Download, FileText, Inbox, Loader2, Plus, Upload, XCircle } from "lucide-react"

import { PageHeader } from "@/components/common/page-header"
import { DebouncedSearchInput } from "@/components/common/debounced-search-input"
import { KpiCard, KpiGrid } from "@/components/common"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ColumnVisibilityMenu } from "@/components/shared/data-table/column-visibility-menu"
import { DataTablePagination } from "@/components/shared"
import {
  CostProductRequestImportDialog,
  RequestFormDialog,
  RequestTable,
  useRequestTableColumns,
} from "@/components/finance/cost-product-request"
import { FillTrackingDrawer } from "@/components/finance/fill-assignment"
import {
  useCostProductRequestCounts,
  useCostProductRequests,
  useExportCostProductRequests,
} from "@/hooks/finance/use-cost-product-request"
import { useUrlState } from "@/lib/hooks"
import { getStatusDisplay } from "@/lib/ui/status-colors"
import { usePermissionContext } from "@/providers/permission-provider"
import { PERMISSIONS } from "@/lib/rbac/permissions"
import type { CostProductRequest, ListCostProductRequestsParams, RequestStatus } from "@/types/finance/cost-product-request"

const STATUSES: RequestStatus[] = [
  "DRAFT", "SUBMITTED", "UNDER_REVIEW", "ROUTING_DEFINED",
  "PARAMETER_PENDING", "PARAMETER_COMPLETE", "CONFIRMED", "APPROVED",
  "RELEASED", "COSTING_DONE", "QUOTED", "QUOTE_READY", "CLOSED", "REJECTED",
]

const defaultFilters: ListCostProductRequestsParams = {
  search: "",
  status: "",
  page: 1,
  pageSize: 25,
  // sortBy/sortOrder must be listed here — useUrlState only tracks keys present in defaultValues.
  // sortOrder must default to a string ("asc"), not undefined — useUrlState's defaultDeserialize
  // branches on typeof defaultValue, and "undefined" falls through to JSON.parse(urlValue), which
  // throws for a plain string like "asc" and silently resets to the default on every read. That
  // made sortOrder permanently stick at undefined regardless of the URL (found during manual
  // verification of this batch — same latent bug in product-master-page-client.tsx, out of scope here).
  sortBy: "",
  sortOrder: "asc",
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

export default function ProductRequestsPageClient() {
  const { hasPermission } = usePermissionContext()
  const canCreate = hasPermission(PERMISSIONS.ProductRequests.requestCreate)

  const [filters, setFilters] = useUrlState<ListCostProductRequestsParams>({ defaultValues: defaultFilters })
  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [trackingRequest, setTrackingRequest] = useState<CostProductRequest | null>(null)

  // Column visibility managed at page level so the toggle lives in CardHeader
  const { columns, visibility, toggle, setAll, reset } = useRequestTableColumns(true)

  const { data: list, isLoading } = useCostProductRequests(filters)
  const { data: counts, isLoading: countsLoading } = useCostProductRequestCounts()
  const exportMutation = useExportCostProductRequests()

  const items = list?.items ?? []
  const pagination = list?.pagination
  const totalItems = Number(pagination?.totalItems ?? 0)

  function handleSort(sortKey: string) {
    const nextOrder = filters.sortBy === sortKey && filters.sortOrder === "asc" ? "desc" : "asc"
    setFilters({ ...filters, sortBy: sortKey as ListCostProductRequestsParams["sortBy"], sortOrder: nextOrder, page: 1 })
  }

  async function handleExport() {
    await exportMutation.mutateAsync({
      search: filters.search,
      status: filters.status,
      requestTypeId: filters.requestTypeId,
    })
  }

  return (
    <div className="w-full min-w-0 space-y-5">
      <PageHeader title="Product Requests" subtitle="Marketing → Engineering request lifecycle (Phase A).">
        <div className="flex items-center gap-2">
          {/* Export/Import Dropdown */}
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
                onClick={handleExport}
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

          {canCreate && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> New request
            </Button>
          )}
        </div>
      </PageHeader>

      <KpiGrid>
        <KpiCard title="Total requests" value={counts?.total ?? 0} icon={FileText} loading={countsLoading} />
        <KpiCard title="Open"           value={counts?.open ?? 0}  icon={Inbox}    loading={countsLoading} />
        <KpiCard title="Rejected"       value={counts?.rejected ?? 0} icon={XCircle} loading={countsLoading} />
        <KpiCard title="Closed"         value={counts?.closed ?? 0}  icon={Ban}    loading={countsLoading} />
      </KpiGrid>

      <Card className="min-w-0">
        {/* Card header: title + description left, column toggle right */}
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Request List</CardTitle>
            <CardDescription className="mt-0.5">
              {countsLoading ? "Loading…" : `${totalItems} total requests`}
            </CardDescription>
          </div>
          <ColumnVisibilityMenu
            columns={columns}
            visibility={visibility}
            onToggle={toggle}
            onSetAll={setAll}
            onReset={reset}
          />
        </CardHeader>

        <CardContent className="space-y-3 pt-0">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2">
            <DebouncedSearchInput
              containerClassName="flex-1 min-w-[180px]"
              value={filters.search || ""}
              onValueChange={(search) => setFilters({ ...filters, search, page: 1 })}
              placeholder="Search by request #, title, or customer…"
            />
            <Select
              value={filters.status || "ALL"}
              onValueChange={(v) =>
                setFilters({ ...filters, status: v === "ALL" ? "" : (v as RequestStatus), page: 1 })
              }
            >
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {getStatusDisplay("request", s).label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <RequestTable
            items={items}
            isLoading={isLoading}
            visibility={visibility}
            onTrack={(r) => setTrackingRequest(r)}
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            onSort={handleSort}
          />

          {totalItems > 0 && (
            <DataTablePagination
              currentPage={Number(pagination?.currentPage ?? 1)}
              pageSize={Number(pagination?.pageSize ?? 25)}
              totalItems={totalItems}
              totalPages={Number(pagination?.totalPages ?? 0)}
              onPageChange={(page) => setFilters({ ...filters, page })}
              onPageSizeChange={(pageSize) => setFilters({ ...filters, pageSize, page: 1 })}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
            />
          )}
        </CardContent>
      </Card>

      <RequestFormDialog open={formOpen} onOpenChange={setFormOpen} request={null} />

      <CostProductRequestImportDialog open={importOpen} onOpenChange={setImportOpen} />

      <FillTrackingDrawer
        open={trackingRequest !== null}
        onOpenChange={(open) => { if (!open) setTrackingRequest(null); }}
        requestId={trackingRequest?.requestId ?? 0}
        requestNo={trackingRequest?.requestNo ?? ""}
      />
    </div>
  )
}
