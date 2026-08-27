"use client"

// MBAdditionalShadesField — inline editor for `mst_mb_head_shade` rows.
//
// Hard rules encoded here (they mirror the DB CHECK on mbhs_seq_no):
//   * AT MOST 2 rows. Sequence numbers are 1 and 2 — nothing else exists.
//     "Add" is disabled once two rows are present.
//   * `mbhsShadeCode` is REQUIRED on any row that exists (NOT NULL in DB).
//   * `mbhsShadeName` is OPTIONAL (nullable in DB) and may stay empty.
// Combined with the header shade this yields up to three shades per recipe.

import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/** DB CHECK mbhs_seq_no IN (1, 2) — two is the ceiling, not a UI preference. */
export const MAX_ADDITIONAL_SHADES = 2

export interface AdditionalShadeRow {
  mbhsSeqNo: number
  mbhsShadeCode: string
  mbhsShadeName: string
}

interface MBAdditionalShadesFieldProps {
  value: AdditionalShadeRow[]
  onChange: (rows: AdditionalShadeRow[]) => void
  disabled?: boolean
}

export function MBAdditionalShadesField({ value, onChange, disabled }: MBAdditionalShadesFieldProps) {
  const rows = value ?? []
  const atCeiling = rows.length >= MAX_ADDITIONAL_SHADES

  function addRow() {
    if (atCeiling) return
    // Sequence numbers are positional: row index 0 -> seq 1, index 1 -> seq 2.
    onChange([...rows, { mbhsSeqNo: rows.length + 1, mbhsShadeCode: "", mbhsShadeName: "" }])
  }

  function removeRow(index: number) {
    // Re-number after removal so the surviving row is always seq 1.
    onChange(rows.filter((_, i) => i !== index).map((r, i) => ({ ...r, mbhsSeqNo: i + 1 })))
  }

  function patchRow(index: number, patch: Partial<AdditionalShadeRow>) {
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  return (
    <div className="space-y-2" data-testid="mb-additional-shades">
      {rows.length === 0 && (
        <p className="text-muted-foreground text-sm">No additional shades.</p>
      )}
      {rows.map((row, index) => (
        <div key={row.mbhsSeqNo} className="flex items-end gap-2">
          <span className="text-muted-foreground w-10 shrink-0 pb-2 text-sm">#{row.mbhsSeqNo}</span>
          <div className="flex-1">
            <Input
              aria-label={`Additional shade ${row.mbhsSeqNo} code`}
              placeholder="Shade Code (required)"
              value={row.mbhsShadeCode}
              maxLength={20}
              disabled={disabled}
              onChange={(e) => patchRow(index, { mbhsShadeCode: e.target.value })}
            />
          </div>
          <div className="flex-1">
            <Input
              aria-label={`Additional shade ${row.mbhsSeqNo} name`}
              placeholder="Shade Name (optional)"
              value={row.mbhsShadeName}
              maxLength={100}
              disabled={disabled}
              onChange={(e) => patchRow(index, { mbhsShadeName: e.target.value })}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remove additional shade ${row.mbhsSeqNo}`}
            disabled={disabled}
            onClick={() => removeRow(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addRow}
        disabled={disabled || atCeiling}
        data-testid="add-additional-shade"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add shade
      </Button>
      {atCeiling && (
        <p className="text-muted-foreground text-xs">Maximum {MAX_ADDITIONAL_SHADES} additional shades.</p>
      )}
    </div>
  )
}
