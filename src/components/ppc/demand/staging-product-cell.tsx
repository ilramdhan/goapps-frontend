"use client"

// StagingProductCell renders the finance product resolution of one
// sales-order-staging row inside the Pull-from-Orion dialog.
//
// The backend resolves (item_code, shade_code) → cost product master after every
// ETL sync and lazily on list. Rows it could not resolve uniquely get an inline
// picker so the planner can choose. The picker is a convenience, never a gate:
// a row with no product still pulls and is linked later.
//
// A pick is persisted onto the staging row itself (SetStagingProduct → MANUAL),
// so it survives the session and the next ETL sync does not ask again.

import { CheckCircle2, HelpCircle, Loader2, SearchX } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { ProductCombobox } from "@/components/ppc/comboboxes"
import type { SalesOrderStaging } from "@/types/ppc/master"

/** sos_match_status values, mirroring the chk_sos_match_status CHECK constraint. */
export const StagingMatchStatus = {
  Unresolved: "UNRESOLVED",
  Auto: "AUTO",
  Ambiguous: "AMBIGUOUS",
  NotFound: "NOT_FOUND",
  Manual: "MANUAL",
} as const

/** A planner's manual product pick for a staging row. */
export interface StagingProductPick {
  productSysId: number
  productCode: string
  productName: string
}

interface StagingProductCellProps {
  row: SalesOrderStaging
  /**
   * Pick made in this dialog session, shown immediately while the persist
   * round-trip and the staging-list refetch are still in flight.
   */
  pick?: StagingProductPick
  /** True while this row's pick is being written to the staging row. */
  saving?: boolean
  onPick: (sosId: number, pick: StagingProductPick) => void
}

/** True when the row needs a planner to choose the product by hand. */
export function stagingNeedsPicker(row: SalesOrderStaging): boolean {
  return (
    row.cpmProductSysId <= 0 &&
    (row.matchStatus === StagingMatchStatus.Ambiguous ||
      row.matchStatus === StagingMatchStatus.NotFound)
  )
}

function ProductLabel({ code, name }: { code: string; name: string }) {
  // One line: code prominent, name trailing and truncated. The full pair is on
  // the native tooltip so nothing is lost to the truncation — the dialog's
  // density target (>=12 rows at 1280x800) does not survive a three-line cell.
  return (
    <span
      className="flex min-w-0 max-w-[260px] items-baseline gap-1.5"
      title={[code, name].filter(Boolean).join(" — ") || undefined}
    >
      {code && <span className="shrink-0 font-mono text-xs">{code}</span>}
      <span className="min-w-0 truncate text-xs text-muted-foreground">
        {name || <span className="italic">Product name unavailable</span>}
      </span>
    </span>
  )
}

/** Short badge label for an unresolved row. */
function unresolvedBadgeLabel(row: SalesOrderStaging): string {
  if (row.matchStatus !== StagingMatchStatus.Ambiguous) {
    return "No match"
  }
  return row.matchCount > 1 ? `${row.matchCount} matches` : "Several matches"
}

/**
 * Why a row could not be resolved, in the planner's terms. AMBIGUOUS names the
 * number of finance products that matched, so the planner can tell "the master
 * has duplicates" apart from "the master has nothing".
 */
function unresolvedReason(row: SalesOrderStaging): string {
  if (row.matchStatus === StagingMatchStatus.Ambiguous) {
    return row.matchCount > 1
      ? `${row.matchCount} products matched ${row.itemCode}`
      : `Several products matched ${row.itemCode}`
  }
  return `No finance product matches ${row.itemCode}`
}

export function StagingProductCell({
  row,
  pick,
  saving,
  onPick,
}: StagingProductCellProps) {
  // A pick made in this session wins over whatever the server last resolved —
  // the refetch that confirms it lands a moment later.
  if (pick) {
    return (
      <div className="flex min-w-0 items-center gap-1.5">
        <Badge
          variant="outline"
          className="shrink-0 bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400"
        >
          {saving ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <CheckCircle2 aria-hidden="true" />
          )}
          {saving ? "Linking…" : "Linked"}
        </Badge>
        <ProductLabel code={pick.productCode} name={pick.productName} />
      </div>
    )
  }

  if (row.cpmProductSysId > 0) {
    const auto = row.matchStatus === StagingMatchStatus.Auto
    return (
      <div className="flex min-w-0 items-center gap-1.5">
        <Badge
          variant="outline"
          className="shrink-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
        >
          <CheckCircle2 aria-hidden="true" />
          {auto ? "Auto-matched" : "Linked"}
        </Badge>
        <ProductLabel code={row.cpmProductCode} name={row.cpmProductName} />
      </div>
    )
  }

  if (stagingNeedsPicker(row)) {
    const ambiguous = row.matchStatus === StagingMatchStatus.Ambiguous
    // Badge + picker share one line. The "why" moves onto the badge's tooltip
    // rather than a third line — it explains a state the badge already names,
    // and the picker is what the planner is here to use.
    return (
      <div className="flex min-w-[240px] items-center gap-1.5">
        <Badge
          variant="outline"
          title={unresolvedReason(row)}
          className="shrink-0 bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
        >
          {ambiguous ? (
            <HelpCircle aria-hidden="true" />
          ) : (
            <SearchX aria-hidden="true" />
          )}
          {unresolvedBadgeLabel(row)}
        </Badge>
        <ProductCombobox
          value={undefined}
          onChange={(productSysId, productCode, productName) =>
            onPick(row.sosId, { productSysId, productCode, productName })
          }
          placeholder="Choose product…"
          className="h-7 min-w-0 flex-1 text-xs"
        />
      </div>
    )
  }

  // Not yet resolved (a row the resolver has not reached, or one the planner
  // deferred): name it by its Orion item code rather than leaving it blank.
  return (
    <span
      className="flex min-w-0 items-baseline gap-1.5"
      title={`${row.itemCode} — not resolved yet`}
    >
      <span className="shrink-0 font-mono text-xs">{row.itemCode}</span>
      <span className="truncate text-xs text-muted-foreground">Will link later</span>
    </span>
  )
}
