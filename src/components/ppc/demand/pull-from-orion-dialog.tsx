"use client"

import { useMemo, useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import {
  ScrollableDialogContent,
  ScrollableDialogHeader,
  ScrollableDialogBody,
  ScrollableDialogFooter,
} from "@/components/common/scrollable-dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTable, type ColumnDef } from "@/components/shared"
import { DebouncedSearchInput } from "@/components/common"

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

function fmtQty(value: string): string {
  const n = Number(value)
  return Number.isFinite(n) ? n.toLocaleString() : value || "-"
}

export function PullFromOrionDialog({ open, onOpenChange, onSuccess }: PullFromOrionDialogProps) {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [subType, setSubType] = useState<DemandSubType>(DemandSubType.DEMAND_SUB_TYPE_LOCAL)
  // Outcome of the last "select all matching", kept so the UI can state what it
  // actually selected rather than what the filter matched. The server caps the
  // id set (a pull can only carry so many rows), and when it does, `totalMatched`
  // exceeds `picked` — that difference must be visible, never rounded away.
  const [selectAllInfo, setSelectAllInfo] = useState<{
    picked: number
    totalMatched: number
    limit: number
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
    setPageSize(10)
    setSelected(new Set())
    setSelectAllInfo(null)
    setPicks(new Map())
    setSavingPicks(new Set())
    setSubType(DemandSubType.DEMAND_SUB_TYPE_LOCAL)
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  const params: ListSalesOrderStagingParams = useMemo(
    () => ({ page, pageSize, search, unpulledOnly: true }),
    [page, pageSize, search]
  )

  const { data, isLoading } = useSalesOrderStaging(params)
  const rows = data?.data ?? []
  const totalItems = data?.pagination.totalItems ?? 0

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
    setSelected((prev) => new Set(prev).add(sosId))
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

  const toggleRow = (sosId: number) => {
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

  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.sosId))

  const toggleAllOnPage = () => {
    setSelectAllInfo(null)
    setSelected((prev) => {
      const next = new Set(prev)
      if (allOnPageSelected) rows.forEach((r) => next.delete(r.sosId))
      else rows.forEach((r) => next.add(r.sosId))
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
      const res = await selectAllIds.mutateAsync({ search, unpulledOnly: true })
      setSelected(new Set(res.sosIds))
      setSelectAllInfo({
        picked: res.sosIds.length,
        totalMatched: res.totalMatched,
        limit: res.limit,
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
      cell: (row) => (
        <Checkbox
          checked={selected.has(row.sosId)}
          onCheckedChange={() => toggleRow(row.sosId)}
          aria-label={`Select ${row.contractNo}`}
        />
      ),
    },
    {
      id: "contractNo",
      header: "Contract",
      cell: (row) => (
        <div className="min-w-0">
          <div className="font-medium font-mono">{row.contractNo || "-"}</div>
          <div className="text-xs text-muted-foreground">
            {row.contractDate ? row.contractDate.slice(0, 10) : "-"}
          </div>
        </div>
      ),
    },
    {
      id: "customer",
      header: "Customer",
      hideOnMobile: true,
      cell: (row) => (
        <div className="min-w-0 max-w-[180px] truncate">
          {row.customerName || row.customerCode || "-"}
        </div>
      ),
    },
    {
      id: "item",
      header: "Item",
      cell: (row) => (
        <div className="min-w-0">
          <div className="font-mono text-sm">{row.itemCode || "-"}</div>
          <div className="max-w-[200px] truncate text-xs text-muted-foreground">
            {row.itemDesc || "-"}
          </div>
        </div>
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
      cellClassName: "tabular-nums",
      cell: (row) => fmtQty(row.qtyRemaining),
    },
    {
      id: "deadline",
      header: "Deadline",
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
      <ScrollableDialogContent className="sm:max-w-3xl">
        <ScrollableDialogHeader>
          <DialogTitle>Pull from Orion</DialogTitle>
          <DialogDescription>
            Select sales orders to convert into demands. Each demand&apos;s month is derived from its own deadline.
          </DialogDescription>
        </ScrollableDialogHeader>

        {/* Toolbar — pinned with the header. Search + selection controls must
            stay reachable while the planner scrolls a long list of rows. */}
        <div className="shrink-0 border-b bg-background px-6 py-3">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <DebouncedSearchInput
              value={search}
              onValueChange={(v) => {
                setSearch(v)
                setPage(1)
                setSelectAllInfo(null)
              }}
              placeholder="Search contract, customer, item..."
              debounceMs={300}
              containerClassName="min-w-0 flex-1 basis-full sm:basis-auto sm:max-w-sm"
            />
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleAllOnPage}
                disabled={rows.length === 0}
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
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
          {selectAllInfo && (
            <p className="mt-2 text-xs text-muted-foreground">
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
            </p>
          )}
        </div>

        {/* The only scrolling region — rows alone. */}
        <ScrollableDialogBody className="py-3">
          <DataTable
            data={rows}
            columns={columns}
            keyField="sosId"
            isLoading={isLoading}
            emptyMessage="No available sales orders"
            emptyDescription="All synced orders have already been pulled, or none match your search."
          />
        </ScrollableDialogBody>

        {/* Pagination — pinned with the footer. */}
        <div className="shrink-0 border-t bg-background px-6 py-3">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-3">
            <div className="flex shrink-0 items-center gap-2">
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
                onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                onClick={() => setPage((p) => p + 1)}
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
        <ScrollableDialogFooter className="flex-col items-stretch gap-2 sm:flex-col sm:items-stretch sm:justify-start">
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
          <div className="flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 flex-col gap-1">
              <Label className="text-xs">Set Sub Type On Pulled Demands</Label>
              <Select value={String(subType)} onValueChange={(v) => setSubType(Number(v) as DemandSubType)}>
                <SelectTrigger className="w-full sm:w-[170px]">
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
