"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import {
  ScrollableDialogBody,
  ScrollableDialogContent,
  ScrollableDialogFooter,
  ScrollableDialogHeader,
} from "@/components/common/scrollable-dialog"

import { WOParamEditor, buildParamValues, type ParamRowState } from "./wo-param-editor"

import type { WorkOrder } from "@/types/ppc/work-order"
import { useApproveWOParameter } from "@/hooks/ppc/use-work-order"

interface WOApproveParameterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workOrder: WorkOrder
}

// PC editor seeds from existing PC values, falling back to the PPC value
// (PC defaults to PPC when not yet confirmed).
function pcRows(wo: WorkOrder): ParamRowState[] {
  return [...(wo.parameters ?? [])]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((p) => ({
      paramId: p.paramId,
      paramCode: p.paramCode,
      paramName: p.paramName,
      dataType: p.dataType,
      displayGroup: p.displayGroup,
      isDual: p.isDual,
      valueNum: p.valuePcNum || p.valuePpcNum || "",
      valueText: p.valuePcText || p.valuePpcText || "",
      valueFlag: p.valuePcFlag || p.valuePpcFlag || false,
    }))
}

export function WOApproveParameterDialog({
  open,
  onOpenChange,
  workOrder,
}: WOApproveParameterDialogProps) {
  const approveMutation = useApproveWOParameter()
  const [rows, setRows] = useState<ParamRowState[]>([])
  // Reseed PC values when the dialog opens (adjust-during-render pattern).
  const [wasOpen, setWasOpen] = useState(false)
  if (open && !wasOpen) {
    setWasOpen(true)
    setRows(pcRows(workOrder))
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync({
        woId: workOrder.woId,
        pcValues: buildParamValues(rows),
      })
      onOpenChange(false)
    } catch (e) {
      console.error("Failed to approve parameters:", e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ScrollableDialogContent className="sm:max-w-[720px]">
        <ScrollableDialogHeader>
          <DialogTitle>PC Parameter Approval</DialogTitle>
          <DialogDescription>
            Review and confirm the PC parameter values. This moves the WO to PC Approved
            (PM approves afterward).
          </DialogDescription>
        </ScrollableDialogHeader>
        <ScrollableDialogBody>
          <WOParamEditor
            rows={rows}
            onChange={setRows}
            valueLabel="PC Value"
            disabled={approveMutation.isPending}
          />
        </ScrollableDialogBody>
        <ScrollableDialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={approveMutation.isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleApprove} disabled={approveMutation.isPending}>
            {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Approve PC Parameters
          </Button>
        </ScrollableDialogFooter>
      </ScrollableDialogContent>
    </Dialog>
  )
}
