"use client"

// BulkEditParamsDialog (rewritten, bulk-simplify-attach-flexible design)
//
// Two independent sections, submitted together as one flat operation list to
// CostProductParamBulkService.BulkEditProductParams:
//   1. "Set parameter value" — pick a param (dataType-gated value input) ->
//      "Add" appends a row to a local list, each row removable. Submits as
//      UpsertParamValueOp for every row.
//   2. "Remove parameter(s)" — multi-select param picker -> removable chips.
//      Submits as RemoveApplicableParamOp for every chip.
//
// skipMissingApplicable is hardcoded false: a "set value" op always
// auto-adds applicability (not required, default display order) wherever
// it's missing on a targeted product — there is no "add applicable
// parameter" as a distinct user-facing action anymore, and no toggle to
// control this. Submitting calls useBulkEditProductParams() directly — no
// intermediate confirmation dialog; the job-progress dialog that opens
// afterward (owned by the parent) is post-submit status, not a confirmation.
//
// Both pickers exclude CALCULATED and MASTER_LOOKUP category params — see
// bulk-param-combobox.tsx's EXCLUDED_BULK_PARAM_CATEGORIES.
import { useMemo, useState } from "react"
import { AlertTriangle, Loader2, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  ScrollableDialogBody,
  ScrollableDialogContent,
  ScrollableDialogFooter,
  ScrollableDialogHeader,
} from "@/components/common/scrollable-dialog"
import { Dialog, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { BulkParamCombobox, BulkParamMultiCombobox } from "./bulk-param-combobox"
import { useBulkEditProductParams } from "@/hooks/finance/use-bulk-edit-product-params"
import { DataType } from "@/types/finance/parameter"
import type { Parameter } from "@/types/finance/parameter"
import type { BulkParamJobInfo } from "@/types/finance/cost-product-param-bulk"
import type { BulkParamOperation } from "@/types/generated/finance/v1/cost_product_param_bulk"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  productSysIds: number[]
  /** Fired once the job is successfully queued — parent opens the progress dialog. */
  onQueued: (job: BulkParamJobInfo) => void
}

/** A single "Set parameter value" row, keyed for React list rendering. */
interface SetValueRow {
  key: string
  param: Parameter
  valueNumeric?: string
  valueText?: string
  valueFlag?: boolean
}

function formatValue(row: SetValueRow): string {
  switch (row.param.dataType) {
    case DataType.DATA_TYPE_NUMBER:
      return row.valueNumeric ?? ""
    case DataType.DATA_TYPE_TEXT:
      return row.valueText ?? ""
    case DataType.DATA_TYPE_BOOLEAN:
      return row.valueFlag ? "TRUE" : "FALSE"
    default:
      return ""
  }
}

function buildOperations(setRows: SetValueRow[], removeParams: Parameter[]): BulkParamOperation[] {
  const setOps: BulkParamOperation[] = setRows.map((row) => ({
    upsertValue: {
      paramId: row.param.paramId,
      valueNumeric: row.valueNumeric ?? "",
      valueText: row.valueText ?? "",
      valueFlag: !!row.valueFlag,
      hasValueFlag: row.param.dataType === DataType.DATA_TYPE_BOOLEAN,
    },
  }))
  const removeOps: BulkParamOperation[] = removeParams.map((p) => ({
    removeApplicable: { paramId: p.paramId },
  }))
  return [...setOps, ...removeOps]
}

export function BulkEditParamsDialog({ open, onOpenChange, productSysIds, onQueued }: Props) {
  return (
    <>
      {open && (
        <BulkEditParamsDialogContent
          onOpenChange={onOpenChange}
          productSysIds={productSysIds}
          onQueued={onQueued}
        />
      )}
    </>
  )
}

function BulkEditParamsDialogContent({
  onOpenChange,
  productSysIds,
  onQueued,
}: Omit<Props, "open">) {
  const [setRows, setSetRows] = useState<SetValueRow[]>([])
  const [removeParams, setRemoveParams] = useState<Parameter[]>([])

  // Draft-in-progress state for the "Set parameter value" add-row form.
  const [draftParam, setDraftParam] = useState<Parameter | undefined>(undefined)
  const [draftValueNumeric, setDraftValueNumeric] = useState("")
  const [draftValueText, setDraftValueText] = useState("")
  const [draftValueFlag, setDraftValueFlag] = useState(false)

  const mutation = useBulkEditProductParams()

  function resetDraft() {
    setDraftParam(undefined)
    setDraftValueNumeric("")
    setDraftValueText("")
    setDraftValueFlag(false)
  }

  function handleAddSetRow() {
    if (!draftParam) return
    const row: SetValueRow = {
      key: `${draftParam.paramId}-${Date.now()}`,
      param: draftParam,
      valueNumeric: draftParam.dataType === DataType.DATA_TYPE_NUMBER ? draftValueNumeric : undefined,
      valueText: draftParam.dataType === DataType.DATA_TYPE_TEXT ? draftValueText : undefined,
      valueFlag: draftParam.dataType === DataType.DATA_TYPE_BOOLEAN ? draftValueFlag : undefined,
    }
    setSetRows((prev) => [...prev, row])
    resetDraft()
  }

  function handleRemoveSetRow(key: string) {
    setSetRows((prev) => prev.filter((r) => r.key !== key))
  }

  // Same-param-in-both-sections guard: block the contradiction of setting and
  // removing the same parameter in one submission.
  const conflictingParamIds = useMemo(() => {
    const setIds = new Set(setRows.map((r) => r.param.paramId))
    return removeParams.filter((p) => setIds.has(p.paramId)).map((p) => p.paramId)
  }, [setRows, removeParams])
  const hasConflict = conflictingParamIds.length > 0

  async function handleSubmit() {
    try {
      const job = await mutation.mutateAsync({
        productSysIds,
        operations: buildOperations(setRows, removeParams),
        skipMissingApplicable: false,
      })
      onOpenChange(false)
      setSetRows([])
      setRemoveParams([])
      resetDraft()
      onQueued(job)
    } catch {
      /* toast in hook */
    }
  }

  const draftValid =
    !!draftParam &&
    ((draftParam.dataType === DataType.DATA_TYPE_NUMBER && draftValueNumeric.trim() !== "") ||
      (draftParam.dataType === DataType.DATA_TYPE_TEXT && draftValueText.trim() !== "") ||
      draftParam.dataType === DataType.DATA_TYPE_BOOLEAN)

  const canSubmit =
    (setRows.length > 0 || removeParams.length > 0) &&
    !hasConflict &&
    productSysIds.length > 0 &&
    !mutation.isPending

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <ScrollableDialogContent className="sm:max-w-[640px]">
        <ScrollableDialogHeader>
          <DialogTitle>Bulk edit parameters</DialogTitle>
          <DialogDescription>
            Applies the changes below to all {productSysIds.length} selected product
            {productSysIds.length === 1 ? "" : "s"}. Setting a value auto-adds the parameter to any
            product it isn&apos;t applicable to yet; removing skips any product that doesn&apos;t have
            it.
          </DialogDescription>
        </ScrollableDialogHeader>

        <ScrollableDialogBody className="space-y-6">
          {/* Section 1 — Set parameter value */}
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Set parameter value</p>
              <p className="text-xs text-muted-foreground">
                Applies the same value to every selected product.
              </p>
            </div>

            <div className="space-y-3 rounded-md border p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label>Parameter</Label>
                  <BulkParamCombobox
                    value={draftParam?.paramId}
                    onChange={(p) => {
                      setDraftParam(p)
                      setDraftValueNumeric("")
                      setDraftValueText("")
                      setDraftValueFlag(false)
                    }}
                    excludeParamIds={setRows.map((r) => r.param.paramId)}
                  />
                </div>
              </div>

              {draftParam && (
                <div className="space-y-1">
                  <Label>Value</Label>
                  {draftParam.dataType === DataType.DATA_TYPE_NUMBER && (
                    <Input
                      type="number"
                      step="any"
                      value={draftValueNumeric}
                      onChange={(e) => setDraftValueNumeric(e.target.value)}
                      placeholder="Numeric value"
                    />
                  )}
                  {draftParam.dataType === DataType.DATA_TYPE_TEXT && (
                    <Input
                      value={draftValueText}
                      onChange={(e) => setDraftValueText(e.target.value)}
                      placeholder="Text value"
                    />
                  )}
                  {draftParam.dataType === DataType.DATA_TYPE_BOOLEAN && (
                    <div className="flex items-center gap-2">
                      <Switch checked={draftValueFlag} onCheckedChange={setDraftValueFlag} />
                      <span className="text-xs text-muted-foreground">
                        {draftValueFlag ? "TRUE" : "FALSE"}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <Button type="button" size="sm" variant="outline" disabled={!draftValid} onClick={handleAddSetRow}>
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>

            {setRows.length > 0 && (
              <ul className="space-y-1.5">
                {setRows.map((row) => (
                  <li
                    key={row.key}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      <span className="font-mono text-xs text-muted-foreground">{row.param.paramCode}</span>{" "}
                      <span className="font-medium">{row.param.paramName}</span> = {formatValue(row)}
                    </span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveSetRow(row.key)}
                      title="Remove row"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Section 2 — Remove parameter(s) */}
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Remove parameter(s)</p>
              <p className="text-xs text-muted-foreground">
                Removes applicability (and value) from every selected product that currently has it;
                products without it are skipped, not treated as failures.
              </p>
            </div>
            <BulkParamMultiCombobox
              value={removeParams}
              onChange={setRemoveParams}
              productSysIds={productSysIds}
              placeholder="Select parameters to remove…"
            />
          </div>

          {hasConflict && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                The same parameter can&apos;t be both set and removed in one submission. Remove it from
                one of the two sections above.
              </span>
            </div>
          )}
        </ScrollableDialogBody>

        <ScrollableDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!canSubmit} onClick={() => void handleSubmit()}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Apply to {productSysIds.length} product{productSysIds.length === 1 ? "" : "s"}
          </Button>
        </ScrollableDialogFooter>
      </ScrollableDialogContent>
    </Dialog>
  )
}
