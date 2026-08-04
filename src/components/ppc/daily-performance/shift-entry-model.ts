// Shift-entry draft model + per-step validation.
//
// Kept apart from the components so the rules are testable and so every step
// asks the same function whether it may advance. Validation is inline and
// pre-submit by design (S-3.8): nothing knowable here should reach a toast.

import type { DowntimeEntry, WasteEntry } from "@/types/ppc/daily-performance"
import { todayLocalIso } from "@/types/ppc/common"

export const SHIFT_ENTRY_STEPS = [
  { id: "context", label: "Machine & shift" },
  { id: "positions", label: "Positions" },
  { id: "downtime", label: "Downtime" },
  { id: "waste", label: "Waste" },
  { id: "review", label: "Review" },
] as const

export type ShiftEntryStepId = (typeof SHIFT_ENTRY_STEPS)[number]["id"]

/** A downtime row while it is being edited. Duration stays a string until submit. */
export interface DowntimeDraft {
  /** Stable key so React does not re-key rows when one is deleted. */
  key: string
  reasonId: number
  reasonCode: string
  reasonName: string
  durationMin: string
  notes: string
}

/** A waste row while it is being edited. */
export interface WasteDraft {
  key: string
  categoryId: number
  categoryCode: string
  categoryName: string
  categoryType: string
  qtyKg: string
  isUpset: boolean
  notes: string
}

export interface ShiftEntryDraft {
  area: number
  machineId: number
  machineNo: string
  date: string
  shift: string
  shiftName: string
  positionsTotal: string
  positionsRunning: string
  downtime: DowntimeDraft[]
  waste: WasteDraft[]
}

export function emptyDraft(area: number, date: string): ShiftEntryDraft {
  return {
    area,
    machineId: 0,
    machineNo: "",
    date,
    shift: "",
    shiftName: "",
    positionsTotal: "",
    positionsRunning: "",
    downtime: [],
    waste: [],
  }
}

let keySeq = 0
/** Monotonic row key. Index keys break when a middle row is deleted. */
export function nextRowKey(prefix: string): string {
  keySeq += 1
  return `${prefix}-${keySeq}`
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Field-keyed problems for the step being shown. Empty means the step is clear. */
export type StepProblems = Record<string, string>

export function validateStep(step: ShiftEntryStepId, d: ShiftEntryDraft): StepProblems {
  const p: StepProblems = {}

  if (step === "context") {
    if (!d.machineId) p.machine = "Pick the machine you are recording."
    if (!d.date) p.date = "Pick the production date."
    else if (d.date > todayLocalIso()) p.date = "The date cannot be in the future."
    if (!d.shift) p.shift = "Pick the shift."
    return p
  }

  if (step === "positions") {
    const total = toInt(d.positionsTotal)
    const running = toInt(d.positionsRunning)
    if (d.positionsTotal === "") p.positionsTotal = "Enter how many positions this machine has."
    else if (total === null || total <= 0) p.positionsTotal = "Positions must be a whole number above zero."
    if (d.positionsRunning === "") p.positionsRunning = "Enter how many positions actually ran."
    else if (running === null || running < 0) p.positionsRunning = "Running positions must be zero or more."
    else if (total !== null && running > total) {
      p.positionsRunning = `Running cannot exceed the ${total} positions on the machine.`
    }
    return p
  }

  if (step === "downtime") {
    const bad = d.downtime.findIndex((x) => {
      const m = toInt(x.durationMin)
      return x.durationMin === "" || m === null || m <= 0
    })
    if (bad >= 0) {
      p[`downtime.${d.downtime[bad].key}`] = "Enter a duration above zero, or remove this reason."
    }
    const over = d.downtime.reduce((sum, x) => sum + (toInt(x.durationMin) ?? 0), 0)
    if (over > SHIFT_MINUTES) {
      p.downtimeTotal = `Downtime totals ${over} min, longer than the ${SHIFT_MINUTES}-minute shift.`
    }
    return p
  }

  if (step === "waste") {
    const bad = d.waste.findIndex((x) => {
      const q = toDecimal(x.qtyKg)
      return x.qtyKg === "" || q === null || q <= 0
    })
    if (bad >= 0) {
      p[`waste.${d.waste[bad].key}`] = "Enter a quantity above zero, or remove this category."
    }
    return p
  }

  // review — everything earlier must still hold.
  return {
    ...validateStep("context", d),
    ...validateStep("positions", d),
    ...validateStep("downtime", d),
    ...validateStep("waste", d),
  }
}

/**
 * What a DRAFT must satisfy — deliberately weaker than FINAL.
 *
 * A draft exists to park incomplete work, so it asks for only what the backend
 * genuinely rejects. Verified against the contract rather than guessed:
 *
 *   - `NewMachineShiftLog` (domain/dailyperf) rejects `MachineID <= 0`, an
 *     invalid shift, and an invalid status. Nothing else.
 *   - proto `SubmitShiftEntryRequest`: `machine_id.gt = 0`, `date` 8–10 chars,
 *     `shift` matches `^[1-3]$`. `positions_total.gte = 0` and
 *     `positions_running.max_len = 20` — so **positions may be blank**; the form
 *     already sends 0 / "0" for an empty one.
 *   - proto `WasteEntry.qty_kg` is `min_len: 1`, so a waste row added with no
 *     weight WOULD be rejected. `DowntimeEntry.duration_min` is only `gte 0`,
 *     but a zero-minute downtime event is junk data, so it is held to the same
 *     bar as FINAL.
 *
 * Hence: the context step, plus any rows the user has already added. Positions
 * are skipped entirely.
 */
export function validateDraft(d: ShiftEntryDraft): StepProblems {
  return {
    ...validateStep("context", d),
    ...validateStep("downtime", d),
    ...validateStep("waste", d),
  }
}

/** A standard shift is 8 hours. Used only to catch an obviously wrong duration. */
export const SHIFT_MINUTES = 480

export function toInt(v: string): number | null {
  if (v.trim() === "") return null
  const n = Number(v)
  return Number.isInteger(n) ? n : null
}

export function toDecimal(v: string): number | null {
  if (v.trim() === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// Local-timezone date helpers live in types/ppc/common alongside todayIso(), so
// every PPC screen shares one definition of "today". Re-exported here because
// this module's own rules (the future-date check) depend on them.
export { todayLocalIso, localIsoOffset } from "@/types/ppc/common"

// ---------------------------------------------------------------------------
// Draft → wire payload. The shape is unchanged from the pre-rework form.
// ---------------------------------------------------------------------------

export function toDowntimeEntries(rows: DowntimeDraft[]): DowntimeEntry[] {
  return rows
    .filter((x) => x.reasonId > 0)
    .map((x) => ({
      reasonId: x.reasonId,
      durationMin: toInt(x.durationMin) ?? 0,
      notes: x.notes,
    }))
}

export function toWasteEntries(rows: WasteDraft[]): WasteEntry[] {
  return rows
    .filter((x) => x.categoryId > 0)
    .map((x) => ({
      categoryId: x.categoryId,
      qtyKg: x.qtyKg,
      isUpset: x.isUpset,
      notes: x.notes,
    }))
}

/** Total downtime across all rows, for the review screen. */
export function totalDowntimeMin(rows: DowntimeDraft[]): number {
  return rows.reduce((s, x) => s + (toInt(x.durationMin) ?? 0), 0)
}

/** Total waste across all rows, for the review screen. */
export function totalWasteKg(rows: WasteDraft[]): number {
  return rows.reduce((s, x) => s + (toDecimal(x.qtyKg) ?? 0), 0)
}
