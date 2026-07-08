"use client"

import { useMemo, useState } from "react"
import { ArrowLeft, Clock, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { UserName } from "@/components/common/user-name"
import { OverrideParamsDrawer } from "./override-params-drawer"
import { ParamEditLogDrawer } from "./param-edit-log-drawer"
import type { FillLevelSummary, ProductParamSummary, ParamValueEntry } from "@/types/finance/param-summary"

interface OverrideState {
  routeLevel: number
  productSysId: number
  params: ParamValueEntry[]
}

interface LogState {
  routeLevel: number
}

interface Props {
  open: boolean
  onClose: () => void
  requestId: number
  product: ProductParamSummary
  canEdit: boolean
  routeLocked: boolean
}

function ParamGroupedList({ params }: { params: ParamValueEntry[] }) {
  const groups = useMemo(() => {
    const groupMinOrder: Record<string, number> = {}
    for (const p of params) {
      const g = p.displayGroup ?? ""
      const cur = groupMinOrder[g]
      if (cur === undefined || p.displayOrder < cur) {
        groupMinOrder[g] = p.displayOrder
      }
    }
    const sorted = Object.keys(groupMinOrder).sort((a, b) => {
      if (a === "" && b !== "") return 1
      if (b === "" && a !== "") return -1
      return (groupMinOrder[a] ?? 0) - (groupMinOrder[b] ?? 0)
    })
    return sorted.map((g) => ({
      name: g,
      params: params
        .filter((p) => (p.displayGroup ?? "") === g)
        .sort((a, b) => a.displayOrder - b.displayOrder || a.paramCode.localeCompare(b.paramCode)),
    }))
  }, [params])

  return (
    <div className="space-y-3">
      {groups.map((group, i) => (
        <div key={group.name || "__ungrouped__"}>
          {group.name && (
            <div className={`flex items-center gap-2 mb-1 ${i > 0 ? "mt-1" : ""}`}>
              <span className="text-[10px] font-semibold text-foreground/80 uppercase tracking-wider shrink-0">
                {group.name}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}
          <div className="space-y-0.5">
            {group.params.map((p) => (
              <div key={p.paramCode} className="flex items-baseline gap-2">
                <span
                  className="w-36 shrink-0 truncate font-mono text-[11px] text-muted-foreground"
                  title={p.paramCode}
                >
                  {p.paramCode}
                </span>
                {p.hasValue ? (
                  <span className="font-mono text-[11px]">
                    {p.dataType === "NUMBER"
                      ? p.valueNumeric
                      : p.dataType === "BOOLEAN"
                        ? p.valueFlag
                          ? "true"
                          : "false"
                        : p.valueText}
                    {p.uomCode ? ` ${p.uomCode}` : ""}
                  </span>
                ) : (
                  <span className="font-medium text-destructive text-[11px]">——</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function taskBadge(status: string) {
  switch (status) {
    case "APPROVED":
      return (
        <Badge className="border-green-200 bg-green-100 text-[10px] text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400">
          ✓ Approved
        </Badge>
      )
    case "FILLED":
    case "APPROVAL_PENDING":
      return (
        <Badge className="border-yellow-200 bg-yellow-100 text-[10px] text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400">
          ⏳ Pending
        </Badge>
      )
    case "REJECTED":
      return (
        <Badge className="border-red-200 bg-red-100 text-[10px] text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          ✗ Rejected
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="text-[10px]">
          {status || "Active"}
        </Badge>
      )
  }
}

function LevelSection({
  level,
  canEdit,
  locked,
  onEdit,
  onShowLog,
}: {
  level: FillLevelSummary
  canEdit: boolean
  locked: boolean
  onEdit: () => void
  onShowLog: () => void
}) {
  return (
    <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">Level {level.routeLevel}</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            {level.filledParams}/{level.totalParams}
          </span>
          {taskBadge(level.taskStatus)}
          {level.lastEditedBy && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0 text-muted-foreground"
              title="View override history"
              onClick={onShowLog}
            >
              <Clock className="h-3 w-3" />
            </Button>
          )}
          {canEdit && !locked && level.params.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0"
              title="Edit param values"
              onClick={onEdit}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <ParamGroupedList params={level.params} />

      {level.filledByUserId && (
        <p className="text-[10px] text-muted-foreground">
          Filled by: <UserName userId={level.filledByUserId} compact />
          {level.filledAt ? ` · ${level.filledAt.slice(0, 10)}` : ""}
        </p>
      )}
      {level.lastEditedBy && (
        <p className="text-[10px] text-muted-foreground">
          Last edited by: {level.lastEditedBy}
          {level.lastEditedAt ? ` · ${level.lastEditedAt.slice(0, 10)}` : ""}
        </p>
      )}
    </div>
  )
}

export function ParamDetailDrawer({ open, onClose, requestId, product, canEdit, routeLocked }: Props) {
  const [overrideState, setOverrideState] = useState<OverrideState | null>(null)
  const [logState, setLogState] = useState<LogState | null>(null)

  const totalFilled = product.levels.reduce((s, l) => s + l.filledParams, 0)
  const totalParams = product.levels.reduce((s, l) => s + l.totalParams, 0)
  const allFilled = totalFilled === totalParams && totalParams > 0

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="flex flex-col gap-0 p-0 w-full sm:max-w-lg"
        >
          {/* Sticky header */}
          <div className="flex shrink-0 items-start gap-3 border-b bg-background px-6 py-4">
            <div className="flex-1 min-w-0 space-y-1">
              <SheetTitle className="font-mono text-base font-semibold leading-tight">
                {product.productCode}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                {totalFilled}/{totalParams} params filled · {product.levels.length} level
                {product.levels.length !== 1 ? "s" : ""}
              </SheetDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`text-xs font-medium ${allFilled ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}
              >
                {allFilled ? "Complete" : "In progress"}
              </span>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={onClose}>
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Button>
            </div>
          </div>

          {/* Scrollable level list */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
            {product.levels.map((level) => (
              <LevelSection
                key={level.routeLevel}
                level={level}
                canEdit={canEdit}
                locked={routeLocked}
                onEdit={() =>
                  setOverrideState({
                    routeLevel: level.routeLevel,
                    productSysId: product.productSysId,
                    params: level.params,
                  })
                }
                onShowLog={() => setLogState({ routeLevel: level.routeLevel })}
              />
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {overrideState && (
        <OverrideParamsDrawer
          open
          onClose={() => setOverrideState(null)}
          requestId={requestId}
          routeLevel={overrideState.routeLevel}
          productSysId={overrideState.productSysId}
          productCode={product.productCode}
          params={overrideState.params}
        />
      )}

      {logState && (
        <ParamEditLogDrawer
          open
          onClose={() => setLogState(null)}
          requestId={requestId}
          routeLevel={logState.routeLevel}
          productCode={product.productCode}
        />
      )}
    </>
  )
}
