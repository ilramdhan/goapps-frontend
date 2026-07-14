"use client"

// MbCompositionLineDialog — create/edit a single MB Recipe composition line.
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RmGroupHeadCombobox } from "@/components/finance/comboboxes/rm-group-head-combobox"
import { MbHeadRefCombobox } from "@/components/finance/comboboxes/mb-head-ref-combobox"
import { useCreateMbComposition, useUpdateMbComposition } from "@/hooks/finance/use-mb-composition"
import { MB_COMPOSITION_SOURCE_TYPE_OPTIONS } from "@/types/finance/mb-composition"
import type { MbComposition } from "@/types/finance/mb-composition"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  mbhId: string
  excludeMbhId: string
  nextSeqNo: number
  line?: MbComposition | null
}

export function MbCompositionLineDialog({ open, onOpenChange, mbhId, excludeMbhId, nextSeqNo, line }: Props) {
  const [sourceType, setSourceType] = useState("GROUP")
  const [groupHeadId, setGroupHeadId] = useState<string | undefined>(undefined)
  const [mbRefMbhId, setMbRefMbhId] = useState<string | undefined>(undefined)
  const [compositionPct, setCompositionPct] = useState("")
  const [isCarrier, setIsCarrier] = useState(false)

  const createM = useCreateMbComposition()
  const updateM = useUpdateMbComposition(mbhId)
  const pending = createM.isPending || updateM.isPending

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- intentional: sync state from fetched data when dialog opens */
    if (line) {
      setSourceType(line.sourceType)
      setGroupHeadId(line.groupHeadId || undefined)
      setMbRefMbhId(line.mbRefMbhId || undefined)
      setCompositionPct(line.compositionPct)
      setIsCarrier(line.isCarrier)
    } else {
      setSourceType("GROUP")
      setGroupHeadId(undefined)
      setMbRefMbhId(undefined)
      setCompositionPct("")
      setIsCarrier(false)
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [line, open])

  const canSubmit =
    !!compositionPct.trim() &&
    (sourceType === "GROUP" ? !!groupHeadId : sourceType === "MB" ? !!mbRefMbhId : true)

  async function handleSubmit() {
    const payload = {
      groupHeadId: sourceType === "GROUP" ? groupHeadId || "" : "",
      mbRefMbhId: sourceType === "MB" ? mbRefMbhId || "" : "",
      compositionPct: compositionPct.trim(),
      sourceType,
      isCarrier,
    }
    try {
      if (line) {
        await updateM.mutateAsync({ mbcmId: line.mbcmId, data: payload })
      } else {
        await createM.mutateAsync({ mbhId, seqNo: nextSeqNo, ...payload })
      }
      onOpenChange(false)
    } catch {
      // toast already fired by the mutation hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{line ? "Edit composition line" : "Add composition line"}</DialogTitle>
          <DialogDescription>Recipe composition rows must sum to 100%.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Source type *</Label>
            <Select
              value={sourceType}
              onValueChange={(v) => {
                setSourceType(v)
                setGroupHeadId(undefined)
                setMbRefMbhId(undefined)
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MB_COMPOSITION_SOURCE_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {sourceType === "GROUP" && (
            <div className="space-y-2">
              <Label>RM Group *</Label>
              <RmGroupHeadCombobox value={groupHeadId} onChange={(id) => setGroupHeadId(id)} />
            </div>
          )}

          {sourceType === "MB" && (
            <div className="space-y-2">
              <Label>MB Reference *</Label>
              <MbHeadRefCombobox value={mbRefMbhId} onChange={(id) => setMbRefMbhId(id)} excludeMbhId={excludeMbhId} />
            </div>
          )}

          <div className="space-y-2">
            <Label>Composition % *</Label>
            <Input
              inputMode="decimal"
              placeholder="e.g., 25.5"
              value={compositionPct}
              onChange={(e) => setCompositionPct(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="is-carrier" checked={isCarrier} onCheckedChange={(v) => setIsCarrier(v === true)} />
            <Label htmlFor="is-carrier" className="font-normal">This line is the carrier component</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {line ? "Update" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
