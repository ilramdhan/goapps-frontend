// CRUD Hook Factory Types
// Note: Type parameters in generic interfaces are flagged as "unused" by ESLint but are
// required for proper type inference when using createCrudHooks factory
/* eslint-disable @typescript-eslint/no-unused-vars */

import type { BaseResponse, PaginationResponse } from "@/types/generated/common/v1/common"

/**
 * Standard list response structure
 */
export interface ListResponse<TEntity> {
  base?: BaseResponse
  data: TEntity[]
  pagination?: PaginationResponse
}

/**
 * Standard single entity response structure
 */
export interface EntityResponse<TEntity> {
  base?: BaseResponse
  data?: TEntity
}

/**
 * Standard delete response structure
 */
export interface DeleteResponse {
  base?: BaseResponse
}

/**
 * Normalized list result returned by hooks
 */
export interface NormalizedListResult<TEntity> {
  data: TEntity[]
  pagination: {
    currentPage: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
  isSuccess: boolean
  message: string
}

/**
 * Response parsers for CRUD operations
 */
export interface CrudParsers<
  TEntity,
  TListResponse extends ListResponse<TEntity>,
  TCreateResponse extends EntityResponse<TEntity>,
  TUpdateResponse extends EntityResponse<TEntity>,
  TDeleteResponse extends DeleteResponse,
  TGetResponse extends EntityResponse<TEntity>
> {
  /** Parse list response from JSON */
  listResponse: (data: unknown) => TListResponse
  /** Parse create response from JSON */
  createResponse: (data: unknown) => TCreateResponse
  /** Parse update response from JSON */
  updateResponse: (data: unknown) => TUpdateResponse
  /** Parse delete response from JSON */
  deleteResponse: (data: unknown) => TDeleteResponse
  /** Parse get response from JSON */
  getResponse: (data: unknown) => TGetResponse
}

/**
 * Toast messages for CRUD operations
 */
export interface CrudMessages {
  createSuccess?: string
  createError?: string
  updateSuccess?: string
  updateError?: string
  deleteSuccess?: string
  deleteError?: string
  fetchError?: string
}

/**
 * Service scope for hierarchical query keys
 * Prevents query key collisions between different services
 */
export type ServiceScope =
  | "finance"
  | "purchase"
  | "sales"
  | "inventory"
  | "iam"
  | "common"
  | "ppc"

/**
 * Options for creating CRUD hooks
 */
export interface CrudHookOptions<
  TEntity,
  TListParams,
  TCreateRequest,
  TUpdateRequest,
  TListResponse extends ListResponse<TEntity>,
  TCreateResponse extends EntityResponse<TEntity>,
  TUpdateResponse extends EntityResponse<TEntity>,
  TDeleteResponse extends DeleteResponse,
  TGetResponse extends EntityResponse<TEntity>
> {
  /** Service scope for hierarchical query keys (e.g., "finance", "purchase") */
  serviceScope: ServiceScope
  /** Resource name (used for query keys and messages, e.g., "uom", "vendor") */
  resourceName: string
  /** Base API path (e.g., '/api/v1/finance/uoms') */
  apiBasePath: string
  /** Response parsers using proto-generated fromJSON functions */
  parsers: CrudParsers<
    TEntity,
    TListResponse,
    TCreateResponse,
    TUpdateResponse,
    TDeleteResponse,
    TGetResponse
  >
  /** Custom toast messages */
  messages?: CrudMessages
  /** Function to get entity ID from entity */
  getEntityId: (entity: TEntity) => string
  /** Function to build query string from list params */
  buildQueryString?: (params: TListParams) => string
  /** Additional query keys to invalidate on create/update/delete mutations */
  additionalInvalidateKeys?: string[][]
}

/**
 * Generated CRUD hooks
 */
export interface CrudHooks<
  TEntity,
  TListParams,
  TCreateRequest,
  TUpdateRequest,
  TListResponse extends ListResponse<TEntity>,
  TGetResponse extends EntityResponse<TEntity>
> {
  /** Hook for listing entities */
  useList: (params?: TListParams) => import("@tanstack/react-query").UseQueryResult<
    NormalizedListResult<TEntity>,
    Error
  >
  /** Hook for getting a single entity */
  useGet: (id: string) => import("@tanstack/react-query").UseQueryResult<
    { data: TEntity | null; isSuccess: boolean; message: string },
    Error
  >
  /** Hook for creating an entity */
  useCreate: () => import("@tanstack/react-query").UseMutationResult<
    TEntity | undefined,
    Error,
    TCreateRequest,
    unknown
  >
  /** Hook for updating an entity */
  useUpdate: () => import("@tanstack/react-query").UseMutationResult<
    TEntity | undefined,
    Error,
    { id: string; data: TUpdateRequest },
    unknown
  >
  /** Hook for deleting an entity */
  useDelete: () => import("@tanstack/react-query").UseMutationResult<
    void,
    Error,
    string,
    unknown
  >
  /** Query keys for this resource (params serialized to string for stable cache) */
  queryKeys: {
    all: readonly string[]
    lists: () => readonly string[]
    list: (params: TListParams) => readonly string[]
    details: () => readonly string[]
    detail: (id: string) => readonly string[]
  }
}
