"use client"

// MBSpin Hooks - TanStack Query hooks for MBSpin operations

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { createCrudHooks } from "@/lib/hooks"
import { apiClient, buildQueryString, downloadFileFromBytes } from "@/lib/api"
import {
  type MBSpin,
  type CreateMBSpinRequest,
  type UpdateMBSpinRequest,
  type ListMBSpinsParams,
  type ExportMBSpinsParams,
  type ListMBSpinsResponse,
  type CreateMBSpinResponse,
  type UpdateMBSpinResponse,
  type DeleteMBSpinResponse,
  type GetMBSpinResponse,
  type ExportMBSpinsResponse,
  type ImportMBSpinsResponse,
  type DownloadMBSpinTemplateResponse,
  ListMBSpinsResponseParser,
  CreateMBSpinResponseParser,
  UpdateMBSpinResponseParser,
  DeleteMBSpinResponseParser,
  GetMBSpinResponseParser,
  ExportMBSpinsResponseParser,
  ImportMBSpinsResponseParser,
  DownloadMBSpinTemplateResponseParser,
} from "@/types/finance/mb-spin"
import {
  duplicateMBSpin,
  type DuplicateMBSpinInput,
  updateMBSpin,
  type UpdateMBSpinInput,
} from "@/services/finance/mb-spin-api"

// ============================================================================
// Create CRUD hooks using factory
// ============================================================================

const {
  useList: useMBSpins,
  useGet: useMBSpin,
  useCreate: useCreateMBSpin,
  useUpdate: useUpdateMBSpin,
  queryKeys: mbSpinKeys,
} = createCrudHooks<
  MBSpin,
  ListMBSpinsParams,
  CreateMBSpinRequest,
  UpdateMBSpinRequest,
  ListMBSpinsResponse,
  CreateMBSpinResponse,
  UpdateMBSpinResponse,
  DeleteMBSpinResponse,
  GetMBSpinResponse
>({
  serviceScope: "finance",
  resourceName: "mb-spin",
  apiBasePath: "/api/v1/finance/mb-spins",
  parsers: {
    listResponse: (data) => ListMBSpinsResponseParser.fromJSON(data),
    createResponse: (data) => CreateMBSpinResponseParser.fromJSON(data),
    updateResponse: (data) => UpdateMBSpinResponseParser.fromJSON(data),
    deleteResponse: (data) => DeleteMBSpinResponseParser.fromJSON(data),
    getResponse: (data) => GetMBSpinResponseParser.fromJSON(data),
  },
  getEntityId: (mbSpin) => String(mbSpin.mbsId),
  messages: {
    createSuccess: "MB Spin created successfully",
    updateSuccess: "MB Spin updated successfully",
    deleteSuccess: "MB Spin deleted successfully",
  },
})

// Export CRUD hooks
export {
  useMBSpins,
  useMBSpin,
  useCreateMBSpin,
  useUpdateMBSpin,
  mbSpinKeys,
}

// ============================================================================
// Detail Hook (P5-T1)
// ============================================================================

// ⭐ DITAMBAHKAN 2026-08-31 (P5-T1) — `useMBSpin` above (the generic factory's
// `useGet`) calls `apiClient.get(`${apiBasePath}/${id}`)` with NO query-string
// support at all (create-crud-hooks.ts useGet, ~line 157-175), so it cannot pass
// `mbhId`. The BFF route this hooks hits (src/app/api/v1/finance/mb-spins/[id]/route.ts:9-15)
// reads `mbhId` from `?mbhId=` and forwards `{ mbhId, mbsId: id }` to
// `client.getMBSpin`. Proto `GetMBSpinRequest.mbh_id` (goapps-shared-proto
// finance/v1/yarn_master.proto ~L1950-1955) is `buf.validate` `string.uuid = true`
// — it only demands a SYNTACTICALLY valid UUID, not the real parent. Verified
// independently in goapps-backend: the gRPC handler
// (internal/delivery/grpc/mb_spin_handler.go GetMBSpin, ~L141-164) calls
// `getHandler.Handle(ctx, appmbspin.GetQuery{ID: id})` using ONLY `req.MbsId` —
// `req.MbhId` is never read again after validation passes — and the repository
// lookup (internal/infrastructure/postgres/mb_spin_repository.go GetByID,
// ~L95-97) filters purely by `mbs_id`. So `mbh_id` on this RPC is
// validated-but-unused: which row comes back is determined solely by `mbsId`.
//
// Rather than teaching the generic factory hook to accept query params just for
// this one caller, this is a small dedicated hook that calls the same BFF route
// directly with a fixed placeholder UUID (all-zeros nil UUID) as `mbhId`. It is
// self-documenting and satisfies `buf.validate`'s syntax check without pretending
// to know the real parent — which this route has no way to supply anyway (the
// page only receives the spin id from the URL, not its parent head id).
// Do NOT "fix" this by wiring in a real mbhId — there isn't one available here,
// and the backend ignores the value regardless (see evidence above).
const MBH_ID_PLACEHOLDER_NIL_UUID = "00000000-0000-0000-0000-000000000000"

export function useMBSpinDetail(id: string) {
  return useQuery({
    queryKey: mbSpinKeys.detail(id),
    queryFn: async () => {
      const rawResponse = await apiClient.get<unknown>(
        `/api/v1/finance/mb-spins/${id}?mbhId=${MBH_ID_PLACEHOLDER_NIL_UUID}`
      )
      const response = GetMBSpinResponseParser.fromJSON(rawResponse)
      return {
        data: response.data || null,
        isSuccess: response.base?.isSuccess ?? true,
        message: response.base?.message || "",
      }
    },
    enabled: !!id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

// ============================================================================
// Delete Hook (dedicated — bypasses generic factory delete)
// ============================================================================

// ⭐ DITAMBAHKAN 2026-09-01 — the generic factory's `useDelete` (from
// createCrudHooks above) takes a bare `id: string` and calls
// `apiClient.delete(`${apiBasePath}/${id}`)` with no query string at all
// (create-crud-hooks.ts useDelete, ~L249-254). The BFF route this hits
// (src/app/api/v1/finance/mb-spins/[id]/route.ts DELETE, ~L78-84) reads
// `mbhId` from `?mbhId=` and forwards `{ mbhId, mbsId: id }` to
// `client.deleteMBSpin`. Proto `DeleteMBSpinRequest.mbh_id`
// (goapps-shared-proto finance/v1/yarn_master.proto ~L2037-2042) is
// `buf.validate` `string.uuid = true` with no `ignore: IGNORE_IF_ZERO_VALUE`,
// so an empty/missing `mbhId` fails validation before the delete logic ever
// runs, surfacing as a generic "Validation failed" toast. Verified in
// goapps-backend: `DeleteHandler.Handle` (internal/application/mbspin/
// delete_handler.go) only uses `cmd.ID` (the spin id) — `mbh_id` is validated
// but never actually used to scope the query.
//
// Unlike the GET case above (`useMBSpinDetail`), the delete dialog DOES have
// the real parent id in scope — the `MBSpin` row being deleted already
// carries `mbsMbhId` — so this hook passes the REAL value instead of a
// placeholder. It's still a small dedicated hook (not a fix to the generic
// factory) because the factory's `useDelete` has no way to accept extra
// query params for just this one resource.
export function useDeleteMBSpin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ mbsId, mbhId }: { mbsId: string; mbhId: string }) => {
      const rawResponse = await apiClient.delete<unknown>(
        `/api/v1/finance/mb-spins/${mbsId}?mbhId=${mbhId}`
      )
      return DeleteMBSpinResponseParser.fromJSON(rawResponse)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mbSpinKeys.lists() })
      toast.success("MB Spin deleted successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete MB Spin")
    },
  })
}

// ============================================================================
// Sibling Spins Hook (P5-T2 — Lineage section on the detail page)
// ============================================================================

// ⭐ DITAMBAHKAN 2026-08-31 (P5-T2) — MBSpin has NO parent-spin field at all.
// Verified directly against the generated type (types/generated/finance/v1/
// yarn_master.ts, MBSpin message ~L2081-2167): the only "parent" reference is
// mbsMbhId (parent MB Head UUID) — there is no mbsParentSpinId or equivalent
// recording which spin a `DuplicateMBSpin` clone came from. So a true
// parent/child spin lineage section cannot be built; the backend `ListFilter`
// also has no `ParentSpinID` (goapps-backend mbspin/repository.go ~L143),
// confirming there's no server-side path to "children of spin X" either.
//
// As the closest available substitute, this hook fetches every OTHER spin
// that shares the same parent MB Head (mbsMbhId) — i.e. "siblings" — since
// that's the family a duplicated spin actually lands in, even though the
// schema doesn't record the specific source spin. Uses a dedicated `useQuery`
// (not the generic `useMBSpins` factory hook) because the factory's `useList`
// has no `enabled` option, and this fetch must stay off until the detail
// query has resolved `mbsMbhId`.
export function useMBSpinSiblings(mbhId: string | undefined) {
  return useQuery({
    queryKey: ["finance", "mb-spin", "siblings", mbhId],
    queryFn: async () => {
      const queryString = buildQueryString({ mbhId, pageSize: 100 })
      const rawResponse = await apiClient.get<unknown>(`/api/v1/finance/mb-spins${queryString}`)
      const response = ListMBSpinsResponseParser.fromJSON(rawResponse)
      return response.data || []
    },
    enabled: !!mbhId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

// ============================================================================
// Export Hook
// ============================================================================

export function useExportMBSpins() {
  return useMutation({
    mutationFn: async (params: ExportMBSpinsParams = {}): Promise<ExportMBSpinsResponse> => {
      const queryString = buildQueryString(params as Record<string, unknown>)
      const rawResponse = await apiClient.get<unknown>(`/api/v1/finance/mb-spins/export${queryString}`)
      return ExportMBSpinsResponseParser.fromJSON(rawResponse)
    },
    onSuccess: (response) => {
      if (response.base?.isSuccess && response.fileContent.length > 0) {
        downloadFileFromBytes(response.fileContent, response.fileName || "mb-spins-export.xlsx")
        toast.success("Export completed successfully")
      } else {
        toast.error(response.base?.message || "Failed to export MB Spins")
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to export MB Spins")
    },
  })
}

// ============================================================================
// Import Hook
// ============================================================================

interface ImportData {
  fileContent: Uint8Array
  fileName: string
  duplicateAction: string
}

export function useImportMBSpins() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ImportData): Promise<ImportMBSpinsResponse> => {
      const rawResponse = await apiClient.post<unknown>("/api/v1/finance/mb-spins/import", {
        fileContent: Array.from(data.fileContent),
        fileName: data.fileName,
        duplicateAction: data.duplicateAction,
      })
      return ImportMBSpinsResponseParser.fromJSON(rawResponse)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: mbSpinKeys.lists() })
      if (response.base?.isSuccess) {
        const { successCount, skippedCount, failedCount } = response
        toast.success(
          `Import completed: ${successCount} created, ${skippedCount} skipped, ${failedCount} failed`
        )
      } else {
        toast.error(response.base?.message || "Failed to import MB Spins")
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to import MB Spins")
    },
  })
}

// ============================================================================
// Duplicate Hook (P8)
// ============================================================================

// Clones one MB Spin into a fresh "R and D" (draft) child (RPC DuplicateMBSpin).
// Requires permission finance.yarnmaster.mbspin.create — same permission the
// backend already gates the RPC behind, since this produces a brand-new record.
// Invalidates the list so the new draft shows up without a manual refresh.
export function useDuplicateMBSpin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: DuplicateMBSpinInput) => duplicateMBSpin(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mbSpinKeys.lists() })
      toast.success("MB Spin duplicated successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to duplicate MB Spin")
    },
  })
}

// ============================================================================
// Update-with-cascade Hook (P7-T5)
// ============================================================================

// ⭐ DITAMBAHKAN 2026-08-31 (P7-T5) — the generic useUpdateMBSpin() (from
// createCrudHooks above) discards everything except `data` (see
// create-crud-hooks.ts useUpdate(): `return response.data`), so it cannot
// surface the skipped/impactPreview cascade fields the PUT route now forwards.
// This dedicated hook mirrors useDuplicateMBSpin() above — same invalidation +
// toast pattern — but returns the full `{ spin, impact }` shape via
// updateMBSpin() so a caller (mb-spin-form-dialog.tsx) can show a cascade
// summary instead of it being silently thrown away.
export function useUpdateMBSpinWithCascade() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateMBSpinInput) => updateMBSpin(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: mbSpinKeys.detail(variables.mbsId) })
      queryClient.invalidateQueries({ queryKey: mbSpinKeys.lists() })
      toast.success("MB Spin updated successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update MB Spin")
    },
  })
}

// ============================================================================
// Download Template Hook
// ============================================================================

export function useDownloadMBSpinTemplate() {
  return useMutation({
    mutationFn: async (): Promise<DownloadMBSpinTemplateResponse> => {
      const rawResponse = await apiClient.get<unknown>("/api/v1/finance/mb-spins/template")
      return DownloadMBSpinTemplateResponseParser.fromJSON(rawResponse)
    },
    onSuccess: (response) => {
      if (response.base?.isSuccess && response.fileContent.length > 0) {
        downloadFileFromBytes(response.fileContent, response.fileName || "mb-spin-template.xlsx")
        toast.success("Template downloaded successfully")
      } else {
        toast.error(response.base?.message || "Failed to download template")
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to download template")
    },
  })
}
