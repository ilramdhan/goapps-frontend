"use client"

// MBStatusSelect (B10) — the MB recipe `mbh_status` picker.
//
// The three values are CASE-SENSITIVE copies of what production already stores
// ("R and D", not "R&D" / "R AND D"). They are a closed set owned by Finance, so
// they live here as constants rather than behind a master-data fetch.

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/** Closed set — exact production spelling. Do not "tidy" the casing. */
export const MB_STATUS_OPTIONS = ["R and D", "Spinning", "Boughtout"] as const

export const MB_STATUS_DEFAULT = "R and D"

interface MBStatusSelectProps {
  value: string | undefined
  onChange: (value: string) => void
  disabled?: boolean
  id?: string
}

export function MBStatusSelect({ value, onChange, disabled, id }: MBStatusSelectProps) {
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} className="w-full" aria-label="Status">
        <SelectValue placeholder="Select status…" />
      </SelectTrigger>
      <SelectContent>
        {MB_STATUS_OPTIONS.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
