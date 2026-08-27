export interface LookupMaster {
  lmCode: string
  lmDisplayName: string
  lmApiPath: string
  lmCodeField: string
  lmLabelField: string
  lmIsActive: boolean
  lmTableName: string
}

export interface LookupMasterColumn {
  lmcId: string
  lmcMasterCode: string
  lmcColumnName: string
  lmcDisplayName: string
  lmcDataType: "NUMBER" | "TEXT"
  lmcSortOrder: number
}

export interface RemoveApplicablePreview {
  triggerParamCode: string
  triggerParamName: string
  children: Array<{ paramCode: string; paramName: string; currentValue: string }>
}

export interface TableColumn {
  columnName: string
  dataType: "NUMBER" | "TEXT"
  rawType: string
  ordinalPosition: number
}

export interface MasterOption {
  value: string
  label: string
  // ⭐ DIPERBARUI 2026-08-26 (U-mbspin-lookup-detail): only populated by the backend
  // for the MB_SPIN lookup master (mst_mb_spin table) — undefined for every other
  // lookup master. Absent stays absent (D13): render "—", never a synthesized default.
  // ~~D30: dozing is sourced from the retired/contaminated mbs_dozing column (mixes
  // oil-dozing-rate ~0.03 scale with run_ldr ~3.55 scale across MB Heads). Shown as-is
  // per explicit product decision — do not treat it as an authoritative LDR value.~~
  // Dozing withdrawn by explicit user decision 2026-08-26 (D30 contamination);
  // replaced below by ldrPrsn ("LDR Rencana (%)", mbs_ldr_prsn) and runLdrPct
  // ("LDR Aktual (%)", mbs_run_ldr_pct) — both unambiguous, uncontaminated columns.
  denier?: number
  filament?: number
  ldrPrsn?: number
  runLdrPct?: number
}

export interface UpdateLookupMasterForm {
  lmCode: string
  lmDisplayName?: string
  lmTableName?: string
  lmIsActive?: boolean
}
