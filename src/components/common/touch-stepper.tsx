"use client"

// TouchStepper — the progress rail for a multi-step touch flow.
//
// Shows where the operator is, what is already done, and lets them jump back to
// any step they have completed. Forward jumps are blocked so per-step validation
// cannot be skipped; the caller decides how far "completed" reaches.
//
// On narrow tablets the labels collapse to numbers and a single caption line —
// the rail must never be the thing that causes a horizontal scroll.

import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

export interface TouchStep {
  id: string
  label: string
}

export interface TouchStepperProps {
  steps: TouchStep[]
  /** Zero-based index of the step being shown. */
  current: number
  /** Highest index the user may jump to. Anything beyond is locked. */
  maxReachable: number
  onStepChange: (index: number) => void
  className?: string
}

export function TouchStepper({ steps, current, maxReachable, onStepChange, className }: TouchStepperProps) {
  return (
    <nav aria-label="Entry progress" className={cn("min-w-0", className)}>
      <ol className="flex min-w-0 items-center gap-1">
        {steps.map((s, i) => {
          const done = i < current
          const active = i === current
          const locked = i > maxReachable
          return (
            <li key={s.id} className="flex min-w-0 flex-1 items-center gap-1">
              <button
                type="button"
                disabled={locked}
                aria-current={active ? "step" : undefined}
                onClick={() => onStepChange(i)}
                className={cn(
                  "flex min-h-[44px] min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
                  "focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none",
                  locked ? "cursor-not-allowed opacity-40" : "hover:bg-accent"
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                    active && "bg-primary text-primary-foreground",
                    done && "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
                    !active && !done && "bg-muted text-muted-foreground"
                  )}
                >
                  {done ? <Check className="size-3.5" aria-hidden /> : i + 1}
                </span>
                <span
                  className={cn(
                    "hidden min-w-0 truncate text-xs lg:block",
                    active ? "font-semibold text-foreground" : "text-muted-foreground"
                  )}
                >
                  {s.label}
                </span>
              </button>
              {i < steps.length - 1 && (
                <span
                  aria-hidden
                  className={cn("h-px w-2 shrink-0 sm:w-4", done ? "bg-emerald-500/50" : "bg-border")}
                />
              )}
            </li>
          )
        })}
      </ol>
      <p className="mt-1 truncate text-xs text-muted-foreground lg:hidden">
        Step {current + 1} of {steps.length} · {steps[current]?.label}
      </p>
    </nav>
  )
}
