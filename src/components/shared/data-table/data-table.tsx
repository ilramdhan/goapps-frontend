"use client"

import { type CSSProperties, useMemo } from "react"
import { MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import { ColumnVisibilityMenu } from "./column-visibility-menu"
import { SortableHeader } from "./sortable-header"
import type { ColumnDef, DataTableProps, RowAction } from "./types"
import { useColumnVisibility } from "./use-column-visibility"

// Each shadcn icon-button is ~36px (h-9 w-9) plus 4px gap. Base padding
// (px-2) on the TableCell adds ~16px. Width below covers up to N icons.
const ACTION_BTN_PX = 36
const ACTION_GAP_PX = 4
const ACTIONS_PADDING_PX = 16
function actionsWidth(count: number): number {
  if (count <= 0) return 60
  return ACTIONS_PADDING_PX + count * ACTION_BTN_PX + Math.max(0, count - 1) * ACTION_GAP_PX
}

/**
 * Reusable data table with column-visibility menu and sticky-column support.
 *
 * Sticky columns require `widthPx` so the table can compute exact cumulative
 * offsets. The cell uses `box-sizing: border-box` so that padding fits inside
 * the declared width — which means adjacent sticky cells stay flush with no
 * underlying scroll content peeking through the cell-padding gaps.
 */
export function DataTable<TData>({
  data,
  columns,
  keyField,
  getRowKey,
  actions,
  isLoading,
  emptyMessage = "No data found",
  emptyDescription = "Try adjusting your search or filter criteria",
  skeletonRowCount = 5,
  tableId,
  hideColumnsButton,
  stickyActions,
  sortBy,
  sortOrder,
  onSort,
  dense,
}: DataTableProps<TData>) {
  const { visibility, toggle, setAll, reset } = useColumnVisibility(tableId, columns)
  const showInternalColumnsButton = Boolean(tableId) && !hideColumnsButton
  const visibleColumns = useMemo(
    () => columns.filter((c) => visibility[c.id] !== false),
    [columns, visibility],
  )

  // Compute cumulative sticky offsets from declared widthPx.
  const offsets = useMemo(() => stickyOffsets(visibleColumns), [visibleColumns])

  const resolveKey = (row: TData, index: number): string => {
    if (getRowKey) return getRowKey(row, index)
    if (keyField) {
      const val = row[keyField]
      const str = typeof val === "string" ? val : String(val)
      return str && str !== "[object Object]" ? str : `row-${index}`
    }
    return `row-${index}`
  }

  if (!isLoading && (!data || data.length === 0)) {
    return (
      <div>
        {showInternalColumnsButton && (
          <div className="mb-2 flex justify-end">
            <ColumnVisibilityMenu
              columns={columns}
              visibility={visibility}
              onToggle={toggle}
              onSetAll={setAll}
              onReset={reset}
            />
          </div>
        )}
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-lg font-medium text-muted-foreground">{emptyMessage}</p>
          <p className="text-sm text-muted-foreground">{emptyDescription}</p>
        </div>
      </div>
    )
  }

  const hasActions = actions && actions.length > 0

  return (
    <div className="w-full min-w-0 max-w-full">
      {showInternalColumnsButton && (
        <div className="mb-2 flex justify-end">
          <ColumnVisibilityMenu
            columns={columns}
            visibility={visibility}
            onToggle={toggle}
            onSetAll={setAll}
            onReset={reset}
          />
        </div>
      )}
      <Table>
        <TableHeader className="bg-background">
          <TableRow className="bg-background hover:bg-background">
            {visibleColumns.map((column) => {
              const headClass = cn(
                column.widthPx === undefined && column.width,
                column.headerClassName,
                column.hideOnMobile && "hidden md:table-cell",
                dense && "h-8 px-2",
                stickyClass(column, "header"),
              )
              const headStyle = cellStyle(column, offsets[column.id])
              // A column is only sortable when it declares a backend sort key
              // *and* the caller supplied a handler. Anything else renders as a
              // plain header — never an affordance the server would reject.
              if (column.sortKey && onSort) {
                return (
                  <SortableHeader
                    key={column.id}
                    label={column.header}
                    sortKey={column.sortKey}
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={onSort}
                    className={headClass}
                    style={headStyle}
                  />
                )
              }
              return (
                <TableHead key={column.id} className={headClass} style={headStyle}>
                  {column.header}
                </TableHead>
              )
            })}
            {hasActions && (
              <TableHead
                className={cn(
                  "text-right",
                  stickyActions && "sticky right-0 z-30 bg-background shadow-[-1px_0_0_0_var(--border)]",
                )}
                style={actionsStyle(stickyActions, actions?.length ?? 0)}
              >
                Actions
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: skeletonRowCount }).map((_, i) => (
                <TableRow key={`skeleton-${i}`} className="bg-background hover:bg-background">
                  <TableCell
                    colSpan={visibleColumns.length + (hasActions ? 1 : 0)}
                    className={dense ? "px-2 py-1" : undefined}
                  >
                    <Skeleton className={cn("w-full", dense ? "h-7" : "h-8")} />
                  </TableCell>
                </TableRow>
              ))
            : (!data || data.length === 0)
              ? null
              : data.map((row, rowIndex) => {
            const key = resolveKey(row, rowIndex)
            return (
              <TableRow key={key} className="group bg-background">
                {visibleColumns.map((column) => (
                  <TableCell
                    key={`${key}-${column.id}`}
                    className={cn(
                      column.widthPx === undefined && column.width,
                      column.cellClassName,
                      column.hideOnMobile && "hidden md:table-cell",
                      dense && "px-2 py-1 text-sm",
                      stickyClass(column, "cell"),
                      // Inherit hover from the row so sticky cells follow the
                      // muted highlight when the row is hovered.
                      "group-hover:bg-[color-mix(in_oklch,var(--muted)_50%,var(--background))]",
                    )}
                    style={cellStyle(column, offsets[column.id])}
                  >
                    {column.cell
                      ? column.cell(row, rowIndex)
                      : column.accessorKey
                        ? String(row[column.accessorKey] ?? "-")
                        : "-"}
                  </TableCell>
                ))}
                {hasActions && (
                  <TableCell
                    className={cn(
                      "text-right",
                      stickyActions &&
                        "sticky right-0 z-20 bg-background shadow-[-1px_0_0_0_var(--border)] group-hover:bg-[color-mix(in_oklch,var(--muted)_50%,var(--background))]",
                    )}
                    style={actionsStyle(stickyActions, actions?.length ?? 0)}
                  >
                    <RowActions row={row} actions={actions!} />
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function stickyClass<TData>(column: ColumnDef<TData>, where: "header" | "cell"): string {
  if (!column.sticky) return ""
  const z = where === "header" ? "z-30" : "z-20"
  const shadow =
    column.sticky === "left"
      ? "shadow-[1px_0_0_0_var(--border)]"
      : "shadow-[-1px_0_0_0_var(--border)]"
  return `sticky bg-background ${z} ${shadow}`
}

function cellStyle<TData>(column: ColumnDef<TData>, autoOffset: number | undefined): CSSProperties | undefined {
  const style: CSSProperties = {}
  if (column.widthPx !== undefined) {
    style.width = `${column.widthPx}px`
    style.minWidth = `${column.widthPx}px`
    style.maxWidth = `${column.widthPx}px`
    style.boxSizing = "border-box"
  }
  if (column.sticky) {
    const offset = column.stickyOffset ?? autoOffset ?? 0
    if (column.sticky === "left") style.left = `${offset}px`
    else style.right = `${offset}px`
  }
  return Object.keys(style).length ? style : undefined
}

function actionsStyle(stickyActions: boolean | undefined, count: number): CSSProperties | undefined {
  if (!stickyActions) return undefined
  const w = actionsWidth(count)
  return {
    width: `${w}px`,
    minWidth: `${w}px`,
    maxWidth: `${w}px`,
    boxSizing: "border-box",
    right: 0,
  }
}

/** Computes cumulative sticky offsets in pixels per column. */
function stickyOffsets<TData>(columns: ColumnDef<TData>[]): Record<string, number> {
  const out: Record<string, number> = {}
  let leftAccum = 0
  for (const col of columns) {
    if (col.sticky === "left") {
      out[col.id] = leftAccum
      leftAccum += col.widthPx ?? 0
    }
  }
  let rightAccum = 0
  for (let i = columns.length - 1; i >= 0; i--) {
    const col = columns[i]
    if (col.sticky === "right") {
      out[col.id] = rightAccum
      rightAccum += col.widthPx ?? 0
    }
  }
  return out
}

/** Row actions component with desktop buttons and mobile dropdown. */
function RowActions<TData>({
  row,
  actions,
}: {
  row: TData
  actions: RowAction<TData>[]
}) {
  return (
    <>
      <div className="hidden items-center justify-end gap-1 sm:flex">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant="ghost"
            size="icon"
            onClick={() => action.onClick(row)}
            disabled={action.disabled?.(row)}
            title={action.label}
          >
            {action.icon}
          </Button>
        ))}
      </div>
      <div className="sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {actions.map((action) => (
              <DropdownMenuItem
                key={action.id}
                onClick={() => action.onClick(row)}
                disabled={action.disabled?.(row)}
                className={action.variant === "destructive" ? "text-destructive" : undefined}
              >
                {action.icon && <span className="mr-2">{action.icon}</span>}
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )
}
