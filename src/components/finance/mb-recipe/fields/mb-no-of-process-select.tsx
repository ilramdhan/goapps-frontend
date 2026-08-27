"use client"

// MBNoOfProcessSelect (B6) — picker for `mbh_no_of_process`.
//
// 🔴 NO DEFAULT. Gate U-B ("should new recipes default to D?") is still an OPEN
// USER DECISION, so the initial value is EMPTY and the payload omits the field
// entirely when untouched — the backend then stores NULL. Do NOT seed 'D' here:
// that would silently stamp a guessed value onto every new recipe.
//
// Options come from the `NO_OF_PROCESS` MB param picklist
// (mst_mb_param_option where mbpo_mbp_code = 'NO_OF_PROCESS'), fetched through
// the existing use-mb-param hook — never hardcoded. The S/D/T codes below are
// used only as a labelling aid for whatever codes the master returns.

import { useMemo } from "react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMbParams } from "@/hooks/finance/use-mb-param"

export const NO_OF_PROCESS_PARAM_CODE = "NO_OF_PROCESS"

/** Human labels for the known codes. Unknown codes fall back to the raw code. */
const CODE_LABELS: Record<string, string> = { S: "S — Single", D: "D — Double", T: "T — Triple" }

interface MBNoOfProcessSelectProps {
  value: string | undefined
  onChange: (value: string) => void
  disabled?: boolean
  id?: string
}

export function MBNoOfProcessSelect({ value, onChange, disabled, id }: MBNoOfProcessSelectProps) {
  const { data, isLoading } = useMbParams({ search: NO_OF_PROCESS_PARAM_CODE, pageSize: 50 })

  const options = useMemo(() => {
    const param = (data?.items ?? []).find((p) => p.code === NO_OF_PROCESS_PARAM_CODE)
    return (param?.options ?? [])
      .filter((o) => o.isActive)
      .slice()
      .sort((a, b) => a.displayOrder - b.displayOrder)
  }, [data])

  return (
    // `value || undefined` keeps the empty state genuinely empty (placeholder
    // shown) instead of selecting a first item by accident.
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled || isLoading}>
      <SelectTrigger id={id} className="w-full" aria-label="Number of Process">
        <SelectValue placeholder={isLoading ? "Loading…" : "Select…"} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.mbpoId} value={o.code}>
            {CODE_LABELS[o.code] ?? o.code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
