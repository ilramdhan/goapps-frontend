"use client"

import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useGradeGroups } from "@/hooks/finance/use-erp-rule"
import { usePermission } from "@/lib/hooks/use-permission"
import type { GradeGroup } from "@/types/finance/erp-rule"
import { GradeGroupAssignDialog } from "./grade-group-assign-dialog"

export function GradeGroupsTab() {
  const { hasPermission } = usePermission()
  const [unassignedOnly, setUnassignedOnly] = useState(false)
  const [assigning, setAssigning] = useState<GradeGroup | null>(null)
  const { data, isLoading } = useGradeGroups({ unassignedOnly })
  const items = data?.items ?? []

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={unassignedOnly} onCheckedChange={setUnassignedOnly} aria-label="Unassigned only" />
        Unassigned only
      </label>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Grade code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Group</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
          ) : items.length === 0 ? (
            <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No grades</TableCell></TableRow>
          ) : (
            items.map((g) => (
              <TableRow key={g.gradeCode}>
                <TableCell>{g.gradeCode}</TableCell>
                <TableCell>{g.gradeName}</TableCell>
                <TableCell>
                  {g.gradeGroup ? g.gradeGroup : <Badge variant="outline">Unassigned</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  {hasPermission("finance.cost.erprule.update") && (
                    <Button size="sm" variant="outline" onClick={() => setAssigning(g)}>
                      {g.gradeGroup ? "Change group" : "Assign group"}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <GradeGroupAssignDialog open={!!assigning} onOpenChange={(o) => !o && setAssigning(null)} grade={assigning} />
    </div>
  )
}
