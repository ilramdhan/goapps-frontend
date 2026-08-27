"use client"

// P11 E1 — MB Cost tab on the MB Recipe detail page.
//
// ⛔ No new endpoint. This reuses exactly two endpoints that already exist:
//   • GET /api/v1/finance/cost-results/{id}/history   (useCostHistory)
//   • GET /api/v1/finance/cost-results/{id}/{period}/{calcType}/breakdown
//     (useCostBreakdown)
// and renders them through the SummaryTab / RmTab components extracted in
// [G.6], so the numbers here are the same numbers the cost-breakdown drawer
// shows for the same productSysId — one renderer, no second implementation.
//
// D13 (absent vs zero): `costProductId` may be absent. proto3 int64 arrives as
// 0 when unset, and there is no product with sys id 0, so 0 IS the absent
// marker here. We surface an honest empty state instead of coercing it with
// `?? 0` and fetching a bogus product.
//
// ⭐ DIPERBARUI 2026-08-26 — stale-cost warning (bagian a dari keputusan opsi b+a).
// Field pembanding yang tersedia diperiksa dulu sebelum menulis kode ini (lihat
// investigasi di mb_autogen_repository.go / mb_composition_repository.go /
// mbhead/entity.go, semuanya READ-ONLY, tidak diubah):
//   • `mst_mb_composition.updated_at` TIDAK bisa dipakai sendirian: Delete() hanya
//     men-set deleted_at, tidak menyentuh updated_at, dan baris yang dihapus hilang
//     dari daftar aktif — jadi perbandingan "updatedAt komposisi terbaru vs
//     costGeneratedAt" akan MELEWATKAN kasus penghapusan baris RM murni.
//   • `mbh_updated_at` (Audit.updatedAt di MBHead) hanya berubah saat identity form
//     (MBRecipeFormDialog) disimpan — TIDAK bergerak saat komposisi diedit sama
//     sekali (MBCompositionRepository.Create/Update/Delete tidak pernah menulis ke
//     mst_mb_head). Jadi field ini juga tidak bisa dipakai sendirian.
//   • Yang TERBUKTI dan LENGKAP dari membaca kode: cost (`cost_route_rm`) HANYA
//     diregenerasi persis di transaksi transisi ke VALIDATED
//     (TransitionWithAutoGen → regenerateCostProductRMs), dan baris komposisi HANYA
//     bisa diedit saat entryStatus === "DRAFT" (gate yang sama dipakai
//     mb-composition-tab.tsx). Maka selama entryStatus !== "VALIDATED", resep sudah
//     keluar dari snapshot yang menghasilkan angka cost yang sedang tampil, dan
//     mungkin sudah berubah sejak itu — sinyal ini TIDAK PUNYA false negative
//     (termasuk kasus penghapusan baris, karena tidak mungkin balik ke DRAFT tanpa
//     lewat alur unlock).
// Peringatan karena itu memakai `entryStatus !== "VALIDATED"` (plus cost sudah
// pernah dihasilkan), dengan kalimat yang di-hedge ("mungkin belum mencerminkan")
// karena sinyal ini bisa saja tampil sesaat setelah unlock sebelum ada perubahan
// nyata — jujur, tidak menuduh.

import { useState } from "react"
import Link from "next/link"
import { AlertTriangle } from "lucide-react"

import { EmptyState } from "@/components/common/empty-state"
import { UserName } from "@/components/common/user-name"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { RmTab, SummaryTab } from "@/components/finance/cost-results/breakdown"
import { calcTypeLabel, formatDate } from "@/components/finance/cost-results/format"
import { useCostBreakdown, useCostHistory } from "@/hooks/finance/use-cost-calc"
import type { CalculationType } from "@/types/finance/cost-calc"

interface Props {
  /** Generated cost-product sys id. Absent (undefined or 0) = no cost yet. */
  costProductId: number | undefined
  costGeneratedAt: string | undefined
  costGeneratedBy: string | undefined
  /**
   * Parent MB Head workflow state (`mbHead.entryStatus`, proto `string`) — drives the
   * stale-cost warning below. Typed as `string` (not the narrower `MBHeadEntryStatus`
   * union) to match the proto-generated `MBHead.entryStatus` field it is always fed
   * from, exactly like the rest of this codebase compares it (e.g.
   * `mbHead.entryStatus === "DRAFT"` in detail-client.tsx).
   */
  entryStatus: string | undefined
}

/**
 * True only when a cost product already exists AND the recipe has moved out of
 * VALIDATED — see the file-header note above for why this is the one fully-reliable
 * signal (no false negatives) rather than a guessed heuristic.
 */
export function isMbCostPossiblyStale(hasCostProduct: boolean, entryStatus: string | undefined): boolean {
  return hasCostProduct && entryStatus !== "VALIDATED"
}

/** Shared warning-notice content, reused by MbCostTab and MbTraceabilityTab. */
export function MbCostStaleWarning() {
  return (
    <div
      className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400"
      data-testid="mb-cost-stale-warning"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
      <span>
        Resep ini sedang tidak berstatus Divalidasi. Angka cost di bawah adalah hasil
        perhitungan terakhir dari versi resep yang tervalidasi sebelumnya, dan mungkin
        belum mencerminkan perubahan yang dibuat pada resep sejak saat itu.
      </span>
    </div>
  )
}

/** Absent stays absent — 0 is proto3's "unset" for int64, never a real sys id. */
export function resolveCostProductId(raw: number | undefined): number | undefined {
  if (raw === undefined || raw === null) return undefined
  if (!Number.isFinite(raw) || raw <= 0) return undefined
  return raw
}

export function MbCostTab({ costProductId, costGeneratedAt, costGeneratedBy, entryStatus }: Props) {
  const productSysId = resolveCostProductId(costProductId)
  const [selected, setSelected] = useState<string | null>(null)

  const { data: history, isLoading: historyLoading } = useCostHistory(productSysId, {
    page: 1,
    pageSize: 50,
  })

  if (productSysId === undefined) {
    return (
      <div data-testid="mb-cost-tab-empty">
        <EmptyState
          title="No MB cost generated yet"
          description="This recipe has no cost product. Cost is produced once the recipe is validated and a costing run has pushed a result."
        />
      </div>
    )
  }

  if (historyLoading) {
    return (
      <div className="space-y-4" data-testid="mb-cost-tab-loading">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    )
  }

  const rows = history?.items ?? []
  if (rows.length === 0) {
    return (
      <div data-testid="mb-cost-tab-empty">
        <EmptyState
          title="No cost results for this MB product"
          description={`Cost product #${productSysId} exists but has no calculated cost rows yet.`}
        />
      </div>
    )
  }

  // Options are (period, calcType) pairs that actually exist for this product.
  const options = Array.from(
    new Map(
      rows.map((r) => [`${r.period}|${r.calculationType}`, { period: r.period, calcType: r.calculationType }]),
    ).values(),
  )
  const activeKey = selected ?? `${options[0].period}|${options[0].calcType}`
  const active = options.find((o) => `${o.period}|${o.calcType}` === activeKey) ?? options[0]

  const isStale = isMbCostPossiblyStale(true, entryStatus)

  return (
    <div className="space-y-4" data-testid="mb-cost-tab">
      {isStale && <MbCostStaleWarning />}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={activeKey} onValueChange={setSelected}>
          <SelectTrigger className="w-[280px]" aria-label="Period and cost type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={`${o.period}|${o.calcType}`} value={`${o.period}|${o.calcType}`}>
                {o.period} · {calcTypeLabel(o.calcType)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button asChild variant="outline" size="sm">
          <Link href={`/finance/cost-results/${productSysId}/${active.period}/${active.calcType}`}>
            Open full cost result
          </Link>
        </Button>
        <div className="text-xs text-muted-foreground">
          {/* D13: absent generation metadata renders as an em dash, not as a fake date. */}
          Generated {formatDate(costGeneratedAt ?? null)}
          {costGeneratedBy ? (
            <>
              {" by "}
              <UserName userId={costGeneratedBy} compact />
            </>
          ) : null}
        </div>
      </div>

      <MbCostBreakdown
        productSysId={productSysId}
        period={active.period}
        calcType={active.calcType as CalculationType}
      />
    </div>
  )
}

function MbCostBreakdown({
  productSysId,
  period,
  calcType,
}: {
  productSysId: number
  period: string
  calcType: CalculationType
}) {
  const { data: breakdown, isLoading } = useCostBreakdown(productSysId, period, calcType)

  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-lg" data-testid="mb-cost-breakdown-loading" />
  }
  if (!breakdown) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="mb-cost-breakdown-empty">
        No breakdown available for {period} · {calcTypeLabel(calcType)}.
      </p>
    )
  }

  return (
    <div className="space-y-6" data-testid="mb-cost-breakdown">
      <SummaryTab breakdown={breakdown} productSysId={productSysId} />
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          RM breakdown
          <span className="ml-2 font-normal normal-case">{breakdown.rmDetails.length} rows</span>
        </h3>
        <RmTab rows={breakdown.rmDetails} />
      </div>
    </div>
  )
}
