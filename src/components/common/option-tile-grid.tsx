"use client"

// OptionTileGrid — a tappable grid of choices, for masters small enough to show
// whole. Replaces a combobox or Select wherever the operator is standing at a
// machine rather than sitting at a desk.
//
// Every tile leads with its code (mono, the thing painted on the machine) and
// carries its name underneath. Ids never surface.

import { Check, Loader2, Search } from "lucide-react"
import { useMemo, useState } from "react"

import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/common/empty-state"
import { cn } from "@/lib/utils"

export interface OptionTile<T extends string | number> {
  value: T
  /** Leading identifier — machine no, reason code. Rendered mono. */
  code: string
  /** Human name. Rendered under the code. */
  name?: string
  /** Third line, e.g. a machine's group. */
  meta?: string
  disabled?: boolean
}

export type OptionTileGridProps<T extends string | number> = {
  tiles: OptionTile<T>[]
  ariaLabel: string
  isLoading?: boolean
  /** Show a filter box above the grid once the list passes this size. */
  filterThreshold?: number
  filterPlaceholder?: string
  emptyMessage?: string
  emptyDescription?: string
  /**
   * Rendered instead of `EmptyState` when there are no tiles at all. Use when
   * an empty master is a sentence, not a call to action.
   */
  emptyInline?: string
  /** Trailing note under the grid, e.g. a truncation warning. */
  footnote?: string
  /** Tailwind grid-cols classes. Defaults to a tablet-friendly 2→3→4. */
  columnsClassName?: string
  className?: string
} & (
  | {
      /** Single-select: one value, `role="radio"` tiles. */
      multiple?: false
      value: T | undefined
      onChange: (value: T) => void
    }
  | {
      /** Multi-select: a set of values, `role="checkbox"` tiles that toggle. */
      multiple: true
      value: readonly T[]
      onChange: (value: T) => void
    }
)

export function OptionTileGrid<T extends string | number>({
  tiles,
  ariaLabel,
  isLoading,
  filterThreshold = 12,
  filterPlaceholder = "Filter…",
  emptyMessage = "Nothing to choose from",
  emptyDescription = "No options are configured for this selection.",
  emptyInline,
  footnote,
  columnsClassName = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  className,
  ...select
}: OptionTileGridProps<T>) {
  const multiple = select.multiple === true
  const isSelected = (v: T) =>
    multiple ? (select.value as readonly T[]).includes(v) : (select.value as T | undefined) === v
  const onChange = select.onChange as (value: T) => void
  const [query, setQuery] = useState("")
  const showFilter = tiles.length > filterThreshold

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tiles
    return tiles.filter(
      (t) =>
        t.code.toLowerCase().includes(q) ||
        (t.name ?? "").toLowerCase().includes(q) ||
        (t.meta ?? "").toLowerCase().includes(q)
    )
  }, [tiles, query])

  if (isLoading) {
    return (
      <div className={cn("grid gap-2", columnsClassName, className)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-[72px] animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  if (tiles.length === 0) {
    if (emptyInline === "") return null
    if (emptyInline) return <p className="text-sm text-muted-foreground">{emptyInline}</p>
    return <EmptyState title={emptyMessage} description={emptyDescription} />
  }

  return (
    <div className={cn("space-y-3", className)}>
      {showFilter && (
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={filterPlaceholder}
            aria-label={`Filter ${ariaLabel}`}
            className="h-11 pl-9"
          />
        </div>
      )}

      {visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nothing matches &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <div
          role={multiple ? "group" : "radiogroup"}
          aria-label={ariaLabel}
          // Arrow keys move between tiles, so the grid behaves like the single
          // widget its role claims to be rather than N separate tab stops.
          onKeyDown={(e) => {
            const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
            if (!delta) return
            const tabbable = Array.from(
              e.currentTarget.querySelectorAll<HTMLButtonElement>("button:not([disabled])")
            )
            const at = tabbable.indexOf(document.activeElement as HTMLButtonElement)
            if (at < 0) return
            e.preventDefault()
            tabbable[(at + delta + tabbable.length) % tabbable.length]?.focus()
          }}
          className={cn("grid gap-2", columnsClassName)}
        >
          {visible.map((t) => {
            const selected = isSelected(t.value)
            return (
              <button
                key={String(t.value)}
                type="button"
                role={multiple ? "checkbox" : "radio"}
                aria-checked={selected}
                disabled={t.disabled}
                onClick={() => onChange(t.value)}
                className={cn(
                  "relative min-h-[72px] min-w-0 rounded-lg border p-3 text-left transition-colors",
                  "focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none",
                  "disabled:pointer-events-none disabled:opacity-50",
                  selected
                    ? "border-primary bg-primary/5 ring-primary/20 ring-2"
                    : "bg-card hover:border-foreground/20 hover:bg-accent"
                )}
              >
                {selected && (
                  <Check className="absolute top-2 right-2 size-4 text-primary" aria-hidden />
                )}
                <span
                  className={cn(
                    "block truncate pr-5 font-mono text-sm leading-tight",
                    selected ? "font-semibold text-foreground" : "font-medium"
                  )}
                >
                  {t.code}
                </span>
                {t.name && (
                  <span className="mt-1 line-clamp-2 block text-xs leading-snug text-muted-foreground">
                    {t.name}
                  </span>
                )}
                {t.meta && (
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground/80">{t.meta}</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {showFilter && (
        <p className="text-xs text-muted-foreground">
          Showing {visible.length} of {tiles.length}.
        </p>
      )}

      {footnote && <p className="text-xs text-muted-foreground">{footnote}</p>}
    </div>
  )
}

/** A small spinner row, for when a grid's data is refetching in place. */
export function OptionTileGridLoading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> {label}
    </div>
  )
}
