"use client"

// PPC lot hooks. CRUD comes from the generic factory registration in
// use-masters.ts and is re-exported here so the lot master has one import site;
// the Oracle sync is hand-written because the factory cannot express a
// non-CRUD action.

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { apiClient } from "@/lib/api"
import { SyncLotsResponseParser } from "@/types/ppc/master"

import {
  useLotMasters,
  useLotMaster,
  useCreateLotMaster,
  useUpdateLotMaster,
  useDeleteLotMaster,
  lotMasterKeys,
} from "./use-masters"

export {
  useLotMasters,
  useLotMaster,
  useCreateLotMaster,
  useUpdateLotMaster,
  useDeleteLotMaster,
  lotMasterKeys,
}

/**
 * useSyncLots triggers the read-only MMSMERGE import.
 *
 * `oracleUsed` is false when Oracle was unconfigured, which is a no-op run
 * rather than a failure — reporting "0 inserted, 0 updated" as success there
 * would read as "the legacy master is empty", which is a different answer.
 */
export function useSyncLots() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const raw = await apiClient.post<unknown>("/api/v1/ppc/lots/sync", {})
      return SyncLotsResponseParser.fromJSON(raw)
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: lotMasterKeys.lists() })
      if (!res.base?.isSuccess) {
        toast.error(res.base?.message || "Failed to sync lots")
        return
      }
      if (!res.oracleUsed) {
        toast.warning("Oracle is not configured — nothing was synced")
        return
      }
      toast.success(
        `Sync complete: ${res.inserted} added, ${res.updated} updated, ${res.skipped} skipped`
      )
    },
    onError: (e: Error) => toast.error(e.message || "Failed to sync lots"),
  })
}
