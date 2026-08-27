"use client"

// MBCrossSectionSelect (B13) — picker for `mbh_cross_section`.
//
// 🔴 The option list comes from the MB cross-section MASTER
// (/api/v1/finance/master/mb-cross-section) — it is NEVER a hardcoded array in
// the FE. Production currently holds six codes (RND, TBL, PLUS, OTL, RSD, SPC);
// that count is a property of the data, so this component asserts nothing about
// it and simply renders whatever the master returns.

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMbCrossSections } from "@/hooks/finance/use-mb-cross-section"
import { ActiveFilter } from "@/types/finance/mb-cross-section"

// R11 (2026-08-26) — default untuk RECORD BARU. 'RND' dipilih karena ia baris
// pertama master (mbcs_display_order = 1, di-seed migrasi 000479) dan merupakan
// cross section yang paling lazim. ⛔ Hanya dipakai sebagai nilai awal form
// CREATE; mode EDIT tetap membaca nilai yang tersimpan apa adanya, sehingga baris
// lama yang cross section-nya kosong TIDAK diubah diam-diam.
export const MB_CROSS_SECTION_DEFAULT = "RND"

interface MBCrossSectionSelectProps {
  value: string | undefined
  onChange: (value: string) => void
  disabled?: boolean
  id?: string
}

export function MBCrossSectionSelect({ value, onChange, disabled, id }: MBCrossSectionSelectProps) {
  const { data, isLoading } = useMbCrossSections({ pageSize: 100, activeFilter: ActiveFilter.ACTIVE_FILTER_ACTIVE })
  const items = data?.items ?? []

  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled || isLoading}>
      <SelectTrigger id={id} className="w-full" aria-label="Cross Section">
        <SelectValue placeholder={isLoading ? "Loading…" : "Select cross section…"} />
      </SelectTrigger>
      <SelectContent>
        {items.map((cs) => (
          <SelectItem key={cs.mbcsId || cs.code} value={cs.code}>
            {cs.displayName ? `${cs.code} — ${cs.displayName}` : cs.code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
