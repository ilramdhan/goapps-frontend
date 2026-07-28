// PPC customer master types — re-export generated types + parsers + UI params.
//
// The master is sync-sourced from Orion OM_CUSTOMER but also accepts hand-added
// rows, so `customerSource` distinguishes ORACLE from MANUAL.

export type {
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CreateCustomerResponse,
  GetCustomerResponse,
  UpdateCustomerResponse,
  ListCustomersResponse,
  SyncCustomersResponse,
  ExportCustomersResponse,
  ImportCustomersResponse,
  CustomerImportError,
  DownloadCustomerTemplateResponse,
} from "@/types/generated/ppc/v1/customer"

export {
  CreateCustomerResponse as CreateCustomerResponseParser,
  GetCustomerResponse as GetCustomerResponseParser,
  UpdateCustomerResponse as UpdateCustomerResponseParser,
  ListCustomersResponse as ListCustomersResponseParser,
  SyncCustomersResponse as SyncCustomersResponseParser,
  ExportCustomersResponse as ExportCustomersResponseParser,
  ImportCustomersResponse as ImportCustomersResponseParser,
  DownloadCustomerTemplateResponse as DownloadCustomerTemplateResponseParser,
} from "@/types/generated/ppc/v1/customer"

import type { ActiveFilter } from "@/types/generated/ppc/v1/common"

/** Provenance recorded on every customer row. */
export const CUSTOMER_SOURCE_ORACLE = "ORACLE"
export const CUSTOMER_SOURCE_MANUAL = "MANUAL"

/** Source filter options for the list page (empty value = no filter). */
export const CUSTOMER_SOURCE_OPTIONS = [
  { value: "", label: "All Sources" },
  { value: CUSTOMER_SOURCE_ORACLE, label: "Orion" },
  { value: CUSTOMER_SOURCE_MANUAL, label: "Manual" },
] as const

/** Duplicate-handling choices accepted by ImportCustomers. */
export type CustomerDuplicateAction = "skip" | "update" | "error"

export interface ListCustomersParams {
  page?: number
  pageSize?: number
  search?: string
  activeFilter?: ActiveFilter
  customerSource?: string
  sortBy?: string
  sortOrder?: string
}

export interface ExportCustomersParams {
  search?: string
  activeFilter?: ActiveFilter
  customerSource?: string
}
