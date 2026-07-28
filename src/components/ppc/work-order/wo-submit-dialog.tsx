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
import { useSubmitWO } from "@/hooks/ppc/use-work-order"

interface WOSubmitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workOrder: WorkOrder
}

// Seed editor rows from PPC values already materialized on the WO.
function ppcRows(wo: WorkOrder): ParamRowState[] {
  return [...(wo.parameters ?? [])]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((p) => ({
      paramId: p.paramId,
      paramCode: p.paramCode,
      paramName: p.paramName,
      dataType: p.dataType,
      displayGroup: p.displayGroup,
      isDual: p.isDual,
      valueNum: p.valuePpcNum || "",
      valueText: p.valuePpcText || "",
      valueFlag: p.valuePpcFlag || false,
    }))
}

export function WOSubmitDialog({ open, onOpenChange, workOrder }: WOSubmitDialogProps) {
  const submitMutation = useSubmitWO()
  const [rows, setRows] = useState<ParamRowState[]>([])
  // Reseed the editor when the dialog transitions to open (adjust-during-render
  // pattern — avoids setState-in-effect cascading renders).
  const [wasOpen, setWasOpen] = useState(false)
  if (open && !wasOpen) {
    setWasOpen(true)
    setRows(ppcRows(workOrder))
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  const handleSubmit = async () => {
    try {
      await submitMutation.mutateAsync({
        woId: workOrder.woId,
        ppcValues: buildParamValues(rows),
      })
      onOpenChange(false)
    } catch (e) {
      console.error("Failed to submit work order:", e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ScrollableDialogContent className="sm:max-w-[720px]">
        <ScrollableDialogHeader>
          <DialogTitle>Submit Work Order</DialogTitle>
          <DialogDescription>
            Confirm the PPC parameter values, then submit for sequential PC → PM approval.
          </DialogDescription>
        </ScrollableDialogHeader>
        <ScrollableDialogBody>
          <WOParamEditor
            rows={rows}
            onChange={setRows}
            valueLabel="PPC Value"
            disabled={submitMutation.isPending}
          />
        </ScrollableDialogBody>
        <ScrollableDialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitMutation.isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitMutation.isPending}>
            {submitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit
          </Button>
        </ScrollableDialogFooter>
      </ScrollableDialogContent>
    </Dialog>
  )
}
