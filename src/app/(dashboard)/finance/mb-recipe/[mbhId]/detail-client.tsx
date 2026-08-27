"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Beaker, Lock, Pencil, Unlock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/common/page-header"
import { StatusBadge } from "@/components/common/status-badge"
import { UserName } from "@/components/common/user-name"
import { useBreadcrumbOverride } from "@/components/common/dynamic-breadcrumb"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState } from "@/components/common/empty-state"
import { useMBHead } from "@/hooks/finance/use-mb-head"
import { useMbCompositions } from "@/hooks/finance/use-mb-composition"
import { sumMbCompositionPct } from "@/lib/finance/mb-composition-total"
import {
  MbCompositionTab,
  MbParametersTab,
  MbWorkflowLogTab,
  MbRecipeActionBar,
  MbCostTab,
  MbTraceabilityTab,
  MBRecipeFormDialog,
} from "@/components/finance/mb-recipe"

interface Props {
  mbhId: string
}

export default function MbRecipeDetailClient({ mbhId }: Props) {
  const { data, isLoading } = useMBHead(mbhId)
  const mbHead = data?.data
  // [R22] Fetched here (not inside MbRecipeActionBar) so the action bar stays a
  // pure prop-driven component; MbCompositionTab's own useMbCompositions call
  // shares this same TanStack Query cache entry, so this is not an extra
  // network round trip in practice.
  const { data: compositions } = useMbCompositions(mbHead?.mbhId ?? "")
  const compositionTotalPct = useMemo(() => sumMbCompositionPct(compositions ?? []), [compositions])
  // R19 Bagian B: identity is editable only while the recipe is still DRAFT —
  // mirrors the composition tab's existing `entryStatus === "DRAFT"` gate
  // (mb-composition-tab.tsx). Once submitted/approved this button disappears;
  // MbRecipeActionBar's Request Unlock flow is the only path back to editing.
  const [editOpen, setEditOpen] = useState(false)

  useBreadcrumbOverride(mbHead ? mbHead.devCode || mbHead.mbhMbCosting || null : null)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Loading…" />
      </div>
    )
  }

  if (!mbHead) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/finance/mb-recipe">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to MB Recipe list
          </Link>
        </Button>
        <EmptyState title="MB Recipe not found" description="The requested MB Head does not exist." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/finance/mb-recipe">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to MB Recipe list
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title={`${mbHead.devCode || mbHead.mbhMbCosting} — ${mbHead.shadeName || mbHead.shadeCode || ""}`}
          subtitle={`Version ${mbHead.currentVersion}`}
        />
        <div className="flex flex-wrap items-center gap-2">
          {/*
            P7: read-only LDR calculator. It computes and hands the number back to the
            user; it never writes. Deliberately NOT seeded with defaultLdr from
            mbhDozing — D30 retired that column as contaminated (it mixes LDR ~3.55
            with oil dozing rate ~0.03), so seeding from it would prefill a wrong
            number. D13: absent stays absent rather than guessing a default.
            ⭐ DIPERBARUI 2026-08-26 — tombol ini dipindahkan ke MB Spin per keputusan
            user (kalkulator dozing hanya boleh ada di satu tempat). Alasan D30/D13 di
            atas TETAP BERLAKU di lokasi barunya — jangan pernah seed dari mbhDozing
            di sana juga. Komponen MBDozingCalculatorDialog TIDAK dihapus; ia sekarang
            hanya dipakai oleh MB Spin (lihat mb-spin-form-dialog.tsx).
          */}
          {mbHead.entryStatus === "DRAFT" && (
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
          <MbRecipeActionBar mbHead={mbHead} compositionTotalPct={compositionTotalPct} />
        </div>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Beaker className="h-4 w-4" />
            Identity
            <StatusBadge status={mbHead.entryStatus} type="mbhead" size="sm" />
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Field label="Dev Code" value={mbHead.devCode || "—"} mono />
          <Field label="Shade Code" value={mbHead.shadeCode || "—"} mono />
          <Field label="Shade Name" value={mbHead.shadeName || "—"} />
          <Field label="MB Costing" value={mbHead.mbhMbCosting || "—"} mono />
          <Field label="Cross Section" value={mbHead.crossSection || "—"} />
          <Field label="Lusture Code" value={mbHead.lustureCode || "—"} mono />
          <Field label="Bought-out" value={mbHead.isBoughtout ? "Yes" : "No"} />
          {mbHead.stateReason && (
            <div className="col-span-full">
              <Field label="State Reason" value={mbHead.stateReason} />
            </div>
          )}
        </CardContent>
      </Card>

      {/*
        P10 unlock trace. Rendered ONLY from fields the detail API actually returns:
        `mbhIsLocked`, `mbhUnlockRequestedAt`, `mbhUnlockRequestedBy` and — since the
        proto change — `mbhUnlockReason` (yarn_master.proto field 45, mapped from
        mbh_unlock_reason). Together they answer WHO, WHEN and WHY, which is exactly what
        the approver needs before deciding.
        ⛔ The reason is NEVER sourced from `stateReason`: U-2 keeps that field pointing at
        the PREVIOUS workflow step's reason, so it would display the wrong text.
        Absent-vs-empty: the reason row is rendered only when an unlock request is actually
        on record (requestedBy/requestedAt present). No request → no row at all. Request on
        record but the reason blank/absent → an explicit "Not recorded" placeholder, so a
        missing value can never be misread as "the requester gave no reason".
      */}
      {(mbHead.mbhIsLocked || mbHead.mbhUnlockRequestedAt || mbHead.mbhUnlockRequestedBy) && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              {mbHead.mbhIsLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              Lock &amp; unlock
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Field label="Locked" value={mbHead.mbhIsLocked ? "Yes" : "No"} />
            {mbHead.mbhUnlockRequestedBy && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Unlock requested by
                </div>
                <div className="text-sm">
                  <UserName userId={mbHead.mbhUnlockRequestedBy} compact />
                </div>
              </div>
            )}
            {mbHead.mbhUnlockRequestedAt && (
              <Field
                label="Unlock requested at"
                value={new Date(mbHead.mbhUnlockRequestedAt).toLocaleString()}
              />
            )}
            {/*
              WHY. Gated on there BEING a request (requestedBy/requestedAt), not on the
              reason string itself — otherwise an empty reason would silently vanish and
              read as "no unlock request", which is a different fact entirely.
            */}
            {(mbHead.mbhUnlockRequestedBy || mbHead.mbhUnlockRequestedAt) && (
              <div className="col-span-full">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Unlock reason
                </div>
                {mbHead.mbhUnlockReason && mbHead.mbhUnlockReason.trim() ? (
                  <div className="text-sm whitespace-pre-wrap">{mbHead.mbhUnlockReason}</div>
                ) : (
                  <div className="text-sm italic text-muted-foreground">Not recorded</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="composition">
        <TabsList>
          <TabsTrigger value="composition">Composition</TabsTrigger>
          <TabsTrigger value="parameters">Parameters</TabsTrigger>
          {/* P11 E1: MB Cost + Traceability. Both reuse existing cost endpoints. */}
          <TabsTrigger value="mb-cost">MB Cost</TabsTrigger>
          <TabsTrigger value="traceability">Traceability</TabsTrigger>
          <TabsTrigger value="workflow-log">Workflow log</TabsTrigger>
        </TabsList>
        <TabsContent value="composition" className="mt-4">
          <MbCompositionTab mbhId={mbHead.mbhId} entryStatus={mbHead.entryStatus} />
        </TabsContent>
        <TabsContent value="parameters" className="mt-4">
          <MbParametersTab mbHead={mbHead} />
        </TabsContent>
        {/*
          P11 E1 / D13: costProductId is passed through UNCOERCED. proto3 gives
          0 for an unset int64 and there is no product #0, so the tab treats
          both undefined and 0 as absent and renders an honest empty state —
          never `?? 0`, which would fetch a nonexistent product and show zeros
          as if they were real cost.
        */}
        <TabsContent value="mb-cost" className="mt-4">
          <MbCostTab
            costProductId={mbHead.costProductId}
            costGeneratedAt={mbHead.costGeneratedAt}
            costGeneratedBy={mbHead.costGeneratedBy}
            entryStatus={mbHead.entryStatus}
          />
        </TabsContent>
        <TabsContent value="traceability" className="mt-4">
          <MbTraceabilityTab
            mbhId={mbHead.mbhId}
            costProductId={mbHead.costProductId}
            costGeneratedAt={mbHead.costGeneratedAt}
            costGeneratedBy={mbHead.costGeneratedBy}
            entryStatus={mbHead.entryStatus}
          />
        </TabsContent>
        <TabsContent value="workflow-log" className="mt-4">
          <MbWorkflowLogTab mbhId={mbHead.mbhId} />
        </TabsContent>
      </Tabs>

      <MBRecipeFormDialog open={editOpen} onOpenChange={setEditOpen} mbHead={mbHead} />
    </div>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={mono ? "font-mono text-sm" : "text-sm"}>{value}</div>
    </div>
  )
}
