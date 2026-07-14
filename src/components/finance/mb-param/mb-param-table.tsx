"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronRight, Loader2, Pencil, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/common/status-badge"
import { SortableHeader } from "@/components/shared/data-table/sortable-header"
import { useColumnVisibility } from "@/components/shared/data-table/use-column-visibility"
import type { ColumnDef } from "@/components/shared/data-table/types"

import type { MbParam, MbParamOption } from "@/types/finance/mb-param"

export const MB_PARAM_TABLE_ID = "finance-mb-param"

const BACKEND_SORTABLE_KEYS = new Set(["code", "name", "type", "created_at"])

export const MB_PARAM_COLUMNS: ColumnDef<MbParam>[] = [
  { id: "code", header: "Code", canHide: false },
  { id: "name", header: "Name" },
  { id: "type", header: "Type" },
  { id: "default", header: "Default" },
  { id: "unit", header: "Unit" },
  { id: "status", header: "Status" },
]

export function useMbParamTableColumns() {
  const columns = useMemo(() => MB_PARAM_COLUMNS, [])
  const { visibility, toggle, setAll, reset } = useColumnVisibility(MB_PARAM_TABLE_ID, columns)
  return { columns, visibility, toggle, setAll, reset }
}

interface MbParamTableProps {
  items: MbParam[]
  isLoading: boolean
  onEdit: (param: MbParam) => void
  onDelete: (param: MbParam) => void
  onAddOption: (param: MbParam) => void
  onEditOption: (param: MbParam, option: MbParamOption) => void
  onDeleteOption: (param: MbParam, option: MbParamOption) => void
  sortBy?: string
  sortOrder?: "asc" | "desc"
  onSort: (sortKey: string) => void
  visibility: Record<string, boolean>
}

export function MbParamTable({
  items,
  isLoading,
  onEdit,
  onDelete,
  onAddOption,
  onEditOption,
  onDeleteOption,
  sortBy,
  sortOrder,
  onSort,
  visibility,
}: MbParamTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggleExpanded(mbpId: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(mbpId)) next.delete(mbpId)
      else next.add(mbpId)
      return next
    })
  }

  const show = (id: string) => visibility[id] !== false
  const visibleCount = MB_PARAM_COLUMNS.filter((c) => show(c.id)).length + 2

  const sortProps = { currentSortBy: sortBy, currentSortOrder: sortOrder, onSort }

  function renderHeader(col: ColumnDef<MbParam>, className?: string) {
    if (BACKEND_SORTABLE_KEYS.has(col.id)) {
      return <SortableHeader key={col.id} label={col.header} sortKey={col.id} className={className} {...sortProps} />
    }
    return (
      <TableHead key={col.id} className={className}>
        {col.header}
      </TableHead>
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            {show("code") && renderHeader(MB_PARAM_COLUMNS[0], "w-28")}
            {show("name") && renderHeader(MB_PARAM_COLUMNS[1])}
            {show("type") && renderHeader(MB_PARAM_COLUMNS[2], "w-24")}
            {show("default") && renderHeader(MB_PARAM_COLUMNS[3])}
            {show("unit") && renderHeader(MB_PARAM_COLUMNS[4], "w-20")}
            {show("status") && renderHeader(MB_PARAM_COLUMNS[5], "w-24")}
            <TableHead className="w-24 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={visibleCount} className="py-10 text-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading parameters…
              </TableCell>
            </TableRow>
          )}
          {!isLoading && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={visibleCount} className="py-10 text-center text-sm text-muted-foreground">
                No parameters found.
              </TableCell>
            </TableRow>
          )}
          {!isLoading &&
            items.map((p) => {
              const isPicklist = p.type === "PICKLIST"
              const isOpen = expanded.has(p.mbpId)
              return (
                <ParamRow
                  key={p.mbpId}
                  param={p}
                  isPicklist={isPicklist}
                  isOpen={isOpen}
                  visibleCount={visibleCount}
                  show={show}
                  onToggle={() => toggleExpanded(p.mbpId)}
                  onEdit={() => onEdit(p)}
                  onDelete={() => onDelete(p)}
                  onAddOption={() => onAddOption(p)}
                  onEditOption={(o) => onEditOption(p, o)}
                  onDeleteOption={(o) => onDeleteOption(p, o)}
                />
              )
            })}
        </TableBody>
      </Table>
    </div>
  )
}

function ParamRow({
  param,
  isPicklist,
  isOpen,
  visibleCount,
  show,
  onToggle,
  onEdit,
  onDelete,
  onAddOption,
  onEditOption,
  onDeleteOption,
}: {
  param: MbParam
  isPicklist: boolean
  isOpen: boolean
  visibleCount: number
  show: (id: string) => boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onAddOption: () => void
  onEditOption: (option: MbParamOption) => void
  onDeleteOption: (option: MbParamOption) => void
}) {
  const options = param.options ?? []
  return (
    <>
      <TableRow className="hover:bg-muted/50">
        <TableCell>
          <button
            type="button"
            onClick={onToggle}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
            disabled={!isPicklist}
            aria-label={isOpen ? "Collapse options" : "Expand options"}
          >
            {isPicklist ? (
              isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            ) : null}
          </button>
        </TableCell>
        {show("code") && <TableCell className="font-mono text-xs">{param.code}</TableCell>}
        {show("name") && <TableCell className="text-sm">{param.name}</TableCell>}
        {show("type") && <TableCell className="text-sm">{isPicklist ? "Picklist" : "Scalar"}</TableCell>}
        {show("default") && (
          <TableCell className="text-sm">
            {isPicklist ? (param.defaultOption || "—") : (param.defaultValue || "—")}
          </TableCell>
        )}
        {show("unit") && <TableCell className="text-sm text-muted-foreground">{param.unit || "—"}</TableCell>}
        {show("status") && (
          <TableCell>
            <StatusBadge status={param.isActive ? "ACTIVE" : "INACTIVE"} type="generic" size="sm" />
          </TableCell>
        )}
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} aria-label="Edit">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onDelete}
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {isPicklist && isOpen && (
        <TableRow>
          <TableCell colSpan={visibleCount} className="bg-muted/30 p-0">
            <div className="space-y-2 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Options ({options.length})
                </span>
                <Button variant="outline" size="sm" onClick={onAddOption}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Option
                </Button>
              </div>
              {options.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">No options defined.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border bg-background">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-28">Code</TableHead>
                        <TableHead>Numeric Value</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-24">Status</TableHead>
                        <TableHead className="w-20 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {options.map((o) => (
                        <TableRow key={o.mbpoId}>
                          <TableCell className="font-mono text-xs">{o.code}</TableCell>
                          <TableCell className="text-sm">{o.numericValue}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {o.description || "—"}
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              status={o.isActive ? "ACTIVE" : "INACTIVE"}
                              type="generic"
                              size="sm"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => onEditOption(o)}
                                aria-label="Edit option"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => onDeleteOption(o)}
                                aria-label="Delete option"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
