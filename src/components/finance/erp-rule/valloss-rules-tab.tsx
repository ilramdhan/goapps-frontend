"use client"

import { Plus } from "lucide-react"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ConfirmDialog } from "@/components/shared/confirm-dialog/confirm-dialog"
import { useDeleteValLossRule, useValLossRules } from "@/hooks/finance/use-erp-rule"
import { usePermission } from "@/lib/hooks/use-permission"
import type { ValLossRule } from "@/types/finance/erp-rule"
import { VallossRuleFormDialog } from "./valloss-rule-form-dialog"

const ALL = "all"

export function VallossRulesTab() {
  const { hasPermission } = usePermission()
  const [fgType, setFgType] = useState("")
  const [prodType, setProdType] = useState(ALL)
  const [gradeGroup, setGradeGroup] = useState("")
  const [active, setActive] = useState("true")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ValLossRule | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ValLossRule | null>(null)

  const { data, isLoading } = useValLossRules({
    fgType: fgType || undefined,
    prodType: prodType === ALL ? undefined : prodType,
    gradeGroup: gradeGroup || undefined,
    isActive: active === ALL ? undefined : active === "true",
  })
  const deleteMutation = useDeleteValLossRule()
  const items = data?.items ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input className="h-9 w-40" placeholder="FG type" value={fgType} onChange={(e) => setFgType(e.target.value)} />
        <Select value={prodType} onValueChange={setProdType}>
          <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All prod types</SelectItem>
            {["POY", "PTY", "ITY"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input className="h-9 w-40" placeholder="Grade group" value={gradeGroup} onChange={(e) => setGradeGroup(e.target.value)} />
        <Select value={active} onValueChange={setActive}>
          <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
            <SelectItem value={ALL}>All</SelectItem>
          </SelectContent>
        </Select>
        {hasPermission("finance.cost.erprule.create") && (
          <Button className="ml-auto" onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" /> Create rule
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>FG type</TableHead>
            <TableHead>Prod type</TableHead>
            <TableHead>Grade group</TableHead>
            <TableHead>Basis</TableHead>
            <TableHead>Val loss</TableHead>
            <TableHead>Active</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
          ) : items.length === 0 ? (
            <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No rules</TableCell></TableRow>
          ) : (
            items.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.fgType}</TableCell>
                <TableCell>{r.prodType}</TableCell>
                <TableCell>{r.gradeGroup}</TableCell>
                <TableCell>{r.basis}</TableCell>
                <TableCell className="font-mono">{r.valLoss}</TableCell>
                <TableCell><Badge variant={r.isActive ? "default" : "secondary"}>{r.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                <TableCell>{r.updatedAt}</TableCell>
                <TableCell className="text-right space-x-2">
                  {hasPermission("finance.cost.erprule.update") && (
                    <Button size="sm" variant="outline" onClick={() => { setEditing(r); setFormOpen(true) }}>Edit</Button>
                  )}
                  {hasPermission("finance.cost.erprule.delete") && (
                    <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(r)}>Delete</Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <VallossRuleFormDialog open={formOpen} onOpenChange={setFormOpen} rule={editing} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Rule"
        description={`Rule ${deleteTarget?.fgType} / ${deleteTarget?.prodType} / ${deleteTarget?.gradeGroup} will be deactivated.`}
        variant="destructive"
        confirmText="Delete"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          // 412 "rule in use" is surfaced as an error toast by the hook
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) })
        }}
      />
    </div>
  )
}
