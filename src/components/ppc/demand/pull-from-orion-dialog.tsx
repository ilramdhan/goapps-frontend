"use client"

import { useMemo, useState } from "react"
import { Loader2, Lock, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import {
  ScrollableDialogContent,
  ScrollableDialogHeader,
  ScrollableDialogBody,
  ScrollableDialogFooter,
} from "@/components/common/scrollable-dialog"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTable, type ColumnDef } from "@/components/shared"
import { DebouncedSearchInput } from "@/components/common"
import { CustomerCombobox, ItemCodeCombobox } from "@/components/ppc/comboboxes"

import type { SalesOrderStaging, ListSalesOrderStagingParams } from "@/types/ppc/master"
import { DemandSubType, DEMAND_SUB_TYPE_OPTIONS, currentMonth } from "@/types/ppc/common"
import {
  useSalesOrderStaging,
  useSelectAllStagingIds,
} from "@/hooks/ppc/use-sales-order-staging"
import { usePullFromOrion, useSetStagingProduct } from "@/hooks/ppc/use-demand"
import {
  StagingProductCell,
  stagingNeedsPicker,
  type StagingProductPick,
} from "./staging-product-cell"

interface PullFromOrionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

// Mirrors max_items on PullFromOrionRequest.sos_ids in ppc/v1/demand.proto.
// Kept here so an over-sized hand-built selection is caught with a plain
// sentence instead of a proto validation error.
const MAX_PULL_BATCH = 200

// Default page size. Higher than the project's usual 10 because this dialog is
// a bulk-selection surface: a planner pulling a month of orders should see a
// working slab of them, not one screenful per four scrolls.
const DEFAULT_PAGE_SIZE = 25

// Sort keys the backend actually honours, verbatim from the `in:` list on
// ListSalesOrderStagingRequest.sort_by (ppc/v1/demand.proto:61) and matching
// the sortColumnMap in DemandRepository.ListStaging. A key outside this set
// falls through to the repository's default ORDER BY, so the list would come
// back in an order the header does not claim — a lie, silently. Any column
// below without one of these keys is deliberately not sortable (S-1.2).
const SORT_CONTRACT_NO = "contract_no"
const SORT_CUSTOMER_NAME = "customer_name"
const SORT_DEADLINE = "deadline"
const SORT_QTY_REMAINING = "qty_remaining"

function fmtQty(value: string): string {
  const n = Number(value)
  return Number.isFinite(n) ? n.toLocaleString() : value || "-"
}

export function PullFromOrionDialog({ open, onOpenChange, onSuccess }: PullFromOrionDialogProps) {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [subType, setSubType] = useState<DemandSubType>(DemandSubType.DEMAND_SUB_TYPE_LOCAL)
  // Sort. Empty sortBy = the backend's own default (deadline ascending); the
  // header cycle returns here on its third click rather than inventing a
  // "no order" the server has no way to express.
  const [sortBy, setSortBy] = useState("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  // Customer filter. The code is what the backend matches on; the id and label
  // are kept only so the combobox can render the choice as a customer rather
  // than as a code the planner has to recognise.
  const [customer, setCustomer] = useState<{ id: number; code: string } | null>(null)
  const [itemCode, setItemCode] = useState("")
  // Changing what the list shows never drops the selection — a planner who spent
  // a minute ticking rows across three filter passes would lose the work, and
  // the pull endpoint takes ids, not a query, so an off-page selection is
  // perfectly valid. What it does do is set this flag, so the toolbar can say
  // outright that some selected rows may no longer be on screen (S-1.6).
  const [selectionStale, setSelectionStale] = useState(false)
  // Default true — this is what the BFF already sends when the param is absent
  // (see api/v1/ppc/sales-order-staging/route.ts), so today's behaviour is
  // unchanged. Turning it off shows the full inbox including already-pulled
  // rows, which cannot be pulled again.
  const [unpulledOnly, setUnpulledOnly] = useState(true)
  // Outcome of the last "select all matching", kept so the UI can state what it
  // actually selected rather than what the filter matched. The server caps the
  // id set (a pull can only carry so many rows), and when it does, `totalMatched`
  // exceeds `picked` — that difference must be visible, never rounded away.
  const [selectAllInfo, setSelectAllInfo] = useState<{
    picked: number
    totalMatched: number
    limit: number
    /** True when already-pulled rows were on screen but left out of the pick. */
    excludedPulled: boolean
  } | null>(null)
  // Products the planner chose by hand for rows finance could not resolve
  // uniquely. Each pick is persisted onto its staging row immediately; this map
  // only keeps the chosen label on screen until the list refetch confirms it.
  const [picks, setPicks] = useState<Map<number, StagingProductPick>>(new Map())
  const [savingPicks, setSavingPicks] = useState<Set<number>>(new Set())

  const pullMutation = usePullFromOrion()
  const setStagingProduct = useSetStagingProduct()
  const selectAllIds = useSelectAllStagingIds()

  // Reset the LOV state when the dialog opens (adjust-during-render pattern —
  // avoids setState-in-effect cascading renders).
  const [wasOpen, setWasOpen] = useState(false)
  if (open && !wasOpen) {
    setWasOpen(true)
    setSearch("")
    setPage(1)
    setPageSize(DEFAULT_PAGE_SIZE)
    setSelected(new Set())
    setSelectAllInfo(null)
    setPicks(new Map())
    setSavingPicks(new Set())
    setSubType(DemandSubType.DEMAND_SUB_TYPE_LOCAL)
    setSortBy("")
    setSortOrder("asc")
    setCustomer(null)
    setItemCode("")
    setUnpulledOnly(true)
    setSelectionStale(false)
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  // The filter half of the query. ListSalesOrderStagingIdsRequest mirrors these
  // fields exactly and nothing else, so "select all matching" resolves the same
  // WHERE clause as the paged list (the backend routes both through
  // stagingPredicate). Sort is deliberately absent — it cannot change which
  // rows match, only their order, and an ids-only call has no order to speak of
  // beyond its own deadline-first truncation rule.
  const filters = useMemo(
    () => ({
      search,
      customerCode: customer?.code ?? "",
      itemCode,
      unpulledOnly,
    }),
    [search, customer, itemCode, unpulledOnly]
  )

  const params: ListSalesOrderStagingParams = useMemo(
    () => ({ page, pageSize, ...filters, sortBy, sortOrder }),
    [page, pageSize, filters, sortBy, sortOrder]
  )

  const activeFilterCount =
    (search ? 1 : 0) + (customer ? 1 : 0) + (itemCode ? 1 : 0) + (unpulledOnly ? 0 : 1)

  const noteListChanged = () => {
    setSelectAllInfo(null)
    setSelectionStale(true)
  }

  const applyFilterChange = (fn: () => void) => {
    fn()
    setPage(1)
    if (selected.size > 0) noteListChanged()
    else setSelectAllInfo(null)
  }

  // asc -> desc -> back to the server default. The third state is a real one
  // (the backend orders by deadline when sort_by is empty), not a pretend
  // "unsorted".
  const handleSort = (key: string) => {
    if (sortBy !== key) {
      setSortBy(key)
      setSortOrder("asc")
    } else if (sortOrder === "asc") {
      setSortOrder("desc")
    } else {
      setSortBy("")
      setSortOrder("asc")
    }
    setPage(1)
    if (selected.size > 0) noteListChanged()
  }

  const clearFilters = () => {
    applyFilterChange(() => {
      setSearch("")
      setCustomer(null)
      setItemCode("")
      setUnpulledOnly(true)
    })
  }

  const { data, isLoading } = useSalesOrderStaging(params)
  const rows = data?.data ?? []
  const totalItems = data?.pagination.totalItems ?? 0

  // A row that already became a demand must never be pulled a second time.
  //
  // Nothing downstream enforces this: PullFromOrion does not check
  // pulled_to_demand_id, MarkStagingPulled is an unguarded UPDATE, and
  // production_demand.pd_sos_ref carries no unique index. With "not yet pulled
  // only" switched off, the list happily shows such rows — so the guard has to
  // live here, at the only point where a planner can select one.
  const isAlreadyPulled = (row: SalesOrderStaging) => row.pulledToDemandId > 0

  // Choosing a product also selects the row — a planner who bothered to pick
  // one plainly intends to pull it.
  //
  // The pick is written straight to the staging row (match_status MANUAL) so it
  // outlives the dialog and the next ETL sync; the pull then reads the product
  // off the resolved row. On failure the optimistic label is rolled back — the
  // hook has already surfaced the error as a toast — but the row stays selected
  // and remains pullable, unresolved.
  const pickProduct = async (sosId: number, pick: StagingProductPick) => {
    setPicks((prev) => new Map(prev).set(sosId, pick))
    // An already-pulled row is never auto-selected by a pick. The pick itself
    // is still allowed — correcting the product link on a pulled row is useful
    // — but it must not smuggle the row into a second pull.
    const row = rows.find((r) => r.sosId === sosId)
    if (!row || !isAlreadyPulled(row)) {
      setSelected((prev) => new Set(prev).add(sosId))
    }
    setSavingPicks((prev) => new Set(prev).add(sosId))
    try {
      await setStagingProduct.mutateAsync({ sosId, cpmProductSysId: pick.productSysId })
    } catch {
      setPicks((prev) => {
        const next = new Map(prev)
        next.delete(sosId)
        return next
      })
    } finally {
      setSavingPicks((prev) => {
        const next = new Set(prev)
        next.delete(sosId)
        return next
      })
    }
  }

  const toggleRow = (sosId: number, row: SalesOrderStaging) => {
    if (isAlreadyPulled(row)) return
    // Any hand edit invalidates the select-all summary — it described a
    // selection that no longer exists.
    setSelectAllInfo(null)
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(sosId)) next.delete(sosId)
      else next.add(sosId)
      return next
    })
  }

  // Only ever operate on rows that are actually pullable — "Select page" must
  // not quietly tick an already-pulled row, and must not stay disabled forever
  // on a page where every row is already pulled.
  const selectableRows = rows.filter((r) => !isAlreadyPulled(r))
  const alreadyPulledOnPage = rows.length - selectableRows.length

  const allOnPageSelected =
    selectableRows.length > 0 && selectableRows.every((r) => selected.has(r.sosId))

  const toggleAllOnPage = () => {
    setSelectAllInfo(null)
    setSelected((prev) => {
      const next = new Set(prev)
      if (allOnPageSelected) selectableRows.forEach((r) => next.delete(r.sosId))
      else selectableRows.forEach((r) => next.add(r.sosId))
      return next
    })
  }

  // Select every row the current filter matches — not every row on the current
  // page, and not the first 100 the display query happens to return. The ids
  // come from a dedicated ids-only endpoint that shares its WHERE clause with
  // the list query, so the count shown and the set selected cannot diverge.
  //
  // The server caps the id set; on truncation the summary below the toolbar says
  // so outright. Errors surface as a toast from the hook — a failed select-all
  // must never look like a no-op.
  const selectAllMatching = async () => {
    try {
      // Same `filters` object the list query uses, so the two stay in lockstep
      // (S-1.7) — with one deliberate deviation: `unpulledOnly` is forced true.
      //
      // The ids-only response carries ids and nothing else, so an already-pulled
      // id cannot be recognised and dropped on this side. Asking the server for
      // the unpulled subset is the only way to keep a double-pull out of the
      // selection. When the planner has the toggle switched off, that makes the
      // selection a strict subset of what is on screen — which is a divergence,
      // so the summary below says so rather than letting the count imply the
      // pulled rows came along.
      const res = await selectAllIds.mutateAsync({ ...filters, unpulledOnly: true })
      setSelected(new Set(res.sosIds))
      // The selection now *is* the current filter, by construction.
      setSelectionStale(false)
      setSelectAllInfo({
        picked: res.sosIds.length,
        totalMatched: res.totalMatched,
        limit: res.limit,
        // True when the visible list is wider than what was selectable.
        excludedPulled: !unpulledOnly,
      })
    } catch {
      // Toasted by the hook; the previous selection stands.
    }
  }

  const selectingAll = selectAllIds.isPending

  const columns: ColumnDef<SalesOrderStaging>[] = [
    {
      id: "select",
      header: "",
      width: "w-[44px]",
      cell: (row) =>
        isAlreadyPulled(row) ? (
          // Not a disabled checkbox: a greyed tick reads as "selected but
          // locked". A lock icon with a tooltip says why the row cannot be
          // chosen, which is the actual message.
          <span
            className="flex h-4 w-4 items-center justify-center text-muted-foreground"
            title="Already pulled into a demand — it cannot be pulled again."
          >
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">
              {row.contractNo} is already pulled into a demand and cannot be selected
            </span>
          </span>
        ) : (
          <Checkbox
            checked={selected.has(row.sosId)}
            onCheckedChange={() => toggleRow(row.sosId, row)}
            aria-label={`Select ${row.contractNo}`}
          />
        ),
    },
    {
      id: "contractNo",
      header: "Contract",
      sortKey: SORT_CONTRACT_NO,
      cell: (row) => (
        <span
          className="flex min-w-0 items-baseline gap-1.5"
          title={
            row.contractDate ? `${row.contractNo} · ${row.contractDate.slice(0, 10)}` : row.contractNo
          }
        >
          <span className="shrink-0 font-mono font-medium">{row.contractNo || "-"}</span>
          {isAlreadyPulled(row) ? (
            <Badge variant="secondary" className="shrink-0 text-[10px] font-normal">
              Already pulled
            </Badge>
          ) : (
            <span className="shrink-0 text-xs text-muted-foreground">
              {row.contractDate ? row.contractDate.slice(0, 10) : ""}
            </span>
          )}
        </span>
      ),
    },
    {
      id: "customer",
      header: "Customer",
      sortKey: SORT_CUSTOMER_NAME,
      hideOnMobile: true,
      cell: (row) => (
        <div
          className="min-w-0 max-w-[180px] truncate"
          title={[row.customerCode, row.customerName].filter(Boolean).join(" — ")}
        >
          {row.customerName || row.customerCode || "-"}
        </div>
      ),
    },
    {
      // Not sortable: the backend's sortColumnMap has no entry for the item
      // code, and sending one it does not know would fall back to the default
      // order while the header claimed otherwise.
      id: "item",
      header: "Item",
      cell: (row) => (
        <span
          className="flex min-w-0 max-w-[220px] items-baseline gap-1.5"
          title={[row.itemCode, row.itemDesc].filter(Boolean).join(" — ")}
        >
          <span className="shrink-0 font-mono text-xs">{row.itemCode || "-"}</span>
          <span className="min-w-0 truncate text-xs text-muted-foreground">{row.itemDesc || ""}</span>
        </span>
      ),
    },
    {
      id: "product",
      header: "Product",
      cell: (row) => (
        <StagingProductCell
          row={row}
          pick={picks.get(row.sosId)}
          saving={savingPicks.has(row.sosId)}
          onPick={pickProduct}
        />
      ),
    },
    {
      id: "qtyRemaining",
      header: "Qty Remaining",
      sortKey: SORT_QTY_REMAINING,
      cellClassName: "tabular-nums",
      // SortableHeader renders its label + indicator in a flex span, so the
      // right-alignment has to reach that span, not the cell.
      headerClassName: "text-right [&>span]:justify-end",
      cell: (row) => <div className="text-right">{fmtQty(row.qtyRemaining)}</div>,
    },
    {
      id: "deadline",
      header: "Deadline",
      sortKey: SORT_DEADLINE,
      hideOnMobile: true,
      cell: (row) => (row.deadline ? row.deadline.slice(0, 10) : "-"),
    },
  ]

  const isPulling = pullMutation.isPending
  // A planner can also overshoot by hand — "Select page" across enough pages.
  // Catch it here rather than letting proto validation reject the whole pull.
  const overBatchLimit = selected.size > MAX_PULL_BATCH

  // Selected rows on this page that could be linked by hand but have not been.
  // Informational only — never a reason to disable the pull button.
  const unlinkedSelectedCount = rows.filter(
    (r) => selected.has(r.sosId) && stagingNeedsPicker(r) && !picks.has(r.sosId)
  ).length

  const handlePull = async () => {
    if (selected.size === 0 || overBatchLimit) return
    try {
      await pullMutation.mutateAsync({
        sosIds: Array.from(selected),
        // Ignored server-side (each demand derives its month from its own
        // staging deadline) but still required to satisfy proto validation.
        month: currentMonth(),
        subType,
      })
      // No post-pull product mapping needed: each pick was already written to
      // its staging row, and PullFromOrion re-reads the row's resolved product
      // when it builds the demand.
      onOpenChange(false)
      onSuccess?.()
    } catch {
      // Toasted by usePullFromOrion; the dialog stays open with the selection
      // intact so the planner can retry without rebuilding it.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Wider and taller than the shared default: this is a bulk picker, and
          every row it cannot show is a row the planner has to scroll for.
          `max-w-[min(1160px,calc(100vw-3rem))]` keeps it inside a 1280px
          viewport with margin.

          Height is `h-[92vh]`, definite rather than a cap: under `max-h` the
          body only grew to its content's natural height and left ~37px of the
          budget unclaimed, which is a row and a bit. The table is always the
          tallest thing here, so a fixed proportion of the viewport costs
          nothing and is the difference between 12 visible rows and 16. */}
      <ScrollableDialogContent className="h-[92vh] max-h-[92vh] sm:max-w-[min(1160px,calc(100vw-3rem))]">
        <ScrollableDialogHeader className="gap-1 pt-4 pb-2.5">
          <DialogTitle>Pull from Orion</DialogTitle>
          <DialogDescription>
            Select sales orders to convert into demands. Each demand&apos;s month is derived from its own deadline.
          </DialogDescription>
        </ScrollableDialogHeader>

        {/* Toolbar — pinned with the header. Filters + selection controls must
            stay reachable while the planner scrolls a long list of rows. Every
            filter is on this one row, so the active-filter count is legible
            without opening anything (S-1.3). */}
        <div className="shrink-0 border-b bg-background px-6 py-2.5">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <DebouncedSearchInput
              value={search}
              onValueChange={(v) => applyFilterChange(() => setSearch(v))}
              placeholder="Search contract, customer, item..."
              debounceMs={300}
              className="h-8"
              containerClassName="min-w-0 flex-1 basis-full sm:basis-auto sm:max-w-[240px]"
            />
            <CustomerCombobox
              value={customer?.id}
              valueCode={customer?.code}
              onChange={(id, code) => applyFilterChange(() => setCustomer({ id, code }))}
              placeholder="Any customer…"
              className="h-8 w-[190px] text-xs"
            />
            {customer && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                aria-label="Clear customer filter"
                onClick={() => applyFilterChange(() => setCustomer(null))}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
            <ItemCodeCombobox
              value={itemCode}
              onChange={(code) => applyFilterChange(() => setItemCode(code))}
              className="h-8 w-[170px] text-xs"
            />
            <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
              <Switch
                checked={unpulledOnly}
                onCheckedChange={(v) => applyFilterChange(() => setUnpulledOnly(v))}
                aria-label="Show only orders not yet pulled"
              />
              Not yet pulled only
            </label>
            {activeFilterCount > 0 && (
              <>
                <Badge variant="secondary" className="shrink-0 text-xs font-normal">
                  {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={clearFilters}
                >
                  Clear filters
                </Button>
              </>
            )}
            <div className="ml-auto flex min-w-0 flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleAllOnPage}
                disabled={selectableRows.length === 0}
              >
                {allOnPageSelected ? "Deselect page" : "Select page"}
              </Button>
              {/* No count in the label. The server caps how many ids a single
                  select-all may return, and that cap is not known here until the
                  call comes back — promising "all 651" up front would be a claim
                  the action cannot honor. The exact figure is reported below,
                  after the fact. */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectAllMatching}
                disabled={totalItems === 0 || selectingAll}
              >
                {selectingAll && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Select all matching
              </Button>
              {selected.size > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelected(new Set())
                    setSelectAllInfo(null)
                    setSelectionStale(false)
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
          {/* Explains the lock icons on this page without the planner having to
              hover one to find out. Only shown when there are any. */}
          {alreadyPulledOnPage > 0 && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {alreadyPulledOnPage} row{alreadyPulledOnPage > 1 ? "s" : ""} on this page{" "}
              {alreadyPulledOnPage > 1 ? "have" : "has"}{" "}
              already been pulled into a demand and cannot be selected. Switch &ldquo;Not yet pulled
              only&rdquo; back on to hide them.
            </p>
          )}
          {selectAllInfo && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {selectAllInfo.totalMatched > selectAllInfo.picked ? (
                <>
                  Selected the {selectAllInfo.picked.toLocaleString()} most urgent of{" "}
                  {selectAllInfo.totalMatched.toLocaleString()} matching orders — one pull carries at
                  most {selectAllInfo.limit.toLocaleString()}. Pull these, then select again for the
                  rest.
                </>
              ) : (
                <>Selected all {selectAllInfo.picked.toLocaleString()} matching orders.</>
              )}
              {/* The visible list included already-pulled rows; the selection
                  could not. Say it, rather than letting the count imply they
                  came along. */}
              {selectAllInfo.excludedPulled && (
                <> Rows already pulled into a demand were left out — they cannot be pulled again.</>
              )}
            </p>
          )}
          {/* Sorting and filtering keep the selection rather than dropping it —
              but a kept selection that is no longer all on screen is exactly the
              silent divergence S-1.6 forbids, so say so plainly.

              The closing reassurance is conditional: over the batch limit the
              pull is blocked outright, so promising "all of them will be pulled"
              would be flatly false. The footer already states the limit and what
              to do about it, so here the sentence simply stops early. */}
          {selectionStale && selected.size > 0 && !selectAllInfo && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Your {selected.size.toLocaleString()} selected row
              {selected.size > 1 ? "s are" : " is"} kept across sorting and filtering — some may not
              be visible here.{!overBatchLimit && " All of them will be pulled."}
            </p>
          )}
        </div>

        {/* The only scrolling region — rows alone. */}
        <ScrollableDialogBody className="py-1">
          <DataTable
            data={rows}
            columns={columns}
            keyField="sosId"
            isLoading={isLoading}
            skeletonRowCount={12}
            dense
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            emptyMessage="No available sales orders"
            emptyDescription={
              activeFilterCount > 0
                ? "No synced order matches these filters. Clear one and try again."
                : "All synced orders have already been pulled."
            }
          />
        </ScrollableDialogBody>

        {/* Pagination — pinned with the footer. */}
        <div className="shrink-0 border-t bg-background px-6 py-2">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-2">
            <div className="flex shrink-0 items-center gap-2">
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                {totalItems.toLocaleString()} order{totalItems === 1 ? "" : "s"}
                {activeFilterCount > 0 && " matching"}
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">Rows per page</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v))
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-8 w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1))
                  if (selected.size > 0) setSelectionStale(true)
                }}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span className="whitespace-nowrap text-sm text-muted-foreground">
                Page {data?.pagination.currentPage ?? page} of {data?.pagination.totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPage((p) => p + 1)
                  if (selected.size > 0) setSelectionStale(true)
                }}
                disabled={(data?.pagination.totalPages ?? 1) <= page}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        {/* Footer is two stacked rows, not one. Helper/status text lives on its
            own full-width row so it can never change the height of the control
            row — that is what left the field and the Pull button visually
            ragged. The control row then bottom-aligns (`items-end`), so the
            select and the button share a baseline whatever text sits above. */}
        <ScrollableDialogFooter className="flex-col items-stretch gap-2 py-3 sm:flex-col sm:items-stretch sm:justify-start">
          {overBatchLimit && (
            <p className="text-xs text-destructive">
              {selected.size.toLocaleString()} rows selected — one pull carries at most{" "}
              {MAX_PULL_BATCH.toLocaleString()}. Deselect some rows and pull the rest afterwards.
            </p>
          )}
          {unlinkedSelectedCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {unlinkedSelectedCount} selected row(s) have no product yet — they still pull and can
              be linked later.
            </p>
          )}
          {/* Label sits beside the select rather than above it. Stacked, the
              pair was the tallest thing in the footer and cost a table row —
              a poor trade for a two-word label on a single control. */}
          <div className="flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <Label className="shrink-0 whitespace-nowrap text-xs">
                Set sub type on pulled demands
              </Label>
              <Select value={String(subType)} onValueChange={(v) => setSubType(Number(v) as DemandSubType)}>
                <SelectTrigger className="h-8 w-full sm:w-[170px]">
                  <SelectValue placeholder="Sub type" />
                </SelectTrigger>
                <SelectContent>
                  {DEMAND_SUB_TYPE_OPTIONS.filter(
                    (o) => o.value !== DemandSubType.DEMAND_SUB_TYPE_UNSPECIFIED
                  ).map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="shrink-0 whitespace-nowrap"
              onClick={handlePull}
              disabled={selected.size === 0 || isPulling || overBatchLimit}
            >
              {isPulling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Pull {selected.size} selected
            </Button>
          </div>
        </ScrollableDialogFooter>
      </ScrollableDialogContent>
    </Dialog>
  )
}
