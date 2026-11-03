// Preset periode awal viewer = defaultPeriod dashboard bila valid, kalau tidak default global.
// Dipakai sebagai defaultValues useUrlState supaya memilih preset yang sama dengan default
// tidak menimpa pilihan user (nilai default dihapus dari URL).

import { PERIOD_PRESETS, type PeriodPreset } from "@/types/bi"

export function viewerDefaultPeriod(dashboardDefault: string | undefined, fallback: PeriodPreset): PeriodPreset {
  return dashboardDefault && (PERIOD_PRESETS as string[]).includes(dashboardDefault)
    ? (dashboardDefault as PeriodPreset)
    : fallback
}
