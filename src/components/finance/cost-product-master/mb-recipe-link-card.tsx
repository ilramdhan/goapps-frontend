"use client"

// ⭐ DIPERBARUI 2026-08-26 (R16) — Surfaces the MB Recipe (MBHead) / MB Spin linkage on the
// product detail page. Previously this link existed only in the reverse direction
// (MBHead.costProductId → CostProductMaster) and was never shown here at all.
//
// Design choice — Card, not a Tab: the rest of this page uses a standalone "Identity" Card
// for at-a-glance facts and reserves the Tabs block for drill-down content (Parameters,
// Routing, Cost history, Audit) that has its own filters/pagination. The MB linkage is a
// single small at-a-glance fact set (a handful of fields per head, plus a short spin list),
// not a section a user would filter/paginate/interact with — so it fits the Identity-Card
// pattern, rendered as its own Card directly under Identity, rather than adding a fifth tab.
//
// Honesty about the DRAFT/NULL trap (per orchestrator direction): `mbh_cost_product_id` is
// only populated once a head transitions to VALIDATED (see mb_autogen_repository.go:391).
// So when `source === "MB_RECIPE"` but the reverse lookup returns zero heads, we do NOT say
// "no MB recipe" — we say the link could not be confirmed yet (most likely: the recipe
// exists but hasn't been validated). This is deliberately different wording from "not
// linked to MB" (which is what happens implicitly when `source !== "MB_RECIPE"` and this
// component renders nothing at all).
//
// MB Spin: resolved transitively from the found MB Head via the existing `mbhId` filter on
// ListMBSpinsRequest — no new proto field needed for spins. No deep link is rendered for
// individual spins: there is no MB Spin detail route (only a list page at
// /finance/yarn-master/mb-spins), and that list page's own useUrlState defaultFilters do
// NOT track `mbhId` in the URL — linking to `?mbhId=...` there would silently do nothing,
// so per the "never create a dead link" rule this renders as plain text instead.

import Link from "next/link"
import { Beaker, ExternalLink, HelpCircle } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/common/status-badge"
import { useMBHeads } from "@/hooks/finance/use-mb-head"
import { useMBSpins } from "@/hooks/finance/use-mb-spin"

interface Props {
  productSysId: number
  source: string
}

// The `create-crud-hooks` factory's useList has no `enabled` option, so the only clean way
// to avoid firing an unfiltered "list all MB heads"/"list all MB spins" query on every
// non-MB product page is to not mount this component (and its hooks) at all unless
// `source === "MB_RECIPE"` — done by the caller (detail-client.tsx), matching the "render
// nothing, no empty card" requirement for non-MB products anyway.
export function MbRecipeLinkCard({ productSysId, source }: Props) {
  if (source !== "MB_RECIPE") return null
  return <MbRecipeLinkCardContent productSysId={productSysId} />
}

function MbRecipeLinkCardContent({ productSysId }: { productSysId: number }) {
  const { data: headsData, isLoading: headsLoading } = useMBHeads({
    costProductId: productSysId,
    page: 1,
    pageSize: 5,
  })

  const mbHead = headsData?.data?.[0]

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Beaker className="h-4 w-4" />
          MB Recipe
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {headsLoading && (
          <p className="text-sm text-muted-foreground py-2">Loading MB recipe link…</p>
        )}

        {!headsLoading && !mbHead && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <HelpCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              This product was generated from an MB recipe, but the linked MB Head could not be
              found. Recipe-to-product linkage is only recorded once the MB Head is
              <span className="font-medium"> validated</span> — this most likely means the
              recipe is still in DRAFT (not yet validated), not that no recipe exists.
            </p>
          </div>
        )}

        {!headsLoading && mbHead && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
                <Field label="Code" value={mbHead.mbhCode || "—"} mono />
                <Field label="Dev Code" value={mbHead.devCode || "—"} mono />
                <Field label="Shade Code" value={mbHead.shadeCode || "—"} mono />
                <Field label="Shade Name" value={mbHead.shadeName || "—"} />
              </div>
              <StatusBadge status={mbHead.entryStatus} type="mbhead" size="sm" />
            </div>
            <Link
              href={`/finance/mb-recipe/${mbHead.mbhId}`}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View MB recipe <ExternalLink className="h-3.5 w-3.5" />
            </Link>

            <MbSpinsSection mbhId={mbHead.mbhId} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Mounted only once an MB Head is actually found — mirrors the parent's
// mount-gates-the-query trick so we never fire an unfiltered "list all MB spins" query
// while still waiting on (or lacking) the head lookup.
function MbSpinsSection({ mbhId }: { mbhId: string }) {
  const { data: spinsData, isLoading: spinsLoading } = useMBSpins({ mbhId, page: 1, pageSize: 20 })

  return (
    <div className="border-t pt-3 space-y-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">MB Spin</p>
      {spinsLoading && <p className="text-sm text-muted-foreground py-1">Loading spins…</p>}
      {!spinsLoading && (spinsData?.data?.length ?? 0) === 0 && (
        <p className="text-sm text-muted-foreground">No spins recorded for this recipe.</p>
      )}
      {!spinsLoading && (spinsData?.data?.length ?? 0) > 0 && (
        <ul className="space-y-1.5">
          {spinsData!.data.map((spin) => (
            <li key={spin.mbsId} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
              <span className="font-mono">{spin.mbsMbCosting || "—"}</span>
              <span>{spin.mbsMgtName || "—"}</span>
              {(spin.mbsDenier != null || spin.mbsFilament != null) && (
                <span className="text-xs text-muted-foreground">
                  {spin.mbsDenier != null ? `${spin.mbsDenier}D` : ""}
                  {spin.mbsDenier != null && spin.mbsFilament != null ? " / " : ""}
                  {spin.mbsFilament != null ? `${spin.mbsFilament}F` : ""}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
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
