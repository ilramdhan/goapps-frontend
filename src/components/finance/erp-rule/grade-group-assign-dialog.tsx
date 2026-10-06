"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAssignGradeGroup } from "@/hooks/finance/use-erp-rule"
import type { GradeGroup } from "@/types/finance/erp-rule"

export const GRADE_GROUPS = ["NS", "AE", "BC", "BB", "JLT", "POYA", "AX"]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  grade: GradeGroup | null
}

export function GradeGroupAssignDialog({ open, onOpenChange, grade }: Props) {
  const mutation = useAssignGradeGroup()
  // Selection override keyed by grade; falls back to the grade's current group.
  const [picked, setPicked] = useState<{ code: string; group: string } | null>(null)
  const group = picked && picked.code === grade?.gradeCode ? picked.group : (grade?.gradeGroup ?? "")
  const setGroup = (g: string) => setPicked({ code: grade?.gradeCode ?? "", group: g })

  async function onSave() {
    if (!grade || !group) return
    try {
      await mutation.mutateAsync({ gradeCode: grade.gradeCode, gradeGroup: group })
      onOpenChange(false)
    } catch {
      // toast handled in hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{grade?.gradeGroup ? "Change Grade Group" : "Assign Grade Group"}</DialogTitle>
          <DialogDescription>{grade?.gradeCode} {grade?.gradeName}</DialogDescription>
        </DialogHeader>
        <Select value={group} onValueChange={setGroup} disabled={mutation.isPending}>
          <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
          <SelectContent>
            {GRADE_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancel</Button>
          <Button onClick={onSave} disabled={!group || mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
