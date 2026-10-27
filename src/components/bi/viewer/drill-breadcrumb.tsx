"use client"

// Drill breadcrumb — shows the current drill path; clicking an ancestor jumps back.

import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

interface DrillBreadcrumbProps {
  /** Dashboard title shown as the root crumb. */
  rootLabel: string
  /** Current drill path (e.g. ["INCOME"] or ["EBITDA","INCOME"]). */
  path: string[]
  /** Called with the truncated path when an ancestor crumb is clicked. Root → []. */
  onJump: (newPath: string[]) => void
  /** Optional display label for a path segment (e.g. NIK → "NIK — Nama"); defaults to the segment. */
  labelFor?: (segment: string) => string
}

export function DrillBreadcrumb({ rootLabel, path, onJump, labelFor }: DrillBreadcrumbProps) {
  if (path.length === 0) {
    return <div className="text-sm font-medium text-muted-foreground">{rootLabel}</div>
  }
  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm">
      <button
        type="button"
        onClick={() => onJump([])}
        className="font-medium text-primary hover:underline"
      >
        {rootLabel}
      </button>
      {path.map((segment, idx) => {
        const isLast = idx === path.length - 1
        return (
          <span key={`${segment}-${idx}`} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <button
              type="button"
              onClick={() => onJump(path.slice(0, idx + 1))}
              disabled={isLast}
              className={cn(
                "hover:underline",
                isLast ? "font-semibold text-foreground" : "text-primary"
              )}
            >
              {labelFor ? labelFor(segment) : segment}
            </button>
          </span>
        )
      })}
    </nav>
  )
}
