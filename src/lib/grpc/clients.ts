// Singleton gRPC client registry using globalThis pattern (survives HMR)

import * as grpc from "@grpc/grpc-js"
import { createServiceClient } from "./service-client"

// Service definitions
import { AuthServiceDefinition } from "@/types/generated/iam/v1/auth"
import { UserServiceDefinition } from "@/types/generated/iam/v1/user"
import { MenuServiceDefinition } from "@/types/generated/iam/v1/menu"
import { RoleServiceDefinition, PermissionServiceDefinition } from "@/types/generated/iam/v1/role"
import { SessionServiceDefinition } from "@/types/generated/iam/v1/session"
import { AuditServiceDefinition } from "@/types/generated/iam/v1/audit"
import {
  CompanyServiceDefinition,
  DivisionServiceDefinition,
  DepartmentServiceDefinition,
  SectionServiceDefinition,
  OrganizationServiceDefinition,
} from "@/types/generated/iam/v1/organization"
import { UOMServiceDefinition } from "@/types/generated/finance/v1/uom"
import {
  DashboardServiceDefinition,
  ChartDataServiceDefinition,
  DataSourceServiceDefinition,
  BiJobServiceDefinition,
  BiUploadServiceDefinition,
} from "@/types/generated/finance/v1/bi"
import { UOMCategoryServiceDefinition } from "@/types/generated/finance/v1/uom_category"
import { RMCategoryServiceDefinition } from "@/types/generated/finance/v1/rm_category"
import { ParameterServiceDefinition } from "@/types/generated/finance/v1/parameter"
import { FormulaServiceDefinition } from "@/types/generated/finance/v1/formula"
import {
  CMSPageServiceDefinition,
  CMSSectionServiceDefinition,
  CMSSettingServiceDefinition,
} from "@/types/generated/iam/v1/cms"
import { EmployeeLevelServiceDefinition } from "@/types/generated/iam/v1/employee_level"
import { EmployeeGroupServiceDefinition } from "@/types/generated/iam/v1/employee_group"
import { CompanyMappingServiceDefinition } from "@/types/generated/iam/v1/company_mapping"
import { NotificationServiceDefinition } from "@/types/generated/iam/v1/notification"
import {
  WorkflowTemplateServiceDefinition,
  WorkflowInstanceServiceDefinition,
} from "@/types/generated/iam/v1/workflow"
import { OracleSyncServiceDefinition } from "@/types/generated/finance/v1/oracle_sync"
import { RMGroupServiceDefinition } from "@/types/generated/finance/v1/rm_group"
import { RMCostServiceDefinition } from "@/types/generated/finance/v1/rm_cost"
import { CostProductTypeServiceDefinition } from "@/types/generated/finance/v1/cost_product_type"
import { CostRmTypeServiceDefinition } from "@/types/generated/finance/v1/cost_rm_type"
import { CostProductMasterServiceDefinition } from "@/types/generated/finance/v1/cost_product_master"
import {
  MbCompositionServiceDefinition,
  MbLustureServiceDefinition,
  MbParamServiceDefinition,
  MbPushServiceDefinition,
  MbWorkflowLogServiceDefinition,
  MbBatchServiceDefinition,
} from "@/types/generated/finance/v1/yarn_master"
import { CostRouteServiceDefinition } from "@/types/generated/finance/v1/cost_route"
import { CostRequestTypeServiceDefinition } from "@/types/generated/finance/v1/cost_request_type"
import { CostPaperTubeTypeServiceDefinition } from "@/types/generated/finance/v1/cost_paper_tube_type"
import { CostProductRequestServiceDefinition } from "@/types/generated/finance/v1/cost_product_request"
import { CostRequestCommentServiceDefinition } from "@/types/generated/finance/v1/cost_request_comment"
import { CostAttachmentServiceDefinition } from "@/types/generated/finance/v1/cost_attachment"
import { CostRoutingRuleServiceDefinition } from "@/types/generated/finance/v1/cost_routing_rule"
import { CostAuditLogServiceDefinition } from "@/types/generated/finance/v1/cost_audit_log"
import { CostNotificationServiceDefinition } from "@/types/generated/finance/v1/cost_notification"
import { CostProductParameterServiceDefinition } from "@/types/generated/finance/v1/cost_product_parameter"
import { CostCalcServiceDefinition } from "@/types/generated/finance/v1/cost_calc"
import {
  CostLevelAssignmentConfigServiceDefinition,
  CostFillTaskServiceDefinition,
} from "@/types/generated/finance/v1/cost_fill_assignment"
import { CostDataImportServiceDefinition } from "@/types/generated/finance/v1/cost_import"
import {
  InterminglingServiceDefinition,
  BoxBobbinCostServiceDefinition,
  MachineServiceDefinition,
  MBSpinServiceDefinition,
  MBHeadServiceDefinition,
  ProductGradeServiceDefinition,
  YarnLookupFillServiceDefinition,
  LookupMasterServiceDefinition,
} from "@/types/generated/finance/v1/yarn_master"

const CHANNEL_OPTIONS = {
  "grpc.keepalive_time_ms": 120000,
  "grpc.keepalive_timeout_ms": 20000,
  "grpc.keepalive_permit_without_calls": 1,
  "grpc.max_reconnect_backoff_ms": 10000,
  "grpc.initial_reconnect_backoff_ms": 1000,
  "grpc.max_receive_message_length": 100 * 1024 * 1024,
  "grpc.max_send_message_length": 100 * 1024 * 1024,
  "grpc.enable_retries": 1,
}

const SERVICE_ADDRESSES = {
  iam: `${process.env.IAM_GRPC_HOST || "localhost"}:${process.env.IAM_GRPC_PORT || "50052"}`,
  finance: `${process.env.FINANCE_GRPC_HOST || "localhost"}:${process.env.FINANCE_GRPC_PORT || "50051"}`,
}

// Type-safe global store for clients (survives HMR)
const globalStore = globalThis as unknown as {
  __grpcClients?: Record<string, unknown>
}

function getOrCreate<T>(key: string, factory: () => T): T {
  if (!globalStore.__grpcClients) {
    globalStore.__grpcClients = {}
  }
  if (!globalStore.__grpcClients[key]) {
    globalStore.__grpcClients[key] = factory()
  }
  return globalStore.__grpcClients[key] as T
}

const insecure = grpc.credentials.createInsecure()

// IAM service clients
export function getAuthClient() {
  return getOrCreate("auth", () =>
    createServiceClient(AuthServiceDefinition, SERVICE_ADDRESSES.iam, insecure, CHANNEL_OPTIONS)
  )
}

export function getUserClient() {
  return getOrCreate("user", () =>
    createServiceClient(UserServiceDefinition, SERVICE_ADDRESSES.iam, insecure, CHANNEL_OPTIONS)
  )
}

export function getMenuClient() {
  return getOrCreate("menu", () =>
    createServiceClient(MenuServiceDefinition, SERVICE_ADDRESSES.iam, insecure, CHANNEL_OPTIONS)
  )
}

export function getRoleClient() {
  return getOrCreate("role", () =>
    createServiceClient(RoleServiceDefinition, SERVICE_ADDRESSES.iam, insecure, CHANNEL_OPTIONS)
  )
}

export function getPermissionClient() {
  return getOrCreate("permission", () =>
    createServiceClient(PermissionServiceDefinition, SERVICE_ADDRESSES.iam, insecure, CHANNEL_OPTIONS)
  )
}

export function getSessionClient() {
  return getOrCreate("session", () =>
    createServiceClient(SessionServiceDefinition, SERVICE_ADDRESSES.iam, insecure, CHANNEL_OPTIONS)
  )
}

export function getAuditClient() {
  return getOrCreate("audit", () =>
    createServiceClient(AuditServiceDefinition, SERVICE_ADDRESSES.iam, insecure, CHANNEL_OPTIONS)
  )
}

export function getCompanyClient() {
  return getOrCreate("company", () =>
    createServiceClient(CompanyServiceDefinition, SERVICE_ADDRESSES.iam, insecure, CHANNEL_OPTIONS)
  )
}

export function getDivisionClient() {
  return getOrCreate("division", () =>
    createServiceClient(DivisionServiceDefinition, SERVICE_ADDRESSES.iam, insecure, CHANNEL_OPTIONS)
  )
}

export function getDepartmentClient() {
  return getOrCreate("department", () =>
    createServiceClient(DepartmentServiceDefinition, SERVICE_ADDRESSES.iam, insecure, CHANNEL_OPTIONS)
  )
}

export function getSectionClient() {
  return getOrCreate("section", () =>
    createServiceClient(SectionServiceDefinition, SERVICE_ADDRESSES.iam, insecure, CHANNEL_OPTIONS)
  )
}

export function getOrganizationClient() {
  return getOrCreate("organization", () =>
    createServiceClient(OrganizationServiceDefinition, SERVICE_ADDRESSES.iam, insecure, CHANNEL_OPTIONS)
  )
}

// Finance service clients
export function getUomClient() {
  return getOrCreate("uom", () =>
    createServiceClient(UOMServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

// BI service clients (Executive Dashboard module — hosted in services/finance).
export function getBiDashboardClient() {
  return getOrCreate("bi-dashboard-v2", () =>
    createServiceClient(DashboardServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getBiChartDataClient() {
  return getOrCreate("bi-chart-data", () =>
    createServiceClient(ChartDataServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getBiDataSourceClient() {
  return getOrCreate("bi-data-source", () =>
    createServiceClient(DataSourceServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getBiJobClient() {
  return getOrCreate("bi-job", () =>
    createServiceClient(BiJobServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getBiUploadClient() {
  return getOrCreate("bi-upload", () =>
    createServiceClient(BiUploadServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getUomCategoryClient() {
  return getOrCreate("uomCategory", () =>
    createServiceClient(UOMCategoryServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getRmCategoryClient() {
  return getOrCreate("rmCategory", () =>
    createServiceClient(RMCategoryServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getParameterClient() {
  return getOrCreate("parameter", () =>
    createServiceClient(ParameterServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getFormulaClient() {
  return getOrCreate("formula", () =>
    createServiceClient(FormulaServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

// CMS service clients (IAM service)
export function getCmsPageClient() {
  return getOrCreate("cmsPage", () =>
    createServiceClient(CMSPageServiceDefinition, SERVICE_ADDRESSES.iam, insecure, CHANNEL_OPTIONS)
  )
}

export function getCmsSectionClient() {
  return getOrCreate("cmsSection", () =>
    createServiceClient(CMSSectionServiceDefinition, SERVICE_ADDRESSES.iam, insecure, CHANNEL_OPTIONS)
  )
}

export function getCmsSettingClient() {
  return getOrCreate("cmsSetting", () =>
    createServiceClient(CMSSettingServiceDefinition, SERVICE_ADDRESSES.iam, insecure, CHANNEL_OPTIONS)
  )
}

export function getEmployeeLevelClient() {
  return getOrCreate("employeeLevel", () =>
    createServiceClient(EmployeeLevelServiceDefinition, SERVICE_ADDRESSES.iam, insecure, CHANNEL_OPTIONS)
  )
}

export function getEmployeeGroupClient() {
  return getOrCreate("employeeGroup", () =>
    createServiceClient(EmployeeGroupServiceDefinition, SERVICE_ADDRESSES.iam, insecure, CHANNEL_OPTIONS)
  )
}

export function getCompanyMappingClient() {
  return getOrCreate("companyMapping", () =>
    createServiceClient(CompanyMappingServiceDefinition, SERVICE_ADDRESSES.iam, insecure, CHANNEL_OPTIONS)
  )
}

export function getNotificationClient() {
  return getOrCreate("notification", () =>
    createServiceClient(NotificationServiceDefinition, SERVICE_ADDRESSES.iam, insecure, CHANNEL_OPTIONS)
  )
}

export function getOracleSyncClient() {
  return getOrCreate("oracleSync", () =>
    createServiceClient(OracleSyncServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getRmGroupClient() {
  return getOrCreate("rmGroup", () =>
    createServiceClient(RMGroupServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getRmCostClient() {
  return getOrCreate("rmCost", () =>
    createServiceClient(RMCostServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

// Canonical Phase B clients (PRD §7.2-§7.5).
export function getCostProductTypeClient() {
  return getOrCreate("costProductType", () =>
    createServiceClient(CostProductTypeServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getCostRmTypeClient() {
  return getOrCreate("costRmType", () =>
    createServiceClient(CostRmTypeServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}


export function getCostProductMasterClient() {
  return getOrCreate("costProductMaster", () =>
    createServiceClient(CostProductMasterServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getCostRouteClient() {
  return getOrCreate("costRoute", () =>
    createServiceClient(CostRouteServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

// Canonical Phase A clients (PRD §7.1).
export function getCostRequestTypeClient() {
  return getOrCreate("costRequestType", () =>
    createServiceClient(CostRequestTypeServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getCostPaperTubeTypeClient() {
  return getOrCreate("costPaperTubeType", () =>
    createServiceClient(CostPaperTubeTypeServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getCostProductRequestClient() {
  return getOrCreate("costProductRequest", () =>
    createServiceClient(CostProductRequestServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getCostRequestCommentClient() {
  return getOrCreate("costRequestComment", () =>
    createServiceClient(CostRequestCommentServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getCostAttachmentClient() {
  return getOrCreate("costAttachment", () =>
    createServiceClient(CostAttachmentServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getCostRoutingRuleClient() {
  return getOrCreate("costRoutingRule", () =>
    createServiceClient(CostRoutingRuleServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getCostAuditLogClient() {
  return getOrCreate("costAuditLog", () =>
    createServiceClient(CostAuditLogServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getCostNotificationClient() {
  return getOrCreate("costNotification", () =>
    createServiceClient(CostNotificationServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getCostProductParameterClient() {
  return getOrCreate("costProductParameter", () =>
    createServiceClient(CostProductParameterServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getCostCalcClient() {
  return getOrCreate("costCalc", () =>
    createServiceClient(CostCalcServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getWorkflowTemplateClient() {
  return getOrCreate("workflowTemplate", () =>
    createServiceClient(WorkflowTemplateServiceDefinition, SERVICE_ADDRESSES.iam, insecure, CHANNEL_OPTIONS)
  )
}

export function getWorkflowInstanceClient() {
  return getOrCreate("workflowInstance", () =>
    createServiceClient(WorkflowInstanceServiceDefinition, SERVICE_ADDRESSES.iam, insecure, CHANNEL_OPTIONS)
  )
}

// Fill-assignment clients (Finance service).
export function getFillConfigClient() {
  return getOrCreate("fillConfig", () =>
    createServiceClient(CostLevelAssignmentConfigServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getFillTaskClient() {
  return getOrCreate("fillTask", () =>
    createServiceClient(CostFillTaskServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

// Cost data import/export client (Finance service).
export function getCostDataImportClient() {
  return getOrCreate("costDataImport", () =>
    createServiceClient(CostDataImportServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

// Yarn Master service clients (Finance service).
export function getInterminglingClient() {
  return getOrCreate("intermingling", () =>
    createServiceClient(InterminglingServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getBoxBobbinCostClient() {
  return getOrCreate("boxBobbinCost", () =>
    createServiceClient(BoxBobbinCostServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getMachineClient() {
  return getOrCreate("machine", () =>
    createServiceClient(MachineServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getMBSpinClient() {
  return getOrCreate("mbSpin", () =>
    createServiceClient(MBSpinServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getProductGradeClient() {
  return getOrCreate("productGrade", () =>
    createServiceClient(ProductGradeServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getMBHeadClient() {
  return getOrCreate("mbHead", () =>
    createServiceClient(MBHeadServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getYarnLookupFillClient() {
  return getOrCreate("yarnLookupFill", () =>
    createServiceClient(YarnLookupFillServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getLookupMasterClient() {
  return getOrCreate("lookupMaster_v2", () =>
    createServiceClient(LookupMasterServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getMbCompositionClient() {
  return getOrCreate("mbComposition", () =>
    createServiceClient(MbCompositionServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getMbLustureClient() {
  return getOrCreate("mbLusture", () =>
    createServiceClient(MbLustureServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getMbParamClient() {
  return getOrCreate("mbParam", () =>
    createServiceClient(MbParamServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getMbPushClient() {
  return getOrCreate("mbPush", () =>
    createServiceClient(MbPushServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getMbBatchClient() {
  return getOrCreate("mbBatch", () =>
    createServiceClient(MbBatchServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}

export function getMbWorkflowLogClient() {
  return getOrCreate("mbWorkflowLog", () =>
    createServiceClient(MbWorkflowLogServiceDefinition, SERVICE_ADDRESSES.finance, insecure, CHANNEL_OPTIONS)
  )
}
