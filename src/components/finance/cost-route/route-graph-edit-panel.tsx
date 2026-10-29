"use client"

// RouteGraphEditPanel — overlay panel for editing a stage or an RM edge
// without leaving the React Flow canvas. Used by Bug 2 + Bug 5 to replace
// the previous "click jumps to Cards view" + window.prompt() flows.

import { useState, type ComponentProps } from "react"
import Link from "next/link"
import { AlertTriangle, Plus, Trash2, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DENIER_RATIO_DISABLED_HINT,
  GROUP_MISSING_DENIER_HINT,
  denierFormula,
  displayRatio,
  isDenierLine,
  isGroupMissingDenier,
} from "@/components/finance/cost-route/rm-ratio-display"
import type { CostRouteRm, CostRouteSeq } from "@/types/finance/cost-route"
import { routeRmKeyOf } from "@/types/finance/rm-denier-override"

interface SeqPanelProps {
  mode: "seq"
  seq: CostRouteSeq
  locked: boolean
  onClose: () => void
  onChangeRmRatio: (rmIdx: number, ratio: number) => void
  onRemoveRm: (rmIdx: number) => void
  onAddRm: () => void
  onRemoveStage: () => void
  onOpenInCards: () => void
}

interface RmPanelProps {
  mode: "rm"
  seq: CostRouteSeq
  rm: CostRouteRm
  rmIdx: number
  locked: boolean
  onClose: () => void
  onChangeRatio: (ratio: number) => void
  onRemove: () => void
}

type Props = SeqPanelProps | RmPanelProps

export function RouteGraphEditPanel(props: Props) {
  return (
    <Card className="absolute right-4 top-4 z-10 w-[360px] max-w-[calc(100%-2rem)] overflow-hidden border bg-background p-0 shadow-lg">
      <div className="flex items-start justify-between gap-2 border-b bg-muted/30 px-4 py-3">
        <div className="min-w-0">
          {props.mode === "seq" ? (
            <>
              <div className="font-mono text-[10px] text-muted-foreground">
                L{props.seq.routeLevel} · seq {props.seq.routeSeq}
              </div>
              <div className="truncate text-sm font-semibold">
                {props.seq.productCode || "(no code)"}
              </div>
              {props.seq.productName ? (
                <div className="truncate text-xs text-muted-foreground">
                  {props.seq.productName}
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {props.rm.rmType}
                </Badge>
                <span className="truncate font-mono text-xs">
                  {rmRefLabel(props.rm)}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                feeding L{props.seq.routeLevel} · seq {props.seq.routeSeq}
                {props.seq.productCode ? ` · ${props.seq.productCode}` : ""}
              </div>
            </>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0"
          onClick={props.onClose}
          title="Close panel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3 p-4">
        {props.mode === "seq" ? <SeqBody {...props} /> : <RmBody {...props} />}
      </div>
    </Card>
  )
}

function SeqBody({
  seq,
  locked,
  onChangeRmRatio,
  onRemoveRm,
  onAddRm,
  onRemoveStage,
  onOpenInCards,
}: SeqPanelProps) {
  const rms = seq.rms ?? []
  return (
    <>
      <div>
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Inputs ({rms.length})
        </Label>
        {rms.length === 0 ? (
          <div className="mt-2 rounded border border-dashed p-3 text-center text-xs italic text-muted-foreground">
            No inputs yet.
          </div>
        ) : (
          <div className="mt-2 space-y-1">
            {rms.map((rm, rmIdx) => (
              <div
                key={rm.uid}
                className="flex items-center gap-2 rounded border bg-muted/20 px-2 py-1.5 text-xs"
              >
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {rm.rmType}
                </Badge>
                <span className="min-w-0 flex-1 truncate font-mono">
                  {rmRefLabel(rm)}
                </span>
                {isGroupMissingDenier(seq, rm) && <MissingDenierBadge />}
                {isDenierLine(rm) ? (
                  <DenierRatioBadge seq={seq} rm={rm} compact />
                ) : (
                  <RatioInput
                    value={rm.routeRmRatio}
                    disabled={locked}
                    onCommit={(next) => onChangeRmRatio(rmIdx, next)}
                    aria-label={`Ratio for ${rmRefLabel(rm)}`}
                    className="h-7 w-20 text-xs"
                  />
                )}
                {!locked && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 shrink-0 text-red-500"
                    onClick={() => onRemoveRm(rmIdx)}
                    title="Remove input"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 pt-2">
        {!locked && (
          <Button size="sm" variant="outline" onClick={onAddRm}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add ITEM / GROUP / PRODUCT RM
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onOpenInCards}>
          Open in Cards view
        </Button>
        {!locked && (
          <Button
            size="sm"
            variant="ghost"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={onRemoveStage}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove this stage
          </Button>
        )}
      </div>
    </>
  )
}

function RmBody({ seq, rm, locked, onChangeRatio, onRemove }: RmPanelProps) {
  const denier = isDenierLine(rm)
  const overrideKey = routeRmKeyOf(rm)
  return (
    <>
      {denier && (
        <div className="space-y-1">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Calculated ratio
          </Label>
          <DenierRatioBadge seq={seq} rm={rm} />
          <p className="text-xs text-muted-foreground">{denierFormula(seq, rm)}</p>
          {rm.denierOverridden && (
            <Badge
              variant="outline"
              className="text-[10px]"
              data-testid="denier-override-badge"
              title="Denier di-override khusus product ini"
            >
              OVERRIDE
            </Badge>
          )}
        </div>
      )}
      {overrideKey && seq.productSysId > 0 && (
        <div>
          <Link
            href={`/finance/product-master/${seq.productSysId}?tab=denier-rm&rm=${encodeURIComponent(overrideKey)}`}
            className="text-xs text-primary underline"
            data-testid="denier-override-link"
          >
            Override denier untuk product ini
          </Link>
        </div>
      )}
      <div>
        <Label htmlFor="rm-ratio" className="text-xs uppercase tracking-wide text-muted-foreground">
          Ratio per output unit
        </Label>
        {isGroupMissingDenier(seq, rm) && (
          <div className="mb-1 space-y-1">
            <MissingDenierBadge />
            <p className="text-xs text-amber-600 dark:text-amber-500">{GROUP_MISSING_DENIER_HINT}</p>
          </div>
        )}
        <RatioInput
          // Keyed on the RM so switching edges never shows the previous RM's value.
          key={rm.uid}
          id="rm-ratio"
          value={rm.routeRmRatio}
          disabled={locked || denier}
          title={denier ? DENIER_RATIO_DISABLED_HINT : undefined}
          onCommit={onChangeRatio}
          className="mt-1"
        />
        {!locked && !denier && (
          <p className="mt-1 text-xs text-muted-foreground">
            Changes apply to the route immediately — click &quot;Save draft&quot; at the top to persist.
          </p>
        )}
        {denier && (
          <p className="mt-1 text-xs text-muted-foreground">
            Stored ratio is ignored by the calculation. {DENIER_RATIO_DISABLED_HINT}
          </p>
        )}
      </div>
      {!locked && (
        <Button
          size="sm"
          variant="ghost"
          className="w-full text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={onRemove}
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove this input
        </Button>
      )}
    </>
  )
}

// Ratio input with a local text draft. A controlled `value={number}` input
// that only accepts positive numbers rejects every intermediate keystroke of
// a ratio below 1 ("" → "0" → "0." are all <= 0), so React snapped the field
// back to the old value and the edit (and the dirty flag / Save draft button)
// never happened. The draft keeps whatever the user types; only valid
// positive numbers are committed, and blur restores the committed value.
function RatioInput({
  value,
  onCommit,
  ...rest
}: {
  value: number
  onCommit: (next: number) => void
} & Omit<ComponentProps<typeof Input>, "value" | "defaultValue" | "onChange" | "type">) {
  const [draft, setDraft] = useState(() => String(value))
  // Re-sync when the committed value changes from outside (e.g. after save)
  // — adjust-state-during-render pattern, no effect needed.
  const [seen, setSeen] = useState(value)
  if (seen !== value) {
    setSeen(value)
    if (Number(draft) !== value) setDraft(String(value))
  }
  return (
    <Input
      {...rest}
      type="number"
      step="any"
      min={0}
      inputMode="decimal"
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value)
        const next = Number(e.target.value)
        if (e.target.value.trim() !== "" && Number.isFinite(next) && next > 0) onCommit(next)
      }}
      onBlur={(e) => {
        setDraft(String(value))
        rest.onBlur?.(e)
      }}
    />
  )
}

// Read-only computed ratio for a denier-derived line: value + "Denier" badge,
// with the formula (or backend note) and the edit hint in a tooltip.
function MissingDenierBadge() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className="shrink-0 gap-1 border-amber-500 text-[10px] text-amber-600 dark:text-amber-500"
          data-testid="group-missing-denier"
          tabIndex={0}
        >
          <AlertTriangle className="h-3 w-3" />
          Denier kosong
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{GROUP_MISSING_DENIER_HINT}</TooltipContent>
    </Tooltip>
  )
}

function DenierRatioBadge({
  seq,
  rm,
  compact = false,
}: {
  seq: CostRouteSeq
  rm: CostRouteRm
  compact?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex shrink-0 items-center gap-1"
          data-testid="denier-ratio"
          tabIndex={0}
        >
          <span className={compact ? "font-mono text-xs" : "font-mono text-sm font-semibold"}>
            {displayRatio(rm)}
          </span>
          <Badge variant="secondary" className="text-[10px]">
            Denier
          </Badge>
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="space-y-1 text-xs">
          <div className="font-mono">{denierFormula(seq, rm)}</div>
          <div>{DENIER_RATIO_DISABLED_HINT}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

function rmRefLabel(rm: CostRouteRm): string {
  return (
    rm.routeRmName ||
    rm.rmItemCode ||
    rm.rmGroupCode ||
    (rm.rmProductSysId ? `product #${rm.rmProductSysId}` : "RM")
  )
}
