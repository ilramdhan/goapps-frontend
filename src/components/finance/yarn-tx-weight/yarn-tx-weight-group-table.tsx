"use client"

import { Edit, Trash2 } from "lucide-react"

import { EmptyState } from "@/components/common/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  TX_WEIGHT_GRADES,
  groupRulePreviews,
  type YarnTxWeightGroup,
} from "@/types/finance/yarn-tx-weight"

const COL_COUNT = 4 + TX_WEIGHT_GRADES.length

interface Props {
  items: YarnTxWeightGroup[]
  isLoading?: boolean
  canUpdate: boolean
  canDelete: boolean
  onEdit: (group: YarnTxWeightGroup) => void
  onDelete: (group: YarnTxWeightGroup) => void
}

export function YarnTxWeightGroupTable({ items, isLoading, canUpdate, canDelete, onEdit, onDelete }: Props) {
  const showActions = canUpdate || canDelete

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-28">Code</TableHead>
            <TableHead className="min-w-40">Name</TableHead>
            <TableHead className="min-w-56">Product Types</TableHead>
            {TX_WEIGHT_GRADES.map((g) => (
              <TableHead key={g} className="w-28 whitespace-nowrap">{g}</TableHead>
            ))}
            <TableHead className="w-24 text-right">{showActions ? "Actions" : ""}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={COL_COUNT} className="text-center py-8 text-muted-foreground">
                Loading…
              </TableCell>
            </TableRow>
          )}
          {!isLoading && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={COL_COUNT} className="p-0">
                <EmptyState title="No TX weight configs yet. Product types without a config use the ratio fallback." />
              </TableCell>
            </TableRow>
          )}
          {!isLoading &&
            items.map((g) => (
              <TableRow key={g.groupId}>
                <TableCell className="font-mono text-xs font-semibold">{g.code}</TableCell>
                <TableCell>
                  <div className="text-sm">{g.name}</div>
                  {g.description && <div className="text-xs text-muted-foreground">{g.description}</div>}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {g.productTypes.length === 0 && <span className="text-muted-foreground">—</span>}
                    {g.productTypes.map((pt) => (
                      <Badge key={pt.id} variant="secondary" className="font-mono text-xs font-normal" title={pt.name}>
                        {pt.code || `#${pt.id}`}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                {groupRulePreviews(g).map((p) => (
                  <TableCell
                    key={p.grade}
                    className={cn("whitespace-nowrap font-mono text-xs", !p.hasRule && "text-muted-foreground italic")}
                  >
                    {p.preview}
                  </TableCell>
                ))}
                <TableCell className="text-right whitespace-nowrap">
                  {canUpdate && (
                    <Button size="icon" variant="ghost" onClick={() => onEdit(g)} title="Edit">
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button size="icon" variant="ghost" onClick={() => onDelete(g)} title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  )
}
