// BI hooks barrel.

export {
  useDashboards,
  useDashboardById,
  useDashboardByCode,
  useCreateDashboard,
  useUpdateDashboard,
  useDeleteDashboard,
  useDuplicateDashboard,
  useSetDashboardRoles,
  useAccessibleDashboards,
  dashboardKeys,
} from "./use-dashboard"

export { useEtlStatus, etlStatusKeys } from "./use-etl-status"
export { useDashboardData } from "./use-chart-data"
export { usePreviewDashboard } from "./use-preview"
export {
  useDashboardGroups,
  useCreateDashboardGroup,
  useUpdateDashboardGroup,
  useDeleteDashboardGroup,
  groupKeys,
} from "./use-group"
export { useFactDistincts, useDataSources, factKeys } from "./use-fact-distincts"
export {
  useBiJobs,
  useBiJobLogs,
  useTriggerBiJob,
  useCreateJob,
  useUpdateJob,
  useDeleteJob,
  jobKeys,
} from "./use-job"
export type { CreateJobInput, UpdateJobInput } from "./use-job"
export {
  useUploadTemplate,
  useParseUpload,
  useCommitUpload,
  useCancelUpload,
  useUploadHistory,
  uploadKeys,
} from "./use-upload"
export { useConfigAudit, auditKeys } from "./use-audit"
export type { ConfigAuditParams, ConfigAuditResult } from "./use-audit"
