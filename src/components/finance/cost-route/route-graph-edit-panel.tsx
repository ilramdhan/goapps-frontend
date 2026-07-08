"use client"

// RouteGraphEditPanel — overlay panel for editing a stage or an RM edge
// without leaving the React Flow canvas. Used by Bug 2 + Bug 5 to replace
// the previous "click jumps to Cards view" + window.prompt() flows.

import { Plus, Trash2, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CostRouteRm, CostRouteSeq } from "@/types/finance/cost-route"

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
                <Input
                  type="number"
                  step="0.01"
                  min={0.0001}
                  value={rm.routeRmRatio}
                  disabled={locked}
                  onChange={(e) => {
                    const next = Number(e.target.value)
                    if (Number.isFinite(next) && next > 0) {
                      onChangeRmRatio(rmIdx, next)
                    }
                  }}
                  className="h-7 w-20 text-xs"
                />
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

function RmBody({ rm, locked, onChangeRatio, onRemove }: RmPanelProps) {
  return (
    <>
      <div>
        <Label htmlFor="rm-ratio" className="text-xs uppercase tracking-wide text-muted-foreground">
          Ratio per output unit
        </Label>
        <Input
          id="rm-ratio"
          type="number"
          step="0.01"
          min={0.0001}
          defaultValue={rm.routeRmRatio}
          disabled={locked}
          onChange={(e) => {
            const next = Number(e.target.value)
            if (Number.isFinite(next) && next > 0) onChangeRatio(next)
          }}
          className="mt-1"
        />
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

function rmRefLabel(rm: CostRouteRm): string {
  return (
    rm.routeRmName ||
    rm.rmItemCode ||
    rm.rmGroupCode ||
    (rm.rmProductSysId ? `product #${rm.rmProductSysId}` : "RM")
  )
}
