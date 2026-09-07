"use client"

// RM Group membership mutations (add / remove items)

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { apiClient, downloadFileFromBytes } from "@/lib/api"
import { rmGroupKeys, groupPeriodConfigKeys } from "./use-rm-group"
import { groupItemRatesKeys } from "./use-group-item-rates"
import {
  AddItemsResponseParser,
  RemoveItemsResponseParser,
  ImportGroupItemsResponseParser,
  DownloadGroupItemsTemplateResponseParser,
  UpdateGroupItemResponseParser,
  type ImportGroupItemsResponse,
  type DownloadGroupItemsTemplateResponse,
  type UpdateGroupItemResponse,
} from "@/types/finance/rm-group"

export interface AddItemSelectionInput {
  itemCode: string
  gradeCode?: string
  // V2 valuation inputs (optional).
  valuationFreightRate?: number | null
  valuationAntiDumpingPct?: number | null
  valuationDutyPct?: number | null
  valuationTransportRate?: number | null
  valuationDefaultValue?: number | null
}

interface AddItemsVars {
  groupHeadId: string
  // Preferred: structured selections carrying grade_code so multi-variant
  // items (same item_code, different grade) are disambiguated on the backend.
  selections?: AddItemSelectionInput[]
  // Legacy: bare item_codes. Backend resolves grade_code arbitrarily.
  itemCodes?: string[]
}

export function useAddItemsToGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ groupHeadId, selections, itemCodes }: AddItemsVars) => {
      const body: Record<string, unknown> = {}
      if (selections && selections.length > 0) {
        body.selections = selections.map((s) => ({
          itemCode: s.itemCode,
          gradeCode: s.gradeCode || "",
          valuationFreightRate: s.valuationFreightRate ?? undefined,
          valuationAntiDumpingPct: s.valuationAntiDumpingPct ?? undefined,
          valuationDutyPct: s.valuationDutyPct ?? undefined,
          valuationTransportRate: s.valuationTransportRate ?? undefined,
          valuationDefaultValue: s.valuationDefaultValue ?? undefined,
        }))
      }
      if (itemCodes && itemCodes.length > 0) {
        body.itemCodes = itemCodes
      }
      const raw = await apiClient.post<unknown>(
        `/api/v1/finance/rm-groups/${groupHeadId}/items`,
        body
      )
      return AddItemsResponseParser.fromJSON(raw)
    },
    onSuccess: (response, vars) => {
      queryClient.invalidateQueries({ queryKey: rmGroupKeys.detail(vars.groupHeadId) })
      queryClient.invalidateQueries({ queryKey: rmGroupKeys.lists() })
      // Force group-item-rates refetch so per-stage qty/val/rate columns
      // repopulate immediately rather than showing "-" until manual reload.
      queryClient.invalidateQueries({ queryKey: groupItemRatesKeys.all })
      if (response.base?.isSuccess) {
        const added = response.added.length
        const skipped = response.skipped
        if (skipped.length > 0) {
          const sameGroup = skipped.filter(
            (s) => s.owningGroupHeadId && s.owningGroupHeadId === vars.groupHeadId
          ).length
          const otherGroup = skipped.length - sameGroup
          const parts: string[] = []
          if (sameGroup > 0) parts.push(`${sameGroup} already in this group`)
          if (otherGroup > 0) parts.push(`${otherGroup} already in another group`)
          toast.warning(`Added ${added}. ${parts.join(", ")}.`)
        } else {
          toast.success(`Added ${added} item${added === 1 ? "" : "s"} to group`)
        }
      } else {
        toast.error(response.base?.message || "Failed to add items")
      }
    },
    onError: (err: Error) => toast.error(err.message || "Failed to add items"),
  })
}

// V2: useUpdateGroupItem patches one detail row's valuation fields + sort/active.
export interface UpdateGroupItemVars {
  groupHeadId: string
  groupDetailId: string
  period: string
  valuationFreightRate?: number | null
  valuationAntiDumpingPct?: number | null
  valuationDutyPct?: number | null
  valuationTransportRate?: number | null
  valuationDefaultValue?: number | null
  sortOrder?: number
  isActive?: boolean
  clearValuationFreightRate?: boolean
  clearValuationAntiDumpingPct?: boolean
  clearValuationDutyPct?: boolean
  clearValuationTransportRate?: boolean
  clearValuationDefaultValue?: boolean
}

export function useUpdateGroupItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (vars: UpdateGroupItemVars): Promise<UpdateGroupItemResponse> => {
      const { groupHeadId, groupDetailId, ...body } = vars
      // `body` still carries `period` (part of ...vars) — forwarded as-is in
      // the PUT body to the BFF route, which threads it to UpdateGroupItem.
      const raw = await apiClient.put<unknown>(
        `/api/v1/finance/rm-groups/${groupHeadId}/items/${groupDetailId}`,
        body,
      )
      return UpdateGroupItemResponseParser.fromJSON(raw)
    },
    onSuccess: (response, vars) => {
      queryClient.invalidateQueries({ queryKey: rmGroupKeys.detail(vars.groupHeadId) })
      queryClient.invalidateQueries({ queryKey: groupItemRatesKeys.all })
      // Period-scoped display config (Marketing Inputs card / item table)
      // must also refresh — invalidating only the read-only rates key above
      // is not enough now that header/item config is period-displayable.
      queryClient.invalidateQueries({
        queryKey: groupPeriodConfigKeys.detail(vars.groupHeadId, vars.period),
      })
      if (response.base?.isSuccess) {
        toast.success("Item updated")
      } else {
        toast.error(response.base?.message || "Failed to update item")
      }
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update item"),
  })
}

interface RemoveItemsVars {
  groupHeadId: string
  groupDetailIds: string[]
  mode?: number
}

export function useRemoveItemsFromGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ groupHeadId, groupDetailIds, mode = 2 }: RemoveItemsVars) => {
      const res = await fetch(`/api/v1/finance/rm-groups/${groupHeadId}/items`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupDetailIds, mode }),
      })
      if (!res.ok) throw new Error(`Remove items failed: ${res.status}`)
      const raw = await res.json()
      return RemoveItemsResponseParser.fromJSON(raw)
    },
    onSuccess: (response, vars) => {
      queryClient.invalidateQueries({ queryKey: rmGroupKeys.detail(vars.groupHeadId) })
      queryClient.invalidateQueries({ queryKey: rmGroupKeys.lists() })
      queryClient.invalidateQueries({ queryKey: groupItemRatesKeys.all })
      if (response.base?.isSuccess) {
        toast.success(`Removed ${response.removedCount} item${response.removedCount === 1 ? "" : "s"}`)
      } else {
        toast.error(response.base?.message || "Failed to remove items")
      }
    },
    onError: (err: Error) => toast.error(err.message || "Failed to remove items"),
  })
}

interface ImportGroupItemsVars {
  groupHeadId: string
  fileContent: Uint8Array
  fileName: string
}

// Bulk-import items into ONE existing group from Excel. Reuses the interactive
// add flow's validation (one item / one active group, sync-feed lookup,
// idempotent re-add for same group).
export function useImportGroupItems() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ groupHeadId, fileContent, fileName }: ImportGroupItemsVars): Promise<ImportGroupItemsResponse> => {
      const raw = await apiClient.post<unknown>(
        `/api/v1/finance/rm-groups/${groupHeadId}/items/import`,
        {
          fileContent: Array.from(fileContent),
          fileName,
        }
      )
      return ImportGroupItemsResponseParser.fromJSON(raw)
    },
    onSuccess: (response, vars) => {
      queryClient.invalidateQueries({ queryKey: rmGroupKeys.detail(vars.groupHeadId) })
      queryClient.invalidateQueries({ queryKey: rmGroupKeys.lists() })
      queryClient.invalidateQueries({ queryKey: groupItemRatesKeys.all })
      if (response.base?.isSuccess) {
        const added = response.itemsAdded
        const skipped = response.itemsSkipped
        const failed = response.failedCount
        const parts: string[] = []
        if (added > 0) parts.push(`${added} added`)
        if (skipped > 0) parts.push(`${skipped} skipped`)
        if (failed > 0) parts.push(`${failed} failed`)
        const msg = parts.join(", ") || "nothing to import"
        if (failed > 0 || skipped > 0) toast.warning(`Import finished — ${msg}`)
        else toast.success(`Import finished — ${msg}`)
      } else {
        toast.error(response.base?.message || "Failed to import items")
      }
    },
    onError: (err: Error) => toast.error(err.message || "Failed to import items"),
  })
}

// Download the per-group items template (one-sheet: item_code / grade_code /
// sort_order). Pairs with useImportGroupItems.
export function useDownloadGroupItemsTemplate() {
  return useMutation({
    mutationFn: async (): Promise<DownloadGroupItemsTemplateResponse> => {
      const raw = await apiClient.get<unknown>("/api/v1/finance/rm-groups/items/template")
      return DownloadGroupItemsTemplateResponseParser.fromJSON(raw)
    },
    onSuccess: (response) => {
      if (response.base?.isSuccess && response.fileContent.length > 0) {
        downloadFileFromBytes(response.fileContent, response.fileName || "rm-group-items-template.xlsx")
        toast.success("Template downloaded")
      } else {
        toast.error(response.base?.message || "Failed to download template")
      }
    },
    onError: (err: Error) => toast.error(err.message || "Failed to download template"),
  })
}
