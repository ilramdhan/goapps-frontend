"use client"

import { useCallback, useMemo, useState, type ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { LookupUsageBanner, lookupSyncKeys } from "@/components/finance/lookup-sync"

/**
 * Shared "after master save" wiring: the form dialog closes on save, so the parent page
 * calls `onSaved(masterKey)` from the dialog onSuccess and renders `notice` above the list.
 * The notice shows LookupUsageBanner (which hides itself when there is nothing to sync).
 * Call onSaved for edits only (a brand-new master has no products using it yet).
 */
export function useLookupSyncAfterSave(lookupMasterCode: string): {
  onSaved: (masterKey: string | undefined | null) => void
  notice: ReactNode
} {
  const queryClient = useQueryClient()
  const [masterKey, setMasterKey] = useState<string | null>(null)

  const onSaved = useCallback(
    (key: string | undefined | null) => {
      if (!key) return
      // Usage numbers depend on the value just saved — drop any cached summary.
      void queryClient.invalidateQueries({ queryKey: lookupSyncKeys.all })
      setMasterKey(key)
    },
    [queryClient],
  )

  const notice = useMemo(
    () =>
      masterKey ? (
        <div className="flex items-start gap-2" data-testid="post-save-lookup-sync-notice">
          <div className="flex-1">
            <LookupUsageBanner
              key={`${lookupMasterCode}:${masterKey}`}
              lookupMasterCode={lookupMasterCode}
              masterKey={masterKey}
            />
          </div>
          <Button type="button" size="icon" variant="ghost" aria-label="Tutup" onClick={() => setMasterKey(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null,
    [lookupMasterCode, masterKey],
  )

  return { onSaved, notice }
}
