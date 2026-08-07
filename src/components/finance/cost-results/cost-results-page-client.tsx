"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Calculator, CheckCircle2, FileSpreadsheet, Layers, ListChecks, X } from "lucide-react"

import { PageHeader } from "@/components/common/page-header"
import { DebouncedSearchInput } from "@/components/common/debounced-search-input"
import { KpiCard, KpiGrid } from "@/components/common"
import { StatusBadge } from "@/components/common/status-badge"
import { UserName } from "@/components/common/user-name"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  ColumnVisibilityMenu,
  DataTable,
  DataTablePagination,
  useColumnVisibility,
  type ColumnDef,
  type RowAction,
} from "@/components/shared"
import { ProductTypeMultiCombobox } from "@/components/finance/comboboxes"
import {
  useCostResultsList,
  useCostResultPeriods,
  useRequestCostSheetExport,
} from "@/hooks/finance/use-cost-calc"
import type { CostResult } from "@/types/finance/cost-calc"
import { useUrlState } from "@/lib/hooks"

import { CALC_TYPE_LABELS, formatNumeric } from "./format"
import { ExportCostSheetButton } from "./export-cost-sheet-button"
import { RecentExportsPopover } from "./recent-exports-popover"

interface FiltersState {
  period: string
  calcType: string
  status: string
  search: string
  productTypeIds: number[]
  sortBy: string
  sortOrder: "asc" | "desc" | undefined
  page: number
  pageSize: number
  // In-flight/most-recent export job id — persisted so a page refresh mid-batch
  // rehydrates progress via useExportJobStatus instead of losing it. Cleared
  // when the user starts a new export or manually clears filters, not
  // auto-cleared on completion (so the final "N files done" summary stays
  // visible until the user dismisses it themselves).
  exportJobId: string
}

// calcType defaults to "" ("All Calculation") — pinning it to ACTUAL made the
// All-Calculation option un-selectable, since the URL state fell straight back
// to the default. sortBy/sortOrder/productTypeIds/exportJobId must be listed
// here too: useUrlState only tracks keys present in defaultValues.
const defaultFilters: FiltersState = {
  period: "",
  calcType: "",
  status: "",
  search: "",
  productTypeIds: [],
  sortBy: "",
  sortOrder: undefined,
  page: 1,
  pageSize: 50,
  exportJobId: "",
}

// Labels are the business-facing rate names, not the raw enum.
const CALC_TYPE_OPTIONS = [
  { value: "ALL", label: "All Calculation" },
  { value: "ACTUAL", label: "Actual (Valuation Rate)" },
  { value: "FORECAST", label: "Forecast (Marketing Rate)" },
  { value: "SELLING", label: "Selling (Simulation Rate)" },
] as const

const STATUSES = ["CALCULATED", "VERIFIED", "APPROVED", "SUPERSEDED"] as const

// Shared with the DataTable instance below — must match so the externally
// rendered ColumnVisibilityMenu reads/writes the same localStorage-backed
// visibility state as the table itself.
const TABLE_ID = "finance-cost-results"

type FilterKey = keyof FiltersState
type FilterValue = FiltersState[FilterKey]

function serializeFilters(key: FilterKey, value: FilterValue): string | undefined {
  if (key === "productTypeIds") {
    return Array.isArray(value) && value.length > 0 ? value.join(",") : undefined
  }
  if (value === undefined || value === null || value === "") return undefined
  return String(value)
}

function deserializeFilters(key: FilterKey, value: string | null, defaultValue: FilterValue): FilterValue {
  if (key === "productTypeIds") {
    if (!value) return defaultValue
    return value
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0)
  }
  if (value === null) return defaultValue
  if (typeof defaultValue === "number") {
    const num = Number(value)
    return Number.isNaN(num) ? defaultValue : num
  }
  return value as FilterValue
}

export function CostResultsPageClient() {
  const [filters, setFilters] = useUrlState<FiltersState>({
    defaultValues: defaultFilters,
    serialize: serializeFilters,
    deserialize: deserializeFilters,
  })

  const { data: periodsData, isLoading: periodsLoading } = useCostResultPeriods()
  const availablePeriods = periodsData?.periods ?? []

  const { data, isLoading } = useCostResultsList({
    period: filters.period || undefined,
    calculationType: filters.calcType || undefined,
    status: filters.status || undefined,
    search: filters.search || undefined,
    productTypeIds: filters.productTypeIds,
    sortBy: filters.sortBy || undefined,
    sortOrder: filters.sortOrder,
    page: filters.page,
    pageSize: filters.pageSize,
  })

  const items = useMemo(() => data?.items ?? [], [data])
  const pagination = data?.pagination
  const totalItems = Number(pagination?.totalItems ?? 0)
  const rawPeriod = data?.resolvedPeriod || filters.period || ""
  const resolvedPeriod = rawPeriod.length === 4
    ? `year ${rawPeriod}`
    : rawPeriod.length === 6
      ? `period ${rawPeriod}`
      : "—"

  const kpis = useMemo(() => {
    const verified = items.filter((r) => r.status === "VERIFIED" || r.status === "APPROVED").length
    const avg =
      items.length > 0
        ? items.reduce((s, r) => s + (Number(r.costPerUnit) || 0), 0) / items.length
        : 0
    return { total: totalItems, onPage: items.length, verified, avg }
  }, [items, totalItems])

  const selectedTypeCount = filters.productTypeIds?.length ?? 0

  // Shared payload for both the bulk button and the per-row action. `period`
  // stays raw: the export requires a concrete YYYYMM, and the button/action
  // guard on that rather than silently falling back to the resolved period.
  const exportFilters = useMemo(
    () => ({
      period: filters.period,
      calculationType: filters.calcType || undefined,
      productTypeIds: filters.productTypeIds,
      search: filters.search || undefined,
      status: filters.status || undefined,
    }),
    [filters.period, filters.calcType, filters.productTypeIds, filters.search, filters.status],
  )

  // RowAction.onClick is sync/void, so the mutation lives here and is fired
  // and forgotten — the hook's toasts carry success/failure.
  const exportMutation = useRequestCostSheetExport()

  const rowActions: RowAction<CostResult>[] = useMemo(
    () => [
      {
        id: "export",
        label: "Export cost sheet",
        icon: <FileSpreadsheet className="h-4 w-4" />,
        disabled: () => exportMutation.isPending,
        onClick: (r) => {
          exportMutation.mutate({
            period: r.period,
            calculationType: r.calculationType,
            productSysIds: [r.productSysId],
          })
        },
      },
    ],
    [exportMutation],
  )

  // A new column always starts ascending; clicking the active one toggles.
  function handleSort(sortKey: string) {
    const nextOrder = filters.sortBy === sortKey && filters.sortOrder === "asc" ? "desc" : "asc"
    setFilters({ ...filters, sortBy: sortKey, sortOrder: nextOrder, page: 1 })
  }

  // sortKey values come from the proto's validated in-list for sort_by. RM and
  // Conversion carry none, so they render as plain headers rather than
  // promising an order the server would reject.
  const columns: ColumnDef<CostResult>[] = useMemo(
    () => [
      {
        id: "productCode",
        header: "Product",
        sortKey: "productCode",
        canHide: false,
        cell: (r) => (
          <div className="min-w-0">
            <Link
              href={`/finance/cost-results/${r.productSysId}/${r.period}/${r.calculationType}`}
              className="font-mono text-sm font-medium text-primary hover:underline"
            >
              {r.productCode || "—"}
            </Link>
            {r.productName && (
              <div className="truncate text-xs text-muted-foreground">{r.productName}</div>
            )}
          </div>
        ),
      },
      {
        id: "productName",
        header: "Product name",
        sortKey: "productName",
        defaultHidden: true,
        cell: (r) => <span className="text-sm">{r.productName || "—"}</span>,
      },
      {
        id: "period",
        header: "Period",
        sortKey: "period",
        defaultHidden: true,
        cell: (r) => <span className="font-mono text-sm">{r.period || "—"}</span>,
      },
      {
        id: "calculationType",
        header: "Type",
        sortKey: "calculationType",
        hideOnMobile: true,
        cell: (r) => (
          <span className="text-sm">{CALC_TYPE_LABELS[r.calculationType] ?? r.calculationType}</span>
        ),
      },
      {
        id: "costPerUnit",
        header: "Cost / unit",
        sortKey: "costPerUnit",
        headerClassName: "text-right",
        cellClassName: "text-right font-mono text-sm tabular-nums",
        cell: (r) => formatNumeric(r.costPerUnit),
      },
      {
        id: "totalRmCost",
        header: "RM",
        headerClassName: "text-right",
        cellClassName: "text-right font-mono text-sm tabular-nums",
        hideOnMobile: true,
        cell: (r) => formatNumeric(r.totalRmCost),
      },
      {
        id: "totalConversion",
        header: "Conversion",
        headerClassName: "text-right",
        cellClassName: "text-right font-mono text-sm tabular-nums",
        hideOnMobile: true,
        cell: (r) => formatNumeric(r.totalConversion),
      },
      {
        id: "totalCost",
        header: "Total",
        sortKey: "totalCost",
        headerClassName: "text-right",
        cellClassName: "text-right font-mono text-sm font-semibold tabular-nums",
        cell: (r) => formatNumeric(r.totalCost),
      },
      {
        id: "status",
        header: "Status",
        sortKey: "status",
        cell: (r) => <StatusBadge status={r.status} type="cost" size="sm" />,
      },
      {
        id: "calculatedBy",
        header: "By",
        hideOnMobile: true,
        cell: (r) => (r.calculatedBy ? <UserName userId={r.calculatedBy} compact /> : "—"),
      },
      {
        id: "calculatedAt",
        header: "Calculated at",
        sortKey: "calculatedAt",
        defaultHidden: true,
        cell: (r) =>
          r.calculatedAt ? (
            <span className="text-sm">{new Date(r.calculatedAt).toLocaleString()}</span>
          ) : (
            "—"
          ),
      },
    ],
    [],
  )

  const { visibility, toggle, setAll, reset } = useColumnVisibility(TABLE_ID, columns)

  const hasActiveFilters =
    filters.period !== defaultFilters.period ||
    filters.calcType !== defaultFilters.calcType ||
    filters.status !== defaultFilters.status ||
    filters.search !== defaultFilters.search ||
    filters.productTypeIds.length > 0
  // exportJobId intentionally excluded from hasActiveFilters — it's not a
  // list filter, so it shouldn't show the "Clear filters" button on its own.

  const handleClearFilters = () => {
    setFilters(defaultFilters)
  }

  return (
    <div className="w-full min-w-0 space-y-5">
      <PageHeader
        title="Cost Results"
        subtitle={`Per-product unit costs · ${resolvedPeriod}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <RecentExportsPopover
            period={filters.period || undefined}
            onSelectJob={(jobId) => setFilters({ ...filters, exportJobId: jobId })}
          />
          <ExportCostSheetButton
            filters={exportFilters}
            totalCount={totalItems}
            label="Export cost sheets"
            exportJobId={filters.exportJobId || undefined}
            onExportJobIdChange={(exportJobId) => setFilters({ ...filters, exportJobId })}
          />
        </div>
      </PageHeader>

      <KpiGrid>
        <KpiCard
          title="Results (period)"
          value={kpis.total.toLocaleString()}
          icon={ListChecks}
          loading={isLoading}
        />
        <KpiCard
          title="Shown on page"
          value={kpis.onPage}
          icon={Layers}
          loading={isLoading}
        />
        <KpiCard
          title="Verified / approved"
          value={kpis.verified}
          icon={CheckCircle2}
          variant="success"
          loading={isLoading}
        />
        <KpiCard
          title="Avg cost / unit"
          value={kpis.avg.toLocaleString("en-US", { maximumFractionDigits: 2 })}
          icon={Calculator}
          loading={isLoading}
        />
      </KpiGrid>

      <Card className="min-w-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-sm font-semibold">Result list</CardTitle>
            <CardDescription className="mt-0.5">
              {isLoading ? "Loading…" : `${totalItems.toLocaleString()} total results`}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pt-0">
          {/* Filter bar — all controls h-9 so the row lines up. */}
          <div className="flex flex-wrap items-center gap-2">
            <DebouncedSearchInput
              containerClassName="flex-1 min-w-[180px]"
              className="h-9"
              value={filters.search}
              onValueChange={(search) => setFilters({ ...filters, search, page: 1 })}
              placeholder="Search product code or name…"
            />
            <Select
              value={filters.period || "ALL"}
              onValueChange={(v) => setFilters({ ...filters, period: v === "ALL" ? "" : v, page: 1 })}
              disabled={periodsLoading}
            >
              <SelectTrigger className="h-9 w-[148px]">
                <SelectValue
                  placeholder={periodsLoading ? "Loading…" : "Period"}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Periods</SelectItem>
                {availablePeriods.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ProductTypeMultiCombobox
              value={filters.productTypeIds ?? []}
              onChange={(productTypeIds) => setFilters({ ...filters, productTypeIds, page: 1 })}
              placeholder="All product types"
              className="h-9 w-[220px]"
            />
            <Select
              value={filters.calcType || "ALL"}
              onValueChange={(v) => setFilters({ ...filters, calcType: v === "ALL" ? "" : v, page: 1 })}
            >
              <SelectTrigger className="h-9 w-[210px]">
                <SelectValue placeholder="Calculation" />
              </SelectTrigger>
              <SelectContent>
                {CALC_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.status || "ALL"}
              onValueChange={(v) => setFilters({ ...filters, status: v === "ALL" ? "" : v, page: 1 })}
            >
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Active (default)</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              {selectedTypeCount > 0 && (
                <span>
                  Filtering by {selectedTypeCount} {selectedTypeCount === 1 ? "product type" : "product types"}.
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-8">
                  <X className="mr-1 h-4 w-4" />
                  Clear
                </Button>
              )}
              <ColumnVisibilityMenu
                columns={columns}
                visibility={visibility}
                onToggle={toggle}
                onSetAll={setAll}
                onReset={reset}
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <DataTable
              data={items}
              columns={columns}
              actions={rowActions}
              keyField="costId"
              isLoading={isLoading}
              tableId={TABLE_ID}
              hideColumnsButton
              skeletonRowCount={8}
              sortBy={filters.sortBy}
              sortOrder={filters.sortOrder}
              onSort={handleSort}
              emptyMessage="No cost results"
              emptyDescription="No calculated cost rows for this period/filter. Trigger a calculation from a product or calc job."
            />
          </div>

          {totalItems > 0 && (
            <DataTablePagination
              currentPage={Number(pagination?.currentPage ?? 1)}
              pageSize={Number(pagination?.pageSize ?? 50)}
              totalItems={totalItems}
              totalPages={Number(pagination?.totalPages ?? 0)}
              onPageChange={(page) => setFilters({ ...filters, page })}
              onPageSizeChange={(pageSize) => setFilters({ ...filters, pageSize, page: 1 })}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
