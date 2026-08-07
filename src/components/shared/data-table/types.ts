// DataTable Types

import type { ReactNode } from "react"

/**
 * Column definition for DataTable
 */
export interface ColumnDef<TData> {
  /** Unique identifier for the column */
  id: string
  /** Column header label */
  header: string
  /** Accessor key to get cell value from data */
  accessorKey?: keyof TData
  /** Custom cell renderer */
  cell?: (row: TData, index: number) => ReactNode
  /** Column width class (e.g., 'w-[100px]') */
  width?: string
  /** Additional class names for header */
  headerClassName?: string
  /** Additional class names for cell */
  cellClassName?: string
  /** Hide column on mobile */
  hideOnMobile?: boolean
  /** Pin column to left or right while horizontal-scrolling. */
  sticky?: "left" | "right"
  /** Exact rendered width in pixels. Required for sticky columns so the
   *  table can compute stable cumulative offsets without the cell-padding
   *  gaps that `w-[Npx]` Tailwind classes leave behind under
   *  `table-layout: auto`. Applied as `width / min-width / max-width` with
   *  `box-sizing: border-box` so padding fits inside the declared width. */
  widthPx?: number
  /** Manual offset override in pixels from the sticky edge. Usually leave
   *  unset — the DataTable computes it automatically from preceding
   *  `widthPx` values on the same side. */
  stickyOffset?: number
  /** Whether the user can hide this column via the column-visibility menu.
   *  Default true. Set to false for required columns (e.g. row identifier). */
  canHide?: boolean
  /** Whether this column starts hidden. User can still toggle it on. */
  defaultHidden?: boolean
  /** Backend sort key for this column (the proto `sort_by` value).
   *
   *  Set it *only* when the server can actually sort by this column — a
   *  `sort_by` the repository's sortColumnMap does not know silently empties
   *  the list. A column with no `sortKey` renders as a plain header, so it
   *  never promises an order the server would reject.
   *
   *  Requires `onSort` on the DataTable; without it the header stays plain. */
  sortKey?: string
}

/**
 * Action definition for row actions
 */
export interface RowAction<TData> {
  /** Unique identifier for the action */
  id: string
  /** Action label */
  label: string
  /** Icon component */
  icon?: ReactNode
  /** Action handler */
  onClick: (row: TData) => void
  /** Whether to show in destructive color */
  variant?: "default" | "destructive"
  /** Whether the action is disabled */
  disabled?: (row: TData) => boolean
}

/**
 * DataTable props
 */
export interface DataTableProps<TData> {
  /** Data to display */
  data: TData[]
  /** Column definitions */
  columns: ColumnDef<TData>[]
  /** Unique key field in data (use getRowKey for nested data) */
  keyField?: keyof TData
  /** Custom function to extract a unique key from a row (for nested data structures) */
  getRowKey?: (row: TData, index: number) => string
  /** Row actions */
  actions?: RowAction<TData>[]
  /** Loading state */
  isLoading?: boolean
  /** Empty state message */
  emptyMessage?: string
  /** Empty state description */
  emptyDescription?: string
  /** Skeleton row count when loading */
  skeletonRowCount?: number
  /** Stable id used to persist column-visibility preferences in localStorage.
   *  When set, a column-visibility dropdown appears above the table. */
  tableId?: string
  /** Suppress DataTable's own internal Columns-button row (still keeps
   *  `tableId` driving the localStorage-backed visibility state). Use this
   *  when the caller renders its own `<ColumnVisibilityMenu>` elsewhere
   *  (e.g. inline with a filters/active-filters row) via the exported
   *  `useColumnVisibility` hook + `ColumnVisibilityMenu` component with the
   *  same `tableId`/`columns`, so state stays in sync. Default false. */
  hideColumnsButton?: boolean
  /** Pin the row-actions column to the right. Default false. */
  stickyActions?: boolean
  /** Active backend sort key. Pairs with `ColumnDef.sortKey`. */
  sortBy?: string
  /** Active sort direction. */
  sortOrder?: "asc" | "desc"
  /** Called with a column's `sortKey` when its header is clicked. The caller
   *  owns the cycling policy (asc → desc → none) and resetting the page. */
  onSort?: (sortKey: string) => void
  /** Render more compactly (tighter cell padding, smaller text) so more rows
   *  fit without scrolling. Used by dense pickers such as Pull-from-Orion. */
  dense?: boolean
}

/**
 * Pagination props
 */
export interface DataTablePaginationProps {
  /** Current page (1-indexed) */
  currentPage: number
  /** Items per page */
  pageSize: number
  /** Total number of items */
  totalItems: number
  /** Total number of pages */
  totalPages: number
  /** Page change handler */
  onPageChange: (page: number) => void
  /** Page size change handler */
  onPageSizeChange: (pageSize: number) => void
  /** Available page size options */
  pageSizeOptions?: number[]
}
