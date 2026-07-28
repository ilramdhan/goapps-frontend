"use client"

// WOParamEditor renders one editable row per parameter, typed by dataType,
// and produces WOParamValueInput[] via buildParamValues(). Reused by the
// Submit (PPC values) and PC-approve (PC values) dialogs.

import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyState } from "@/components/common"

import type { WOParamValueInput } from "@/types/ppc/work-order"

/** Editable state for a single parameter row (keyed by paramId). */
export interface ParamRowState {
  paramId: string
  paramCode: string
  paramName: string
  dataType: string
  displayGroup: string
  isDual: boolean
  valueNum: string
  valueText: string
  valueFlag: boolean
}

/** Map row state to the API input array. hasValueFlag is true for BOOLEAN. */
export function buildParamValues(rows: ParamRowState[]): WOParamValueInput[] {
  return rows.map((r) => ({
    paramId: r.paramId,
    valueNum: r.dataType === "NUMBER" ? r.valueNum : "",
    valueText: r.dataType === "TEXT" ? r.valueText : "",
    valueFlag: r.dataType === "BOOLEAN" ? r.valueFlag : false,
    hasValueFlag: r.dataType === "BOOLEAN",
  }))
}

interface WOParamEditorProps {
  rows: ParamRowState[]
  onChange: (rows: ParamRowState[]) => void
  /** Column label for the editable value (e.g. "PPC Value" or "PC Value"). */
  valueLabel?: string
  disabled?: boolean
}

export function WOParamEditor({
  rows,
  onChange,
  valueLabel = "Value",
  disabled,
}: WOParamEditorProps) {
  const update = (paramId: string, patch: Partial<ParamRowState>) => {
    onChange(rows.map((r) => (r.paramId === paramId ? { ...r, ...patch } : r)))
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No parameters"
        description="This work order has no materialized parameters to set."
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px]">Code</TableHead>
            <TableHead>Parameter</TableHead>
            <TableHead className="w-[110px]">Group</TableHead>
            <TableHead className="w-[200px]">{valueLabel}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.paramId}>
              <TableCell className="font-mono text-xs">{row.paramCode}</TableCell>
              <TableCell>
                {row.paramName}
                {row.isDual && (
                  <span className="ml-1 rounded bg-muted px-1 text-[10px] text-muted-foreground">
                    dual
                  </span>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{row.displayGroup || "-"}</TableCell>
              <TableCell>
                {row.dataType === "NUMBER" && (
                  <Input
                    type="number"
                    value={row.valueNum}
                    onChange={(e) => update(row.paramId, { valueNum: e.target.value })}
                    disabled={disabled}
                    className="h-8"
                  />
                )}
                {row.dataType === "TEXT" && (
                  <Input
                    value={row.valueText}
                    onChange={(e) => update(row.paramId, { valueText: e.target.value })}
                    disabled={disabled}
                    className="h-8"
                  />
                )}
                {row.dataType === "BOOLEAN" && (
                  <Switch
                    checked={row.valueFlag}
                    onCheckedChange={(checked) => update(row.paramId, { valueFlag: checked })}
                    disabled={disabled}
                  />
                )}
                {row.dataType !== "NUMBER" &&
                  row.dataType !== "TEXT" &&
                  row.dataType !== "BOOLEAN" && (
                    <Input
                      value={row.valueText}
                      onChange={(e) => update(row.paramId, { valueText: e.target.value })}
                      disabled={disabled}
                      className="h-8"
                    />
                  )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
