"use client"

import { ReactNode, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Copy, GitBranch, Layers, Pencil, Trash2, Undo2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/common/page-header"
import { StatusBadge } from "@/components/common/status-badge"
import { EmptyState } from "@/components/common/empty-state"
import { useBreadcrumbOverride } from "@/components/common/dynamic-breadcrumb"
import { usePermissionContext } from "@/providers/permission-provider"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { normalizeFgFollowsRecipe, type NormalizedUnsupersedeResult } from "@/types/finance/mb-spin"
import { useMBSpinDetail, useMBSpinSiblings, useUnsupersedeMBSpin } from "@/hooks/finance/use-mb-spin"
import { MBSpinDeleteDialog, MBSpinDuplicateDialog, MBSpinFormDialog, MBSpinFgEditDialog } from "@/components/finance/mb-spin"

interface Props {
  id: string
}

export default function MbSpinDetailClient({ id }: Props) {
  const { data, isLoading } = useMBSpinDetail(id)
  const mbSpin = data?.data
  const router = useRouter()
  const { hasPermission } = usePermissionContext()
  const { data: siblingSpins } = useMBSpinSiblings(mbSpin?.mbsMbhId)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [duplicateOpen, setDuplicateOpen] = useState(false)
  const [fgEditOpen, setFgEditOpen] = useState(false)
  const [unsupersedeOpen, setUnsupersedeOpen] = useState(false)
  const [unsupersedeResult, setUnsupersedeResult] = useState<NormalizedUnsupersedeResult | null>(null)
  const unsupersedeM = useUnsupersedeMBSpin()

  // Same permission pattern as mb-spin-table.tsx (list page): each action is gated on
  // the code its RPC maps to in auth_interceptor.go. Duplicate uses "create" because
  // it produces a brand-new record — no new permission code invented.
  const canDuplicate = hasPermission("finance.yarnmaster.mbspin.create")
  const canUpdate = hasPermission("finance.yarnmaster.mbspin.update")
  const canDelete = hasPermission("finance.yarnmaster.mbspin.delete")
  const canRestore = hasPermission("finance.yarnmaster.mbspin.restore")

  useBreadcrumbOverride(mbSpin ? mbSpin.mbsMgtName || mbSpin.mbsMbCosting || null : null)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Loading…" />
      </div>
    )
  }

  if (!mbSpin) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/finance/yarn-master/mb-spins">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to MB Spin list
          </Link>
        </Button>
        <EmptyState title="MB Spin not found" description="The requested MB Spin does not exist." />
      </div>
    )
  }

  // Mirrors the "effective LDR" formula used in mb-spin-form-dialog.tsx (LDR
  // Efektif = mbsLdrCalculatedPct + mbsLdrAdjustmentPct) so this page and the
  // edit form never disagree on what the resulting value is.
  const hasLdrValue = mbSpin.mbsLdrCalculatedPct != null || mbSpin.mbsLdrAdjustmentPct != null
  const effectiveLdr = hasLdrValue
    ? (mbSpin.mbsLdrCalculatedPct ?? 0) + (mbSpin.mbsLdrAdjustmentPct ?? 0)
    : null

  const isLive = mbSpin.mbsIsActive !== false && !mbSpin.supersededBySpinId
  // Backend rejects a manual FG edit (ErrFgFollowsRecipe) for link source RECIPE
  // or a root spin whose head has an FG; fgFollowsRecipe covers both. The RECIPE
  // check is kept for older responses that lack the field.
  const fgFollowsRecipe =
    mbSpin.fgLinkSource === "RECIPE" || normalizeFgFollowsRecipe(mbSpin)
  const canEditFg = canUpdate && isLive && !fgFollowsRecipe
  const noShade = !mbSpin.mbsShadeCode

  // Siblings under the same parent MB Head, excluding this spin itself — see
  // the "KNOWN LIMITATION" comment on the Lineage card below for why this is
  // a substitute for true parent/child spin lineage rather than the real thing.
  const siblings = (siblingSpins ?? []).filter((sibling) => sibling.mbsId !== mbSpin.mbsId)

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/finance/yarn-master/mb-spins">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to MB Spin list
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title={mbSpin.mbsMgtName || mbSpin.mbsMbCosting || "MB Spin"}
          subtitle={mbSpin.mbsMbCosting || undefined}
        />
        <div className="flex flex-wrap items-center gap-2">
          {canUpdate && (
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
          {canDuplicate && !mbSpin.parentSpinId && (
            <Button size="sm" variant="outline" onClick={() => setDuplicateOpen(true)}>
              <Copy className="h-4 w-4 mr-1" />
              Duplicate
            </Button>
          )}
          {canRestore && mbSpin.supersededBySpinId && (
            <Button size="sm" variant="outline" onClick={() => setUnsupersedeOpen(true)}>
              <Undo2 className="h-4 w-4 mr-1" />
              Un-supersede
            </Button>
          )}
          {canDelete && (
            <Button size="sm" variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Identity
            {/*
              mbsStatus is free text mirrored from Oracle CMBS_STATUS (e.g.
              "Spinning", "R and D", "Boughtout") — not a closed enum, and no
              "mbspin" entry exists in status-colors.ts's registry. Per the task
              instructions, use type="generic" rather than inventing a new
              registry entry without checking existing patterns first;
              mb-spin-table.tsx's own status column (mbsStatus, line ~42) also
              renders it as plain text with no badge at all, so "generic" here
              is already an upgrade, not a regression.
            */}
            <StatusBadge status={mbSpin.mbsStatus} type="generic" size="sm" />
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Field label="Mgt Name" value={mbSpin.mbsMgtName || "—"} />
          <Field label="MB Costing" value={mbSpin.mbsMbCosting || "—"} mono />
          <Field label="Orion Item Code" value={mbSpin.mbsOrionItemCode || "—"} mono />
          <Field label="Shade Code" value={mbSpin.mbsShadeCode || "—"} mono />
          <Field label="Shade Name" value={mbSpin.mbsShadeName || "—"} />
          <Field label="Cross Section" value={mbSpin.mbsCrossSection || "—"} />
          {/*
            NOTE — deviation from the task's field list: "Lusture Code" was
            requested, but MBSpin (types/generated/finance/v1/yarn_master.ts,
            ~L2081-2167) has no mbsLustureCode field at all — lusture code only
            exists on MB Head (mbhLustureCode). Verified by reading the
            generated type directly rather than guessing a field name.
            Deliberately omitted rather than inventing a value.
          */}
          <Field label="Denier" value={mbSpin.mbsDenier != null ? String(mbSpin.mbsDenier) : "—"} mono />
          <Field label="Filament" value={mbSpin.mbsFilament != null ? String(mbSpin.mbsFilament) : "—"} mono />
          {/*
            "Dozing" (mbsDozing) intentionally removed from this detail view per
            user decision on 2026-08-31 — it is a duplicate concept of LDR
            (see the LDR block below: mbsLdrType/mbsLdrCalculatedPct/
            mbsLdrAdjustmentPct). The mbsDozing field itself, the DB column
            `mbs_dozing`, the MBSpinFormDialog form field, and the whole
            mb-dozing/LDR calculator mechanism are all intentionally KEPT —
            only this render line was deleted. Do not re-add a "Dozing" Field
            here; if LDR display changes are needed, change the LDR block.
          */}
          <Field label="VS Number" value={mbSpin.mbsVsNumber || "—"} />
          <Field label="Final Product" value={mbSpin.mbsFinalProduct || "—"} />
          <Field
            label="FG (POY)"
            value={
              <span className="flex flex-wrap items-center gap-2">
                <span>
                  {mbSpin.fgProductId
                    ? `${mbSpin.fgProductCode || "-"}${mbSpin.fgProductName ? ` — ${mbSpin.fgProductName}` : ""}`
                    : "—"}
                </span>
                {canEditFg && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-xs"
                    disabled={noShade}
                    title={noShade ? "Spin has no shade" : undefined}
                    onClick={() => setFgEditOpen(true)}
                  >
                    Edit FG
                  </Button>
                )}
                {canUpdate && isLive && fgFollowsRecipe && (
                  <span className="text-xs text-muted-foreground">FG follows recipe</span>
                )}
              </span>
            }
          />
          <Field label="FG Item Code" value={mbSpin.fgItemCode || "—"} mono />
          <Field label="FG Link Source" value={mbSpin.fgLinkSource || "—"} />
          <Field
            label="Superseded"
            value={
              mbSpin.supersededBySpinId ? (
                <span className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="text-amber-700 border-amber-400">
                    Superseded → {mbSpin.supersededBySpinCode || "newer spin"}
                  </Badge>
                  {mbSpin.supersededAt ? (
                    <span className="text-xs text-muted-foreground">{mbSpin.supersededAt}</span>
                  ) : null}
                </span>
              ) : (
                "—"
              )
            }
          />
        </CardContent>
        <CardContent className="border-t pt-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">LDR</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Field
              label="LDR Type"
              value={<StatusBadge status={mbSpin.mbsLdrType} type="generic" size="sm" />}
            />
            <Field
              label="Calculated"
              value={mbSpin.mbsLdrCalculatedPct != null ? `${mbSpin.mbsLdrCalculatedPct}%` : "—"}
              mono
            />
            <Field
              label="Adjustment"
              value={mbSpin.mbsLdrAdjustmentPct != null ? `${mbSpin.mbsLdrAdjustmentPct}%` : "—"}
              mono
            />
            <Field
              label="Effective (result)"
              value={effectiveLdr != null ? `${effectiveLdr}%` : "—"}
              mono
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Lineage
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/*
            KNOWN LIMITATION (P5-T2): MBSpin has no parent-spin field at all —
            verified against types/generated/finance/v1/yarn_master.ts (MBSpin
            message, ~L2081-2167). The only "parent" reference on MBSpin is
            mbsMbhId (the parent MB Head UUID); there is no mbsParentSpinId or
            any field recording which spin a DuplicateMBSpin clone came from.
            The backend ListFilter also has no ParentSpinID (mbspin/repository.go
            ~L143), so there's no server-side way to ask for "children of spin
            X" either. A true parent/child spin lineage tree therefore cannot
            be shown without a new backend field, which this task is not
            authorized to add.

            As the closest available substitute, this lists sibling MB Spins
            that share the same parent MB Head — the family a "duplicate for a
            new LDR" clone actually lands in — via useMBSpinSiblings().
          */}
          {siblings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No other MB Spins under the same MB Head.
            </p>
          ) : (
            <div className="space-y-2">
              {siblings
                .map((sibling) => {
                  const siblingHasLdr =
                    sibling.mbsLdrCalculatedPct != null || sibling.mbsLdrAdjustmentPct != null
                  const siblingEffectiveLdr = siblingHasLdr
                    ? (sibling.mbsLdrCalculatedPct ?? 0) + (sibling.mbsLdrAdjustmentPct ?? 0)
                    : null
                  return (
                    <div
                      key={sibling.mbsId}
                      className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/finance/yarn-master/mb-spins/${sibling.mbsId}`}
                          className="font-medium hover:underline truncate block"
                        >
                          {sibling.mbsMgtName || sibling.mbsMbCosting || sibling.mbsId}
                        </Link>
                        <div className="text-xs text-muted-foreground font-mono">
                          {sibling.mbsMbCosting || "—"}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-xs">
                        <StatusBadge status={sibling.mbsLdrType} type="generic" size="sm" />
                        <span className="font-mono">
                          {siblingEffectiveLdr != null ? `${siblingEffectiveLdr}%` : "—"}
                        </span>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </CardContent>
      </Card>

      <MBSpinFormDialog open={editOpen} onOpenChange={setEditOpen} mbSpin={mbSpin} />
      {canEditFg && <MBSpinFgEditDialog open={fgEditOpen} onOpenChange={setFgEditOpen} mbSpin={mbSpin} />}
      <MBSpinDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        mbSpin={mbSpin}
        onSuccess={() => router.push("/finance/yarn-master/mb-spins")}
      />
      <MBSpinDuplicateDialog open={duplicateOpen} onOpenChange={setDuplicateOpen} mbSpin={mbSpin} />

      <AlertDialog open={unsupersedeOpen} onOpenChange={setUnsupersedeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Un-supersede this MB Spin?</AlertDialogTitle>
            <AlertDialogDescription>
              This spin will be active again and the MB_SP_CODE parameters that were repointed to{" "}
              {mbSpin.supersededBySpinCode || "the newer spin"} will be reverted where possible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unsupersedeM.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={unsupersedeM.isPending}
              onClick={(e) => {
                e.preventDefault()
                unsupersedeM.mutate(
                  { mbsId: mbSpin.mbsId, mbhId: mbSpin.mbsMbhId },
                  {
                    onSuccess: (res) => {
                      setUnsupersedeOpen(false)
                      setUnsupersedeResult(res)
                    },
                  }
                )
              }}
            >
              Confirm un-supersede
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={unsupersedeResult != null}
        onOpenChange={(o) => {
          if (!o) setUnsupersedeResult(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Un-supersede result</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>Params reverted: {unsupersedeResult?.paramsReverted ?? 0}</p>
                {unsupersedeResult && unsupersedeResult.skipped.length > 0 ? (
                  <div>
                    <p className="font-medium">Skipped ({unsupersedeResult.skipped.length})</p>
                    <ul className="max-h-48 overflow-auto space-y-1 text-xs">
                      {unsupersedeResult.skipped.map((s) => (
                        <li key={s.cppValueId}>
                          <span className="font-mono">{s.productCode || s.productSysId}</span>{" "}
                          {s.paramCode} — {s.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Field({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={mono ? "font-mono text-sm" : "text-sm"}>{value}</div>
    </div>
  )
}
