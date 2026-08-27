"use client"

// MbCompositionTab — recipe composition lines for an MB Head. Editable only while DRAFT.
import { useMemo, useState } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/common/empty-state"
import { ConfirmDialog } from "@/components/shared"
import { useMbCompositions, useDeleteMbComposition } from "@/hooks/finance/use-mb-composition"
import { useRMGroup } from "@/hooks/finance/use-rm-group"
import { useMBHead } from "@/hooks/finance/use-mb-head"
import { isOffMbCompositionTotal, sumMbCompositionPct } from "@/lib/finance/mb-composition-total"
import { MbCompositionLineDialog } from "./mb-composition-line-dialog"
import type { MbComposition } from "@/types/finance/mb-composition"
import type { MBHeadEntryStatus } from "@/types/finance/mb-head"

interface Props {
  mbhId: string
  entryStatus: MBHeadEntryStatus | string
}

export function MbCompositionTab({ mbhId, entryStatus }: Props) {
  const { data, isLoading } = useMbCompositions(mbhId)
  const deleteM = useDeleteMbComposition(mbhId)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<MbComposition | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MbComposition | null>(null)

  const items = data ?? []
  const editable = entryStatus === "DRAFT"
  // Guards double-click/fast re-delete from hitting an already-deleted row before
  // the list refetch lands (the row is still rendered until invalidation resolves).
  const pendingDeleteId = deleteM.isPending ? deleteM.variables : undefined

  // [R22] Non-carrier total, matching the backend's composition-sum rule
  // (sum_rule.go ValidateSum / sum_enforcement.go pctDelta) — carrier rows do
  // not count toward the 100% target. Derived at render, not via effect+state.
  const totalPct = useMemo(() => sumMbCompositionPct(items), [items])
  const totalOff = isOffMbCompositionTotal(totalPct)
  const nextSeqNo = items.length > 0 ? Math.max(...items.map((c) => c.seqNo)) + 1 : 1

  function sourceLabel(c: MbComposition) {
    if (c.sourceType === "GROUP") return "RM Group"
    if (c.sourceType === "MB") return "MB Reference"
    return "Carrier"
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold">Composition</CardTitle>
        <div className="flex items-center gap-3">
          <span className={`text-xs ${totalOff ? "text-destructive font-medium" : "text-muted-foreground"}`}>
            Non-carrier total: {totalPct.toFixed(3)}%
          </span>
          {editable && (
            <Button size="sm" onClick={() => { setEditTarget(null); setDialogOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" /> Add line
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!editable && (
          <p className="text-xs text-muted-foreground">
            Composition is read-only outside of DRAFT status.
          </p>
        )}
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 pl-4">Seq</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Colourant</TableHead>
                  <TableHead>CI Name</TableHead>
                  <TableHead className="w-28">Composition %</TableHead>
                  <TableHead className="w-24">Carrier</TableHead>
                  {editable && <TableHead className="w-24 pr-4 text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-4"><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      {editable && <TableCell className="pr-4"><Skeleton className="h-4 w-16" /></TableCell>}
                    </TableRow>
                  ))}
                {!isLoading && items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={editable ? 8 : 7} className="p-0">
                      <EmptyState
                        title="No composition lines"
                        description={editable ? "Add lines that sum to 100%." : "No composition data recorded."}
                        className="border-0 rounded-none"
                      />
                    </TableCell>
                  </TableRow>
                )}
                {items.map((c) => (
                  <TableRow key={c.mbcmId}>
                    <TableCell className="pl-4 text-sm">{c.seqNo}</TableCell>
                    <TableCell className="text-sm">{sourceLabel(c)}</TableCell>
                    <TableCell className="text-sm">
                      <ReferenceCell composition={c} />
                    </TableCell>
                    {c.sourceType === "GROUP" ? (
                      <RmGroupTagCells groupHeadId={c.groupHeadId} />
                    ) : (
                      <>
                        <TableCell className="text-sm text-muted-foreground">—</TableCell>
                        <TableCell className="text-sm text-muted-foreground">—</TableCell>
                      </>
                    )}
                    <TableCell className="text-sm font-mono">{c.compositionPct}%</TableCell>
                    <TableCell>{c.isCarrier && <Badge variant="secondary">Carrier</Badge>}</TableCell>
                    {editable && (
                      <TableCell className="pr-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7"
                            disabled={pendingDeleteId === c.mbcmId}
                            onClick={() => { setEditTarget(c); setDialogOpen(true) }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                            disabled={pendingDeleteId === c.mbcmId}
                            onClick={() => setDeleteTarget(c)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>

      <MbCompositionLineDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mbhId={mbhId}
        excludeMbhId={mbhId}
        nextSeqNo={nextSeqNo}
        line={editTarget}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete composition line"
        description={`Delete line #${deleteTarget?.seqNo}? This cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        isLoading={deleteM.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteM.mutate(deleteTarget.mbcmId)
          setDeleteTarget(null)
        }}
      />
    </Card>
  )
}

function ReferenceCell({ composition }: { composition: MbComposition }) {
  if (composition.sourceType === "GROUP") return <RmGroupRefLabel groupHeadId={composition.groupHeadId} />
  if (composition.sourceType === "MB") return <MbRefLabel mbhId={composition.mbRefMbhId} />
  return <span className="text-muted-foreground">—</span>
}

function RmGroupRefLabel({ groupHeadId }: { groupHeadId: string }) {
  const { data, isLoading } = useRMGroup(groupHeadId)
  const group = data?.data
  if (isLoading) return <Skeleton className="h-4 w-32" />
  if (!group) return <span className="text-muted-foreground">—</span>
  return (
    <span>
      <span className="font-mono text-xs text-muted-foreground mr-1">{group.groupCode}</span>
      {group.groupName}
    </span>
  )
}

function RmGroupTagCells({ groupHeadId }: { groupHeadId: string }) {
  const { data, isLoading } = useRMGroup(groupHeadId)
  const group = data?.data
  if (isLoading) {
    return (
      <>
        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      </>
    )
  }
  return (
    <>
      <TableCell className="text-sm">{group?.colourant || <span className="text-muted-foreground">—</span>}</TableCell>
      <TableCell className="text-sm">{group?.ciName || <span className="text-muted-foreground">—</span>}</TableCell>
    </>
  )
}

function MbRefLabel({ mbhId }: { mbhId: string }) {
  const { data, isLoading } = useMBHead(mbhId)
  const head = data?.data
  if (isLoading) return <Skeleton className="h-4 w-32" />
  if (!head) return <span className="text-muted-foreground">—</span>
  return (
    <span>
      <span className="font-mono text-xs text-muted-foreground mr-1">{head.devCode}</span>
      {head.shadeName || head.shadeCode}
    </span>
  )
}
