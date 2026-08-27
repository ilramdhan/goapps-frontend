"use client"

// MBCheckStatusDisplay (B11) — READ-ONLY rendering of a check-status value.
//
// ~~⭐ 2026-08-23 — user decision, plan §11 item 42 = OPTION (2), SIDE BY SIDE.
// There are now TWO check-status columns and this one component renders both:
//   * `mbh_check_status_calc` — the DERIVED value, computed by the backend. It is
//     the PRIMARY column: table, filter and export use it.
//   * `mbh_check_status`      — the FROZEN Oracle import trace. It appears ONLY on
//     the detail page, read-only, and is never written by the application.
// Which one a caller passes is the caller's choice; the rendering rules are the
// same, so they deliberately do not diverge into two components.~~
//
// ⭐ 2026-08-26 — user decision SUPERSEDES the above: exactly ONE check-status
// column is shown on screen, `mbh_check_status_calc` (the value the application
// calculates). The frozen Oracle column `mbh_check_status` is no longer rendered
// anywhere in the UI — it stays in the database as an archive and stays in the
// TypeScript type / normalizer / payload; it is simply never displayed.
// The `emptyLabel` / `testId` props survive as generic knobs, but there is no
// longer a second live caller passing Oracle-specific wording.
//
// 🔴 This is deliberately NOT a <Select>. Check status is a DERIVED value: it
// follows status / entry status and is computed by the backend. If the form let a
// user pick it, the FE value would race with (and overwrite) that automation.
//
// K-1 consequences that this component exists to honour:
//   * the backend NEVER writes `mbh_check_status`; the derived column is a
//     separate one, `mbh_check_status_calc`;
//   * 207 legacy heads keep `mbh_check_status_calc` NULL — there is no backfill.
// So an absent/blank value is the NORMAL case, not an error. It is rendered as an
// explicit "not yet calculated" hint — never as `0`, never as `"-"`, which would
// read as a real stored value.

interface MBCheckStatusDisplayProps {
  /** Raw value straight from the backend. undefined/null/"" all mean "not calculated". */
  value?: string | null
  id?: string
  /**
   * Text shown when there is no value. Defaults to the derived-column wording.
   * The frozen Oracle column passes its own wording: an absent Oracle value means
   * "Oracle never supplied one", which is a DIFFERENT fact from "the application
   * has not calculated it yet", and collapsing the two would mislead.
   */
  emptyLabel?: string
  /** Overrides data-testid so the two side-by-side instances stay distinguishable. */
  testId?: string
}

export function MBCheckStatusDisplay({
  value,
  id,
  emptyLabel = "Belum dihitung",
  testId = "mb-check-status-display",
}: MBCheckStatusDisplayProps) {
  const hasValue = typeof value === "string" && value.trim() !== ""

  return (
    <div
      id={id}
      data-testid={testId}
      data-has-value={hasValue ? "true" : "false"}
      aria-readonly="true"
      className="border-input bg-muted text-muted-foreground flex h-9 w-full items-center rounded-md border px-3 py-1 text-sm"
    >
      {hasValue ? (
        <span className="text-foreground">{value}</span>
      ) : (
        <span className="italic">{emptyLabel}</span>
      )}
    </div>
  )
}
