"use client"

// SegmentedControl — every option visible at once, sized for a gloved thumb.
//
// Used where a Select would hide the choices behind a tap: area, shift, waste
// type. Not a replacement for Select in dense desktop filter rows — this is
// deliberately 48px tall and wraps rather than truncates.

import { cn } from "@/lib/utils"

export interface SegmentedOption<T extends string | number> {
  value: T
  label: string
  /** Small second line, e.g. a shift's time window. */
  sublabel?: string
  disabled?: boolean
}

export interface SegmentedControlProps<T extends string | number> {
  value: T | undefined
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  /** Accessible group name. Rendered visually by the caller's own label. */
  ariaLabel: string
  className?: string
}

export function SegmentedControl<T extends string | number>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("flex flex-wrap gap-1.5 rounded-lg bg-muted p-1.5", className)}
    >
      {options.map((o) => {
        const selected = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "min-h-[48px] min-w-[64px] flex-1 rounded-md px-4 py-2 transition-colors",
              "focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none",
              "disabled:pointer-events-none disabled:opacity-50",
              selected
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
            )}
          >
            <span className={cn("block text-sm whitespace-nowrap", selected ? "font-semibold" : "font-medium")}>
              {o.label}
            </span>
            {o.sublabel && (
              <span className="mt-0.5 block font-mono text-[11px] leading-none text-muted-foreground">
                {o.sublabel}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
