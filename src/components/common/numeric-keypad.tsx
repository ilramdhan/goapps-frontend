"use client"

// NumericKeypad — on-screen number entry for touch/tablet use.
//
// Built for the factory floor: an operator wearing gloves must be able to key a
// count or a weight without the OS keyboard ever appearing. Keys are 56px tall
// (well over the 44px touch floor) and the readout is mono + tabular so digits
// do not shift as they are typed.
//
// Three pieces, smallest first:
//   NumericKeypad       — the pad itself. Controlled string value.
//   KeypadTarget        — a big tappable readout that acts as one keypad's field.
//   NumericKeypadDialog — readout + pad in a dialog, for fields inside a list row.

import { Delete, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useState } from "react"

// ---------------------------------------------------------------------------
// Pure value helpers — exported so callers can validate with the same rules
// the pad enforces.
// ---------------------------------------------------------------------------

/** Appends one keypad character to `value`, rejecting anything malformed. */
export function keypadAppend(value: string, key: string, allowDecimal: boolean): string {
  if (key === ".") {
    if (!allowDecimal || value.includes(".")) return value
    return value === "" ? "0." : `${value}.`
  }
  // Drop a leading zero so "0" + "5" reads 5, not 05. "0." is left alone.
  if (value === "0") return key
  return `${value}${key}`
}

/** Removes the last character. */
export function keypadBackspace(value: string): string {
  return value.slice(0, -1)
}

const DIGIT_ROWS = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
]

export interface NumericKeypadProps {
  value: string
  onChange: (next: string) => void
  /** Allow a single decimal point. Counts (positions, minutes) leave this off. */
  allowDecimal?: boolean
  className?: string
}

export function NumericKeypad({ value, onChange, allowDecimal = false, className }: NumericKeypadProps) {
  const key = (k: string) => onChange(keypadAppend(value, k, allowDecimal))

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)} role="group" aria-label="Number pad">
      {DIGIT_ROWS.flat().map((d) => (
        <KeypadKey key={d} label={d} onPress={() => key(d)} />
      ))}
      {allowDecimal ? (
        <KeypadKey label="." onPress={() => key(".")} ariaLabel="Decimal point" />
      ) : (
        <KeypadKey label="00" onPress={() => onChange(keypadAppend(keypadAppend(value, "0", false), "0", false))} />
      )}
      <KeypadKey label="0" onPress={() => key("0")} />
      <KeypadKey
        onPress={() => onChange(keypadBackspace(value))}
        ariaLabel="Backspace"
        muted
        icon={<Delete className="size-5" />}
      />
      <Button
        type="button"
        variant="ghost"
        onClick={() => onChange("")}
        className="col-span-3 h-11 text-xs font-medium tracking-wide text-muted-foreground uppercase"
      >
        <X className="size-3.5" /> Clear
      </Button>
    </div>
  )
}

function KeypadKey({
  label,
  icon,
  onPress,
  ariaLabel,
  muted,
}: {
  label?: string
  icon?: React.ReactNode
  onPress: () => void
  ariaLabel?: string
  muted?: boolean
}) {
  return (
    <Button
      type="button"
      variant={muted ? "secondary" : "outline"}
      aria-label={ariaLabel ?? label}
      onClick={onPress}
      className={cn(
        "h-14 rounded-lg font-mono text-xl font-semibold tabular-nums",
        "active:scale-[0.97] transition-transform",
        muted && "text-muted-foreground"
      )}
    >
      {icon ?? label}
    </Button>
  )
}

// ---------------------------------------------------------------------------
// KeypadTarget — a large readout that behaves as the keypad's active field.
// ---------------------------------------------------------------------------

export interface KeypadTargetProps {
  label: string
  value: string
  /** Shown in place of the value when it is empty. */
  placeholder?: string
  unit?: string
  active?: boolean
  invalid?: boolean
  hint?: string
  onSelect: () => void
  /**
   * Applied to the readout input. The input is `readOnly` so tapping it never
   * raises the OS keyboard; `inputMode` only matters if a platform ignores that.
   */
  inputMode?: "numeric" | "decimal"
  className?: string
}

export function KeypadTarget({
  label,
  value,
  placeholder = "—",
  unit,
  active,
  invalid,
  hint,
  onSelect,
  inputMode = "numeric",
  className,
}: KeypadTargetProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect()
        }
      }}
      aria-pressed={active}
      // role="button" does not support aria-invalid; the hint below carries the
      // problem in text and is announced with it.
      data-invalid={invalid || undefined}
      aria-label={label}
      className={cn(
        "min-h-[76px] w-full min-w-0 cursor-pointer rounded-lg border px-4 py-3 text-left transition-colors",
        "focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none",
        active ? "border-primary bg-primary/5 ring-primary/20 ring-2" : "bg-card hover:bg-accent",
        invalid && "border-destructive",
        className
      )}
    >
      <span className="block text-xs tracking-wide text-muted-foreground uppercase">{label}</span>
      <span className="mt-1 flex items-baseline gap-1.5">
        {/* readOnly, so tapping it cannot raise the OS keyboard. Left in the
            accessibility tree — aria-hidden here would mean the value the
            operator just keyed is never announced. `aria-live` reports each
            change without moving focus off the pad. */}
        <input
          readOnly
          tabIndex={-1}
          inputMode={inputMode}
          value={value}
          placeholder={placeholder}
          aria-label={`${label}: ${value === "" ? "empty" : value}${unit ? ` ${unit}` : ""}`}
          aria-live="polite"
          onChange={() => undefined}
          className={cn(
            "pointer-events-none w-full min-w-0 border-0 bg-transparent p-0 outline-none",
            "font-mono text-3xl leading-none font-semibold tabular-nums",
            "placeholder:text-muted-foreground/50"
          )}
        />
        {unit && <span className="shrink-0 text-xs text-muted-foreground">{unit}</span>}
      </span>
      {hint && (
        <span className={cn("mt-1 block text-xs", invalid ? "text-destructive" : "text-muted-foreground")}>
          {hint}
        </span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// NumericKeypadDialog — for a numeric field that lives inside a list row, where
// an always-open pad would not fit.
// ---------------------------------------------------------------------------

export interface NumericKeypadDialogProps {
  /** Committed value. The dialog edits a copy and only commits on Done. */
  value: string
  onCommit: (next: string) => void
  title: string
  description?: string
  label: string
  unit?: string
  allowDecimal?: boolean
  /** Rendered as the tappable trigger. */
  children: React.ReactNode
}

export function NumericKeypadDialog({
  value,
  onCommit,
  title,
  description,
  label,
  unit,
  allowDecimal = false,
  children,
}: NumericKeypadDialogProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)

  // The draft is re-seeded on open rather than in an effect, so a cancelled edit
  // is discarded without a second render pass.
  const handleOpenChange = (next: boolean) => {
    if (next) setDraft(value)
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description ?? `Tap the digits, then Done.`}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg border bg-muted/40 px-4 py-3">
            <span className="block text-xs tracking-wide text-muted-foreground uppercase">{label}</span>
            <span className="mt-1 flex items-baseline gap-1.5">
              <span
                className={cn(
                  "font-mono text-3xl leading-none font-semibold tabular-nums",
                  draft === "" && "text-muted-foreground/50"
                )}
              >
                {draft === "" ? "0" : draft}
              </span>
              {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
            </span>
          </div>
          <NumericKeypad value={draft} onChange={setDraft} allowDecimal={allowDecimal} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="h-11 flex-1"
            onClick={() => {
              onCommit(draft)
              setOpen(false)
            }}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
