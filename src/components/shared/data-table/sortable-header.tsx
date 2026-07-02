"use client"

import { TableHead } from "@/components/ui/table"
import { cn } from "@/lib/utils"

interface SortableHeaderProps {
  /** Visible column label. */
  label: string
  /** Sort key sent to the backend (proto sort_by value). */
  sortKey: string
  /** Currently active sort key (from filters). */
  currentSortBy?: string
  /** Currently active sort direction (from filters). */
  currentSortOrder?: "asc" | "desc"
  /** Called with the column's sortKey when the header is clicked. */
  onSort: (sortKey: string) => void
  /** Extra classes for the underlying TableHead (widths, edge padding). */
  className?: string
}

/**
 * Stacked-triangles sort indicator (Font Awesome "fa-sort" style).
 * Neutral: both triangles muted. Asc: top filled. Desc: bottom filled.
 */
function SortIndicator({ direction }: { direction?: "asc" | "desc" }) {
  return (
    <svg viewBox="0 0 8 12" aria-hidden="true" className="h-3 w-2 shrink-0">
      <path
        d="M4 0.5 L7.5 5 H0.5 Z"
        fill="currentColor"
        className={direction === "asc" ? "text-foreground" : "text-muted-foreground/40"}
      />
      <path
        d="M4 11.5 L0.5 7 H7.5 Z"
        fill="currentColor"
        className={direction === "desc" ? "text-foreground" : "text-muted-foreground/40"}
      />
    </svg>
  )
}

/**
 * SortableHeader — table header cell that is clickable across its whole width.
 *
 * The entire TableHead is the click target (cursor-pointer, no hover
 * background); a stacked-triangles indicator shows the sort state and
 * `aria-sort` is set for assistive technology. Direction cycling
 * (asc → desc, reset to asc on column change) is owned by the caller.
 */
export function SortableHeader({
  label,
  sortKey,
  currentSortBy,
  currentSortOrder,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = currentSortBy === sortKey
  const direction = isActive ? (currentSortOrder === "desc" ? "desc" : "asc") : undefined

  return (
    <TableHead
      className={cn("cursor-pointer select-none", className)}
      aria-sort={direction === "desc" ? "descending" : direction === "asc" ? "ascending" : undefined}
      tabIndex={0}
      onClick={() => onSort(sortKey)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSort(sortKey)
        }
      }}
    >
      <span
        className={cn(
          "flex items-center gap-1.5 text-xs font-medium",
          isActive ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        <SortIndicator direction={direction} />
      </span>
    </TableHead>
  )
}
