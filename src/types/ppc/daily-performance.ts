// PPC daily-performance types (shift entry, downtime, waste, efficiency, notes).

export type {
  MachineShiftLog,
  AreaShiftLog,
  DowntimeEvent,
  WasteActual,
  EfficiencySnapshot,
  ShiftLogNote,
  DowntimeEntry,
  WasteEntry,
  SubmitShiftEntryRequest,
  SubmitShiftEntryResponse,
  SubmitAreaShiftLogRequest,
  SubmitAreaShiftLogResponse,
  ListMachineShiftLogsResponse,
  RecalcEfficiencyRequest,
  RecalcEfficiencyResponse,
  ListEfficiencySnapshotsResponse,
  CreateShiftLogNoteRequest,
  UpdateShiftLogNoteRequest,
  CreateShiftLogNoteResponse,
  GetShiftLogNoteResponse,
  UpdateShiftLogNoteResponse,
  DeleteShiftLogNoteResponse,
  ListShiftLogNotesResponse,
} from "@/types/generated/ppc/v1/daily_performance"

export {
  SubmitShiftEntryResponse as SubmitShiftEntryResponseParser,
  SubmitAreaShiftLogResponse as SubmitAreaShiftLogResponseParser,
  ListMachineShiftLogsResponse as ListMachineShiftLogsResponseParser,
  RecalcEfficiencyResponse as RecalcEfficiencyResponseParser,
  ListEfficiencySnapshotsResponse as ListEfficiencySnapshotsResponseParser,
  CreateShiftLogNoteResponse as CreateShiftLogNoteResponseParser,
  GetShiftLogNoteResponse as GetShiftLogNoteResponseParser,
  UpdateShiftLogNoteResponse as UpdateShiftLogNoteResponseParser,
  DeleteShiftLogNoteResponse as DeleteShiftLogNoteResponseParser,
  ListShiftLogNotesResponse as ListShiftLogNotesResponseParser,
} from "@/types/generated/ppc/v1/daily_performance"

import type { AreaCode, ShiftLogNoteType } from "@/types/generated/ppc/v1/common"

export interface ListMachineShiftLogsParams {
  page?: number
  pageSize?: number
  machineId?: number
  area?: AreaCode
  date?: string
  shift?: string
  status?: string
  sortBy?: string
  sortOrder?: string
}

export interface ListEfficiencySnapshotsParams {
  page?: number
  pageSize?: number
  area?: AreaCode
  scope?: string
  machineId?: number
  dateFrom?: string
  dateTo?: string
  sortBy?: string
  sortOrder?: string
}

export interface ListShiftLogNotesParams {
  page?: number
  pageSize?: number
  machineId?: number
  date?: string
  shift?: string
  noteType?: ShiftLogNoteType
  sortBy?: string
  sortOrder?: string
}
