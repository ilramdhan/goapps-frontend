"use client"

import { useState } from "react"
import { AlertTriangle, Lock, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { LookupSyncPreviewDialog } from "./lookup-sync-preview-dialog"
import { useLookupUsage } from "./use-lookup-sync"

const HIDDEN_SKIPS = new Set(["LOCKED", "KEY_EMPTY", "CHILD_NOT_APPLICABLE"])

const SKIP_HINTS: Record<string, string> = {
  MB_SPIN_AMBIGUOUS: "MB Spin ambigu (ORION code dipakai >1 spin) — pilih ulang MB Spin di tab Parameters product",
  KEY_NOT_FOUND: "master tidak ditemukan",
}

interface LookupUsageBannerProps {
  lookupMasterCode: string
  masterKey: string
}

/** Shows how many products use a master record and opens the sync preview. Hidden when nothing to do. */
export function LookupUsageBanner({ lookupMasterCode, masterKey }: LookupUsageBannerProps) {
  const [open, setOpen] = useState(false)
  const { data } = useLookupUsage(lookupMasterCode, masterKey, { enabled: !!lookupMasterCode && !!masterKey })

  if (!data) return null
  const products = data.totalProducts
  const changes = data.totalValueChanges
  const locked = data.lockedProducts
  // Skips the user can act on (e.g. ambiguous MB Spin must be re-picked); LOCKED
  // has its own line, KEY_EMPTY / CHILD_NOT_APPLICABLE are not actionable.
  const otherSkips = Object.entries(data.skipCounts ?? {}).filter(
    ([k, v]) => v > 0 && !HIDDEN_SKIPS.has(k),
  )
  if (products === 0 || (changes === 0 && locked === 0 && otherSkips.length === 0)) return null

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-md border bg-muted/40 px-3 py-2 text-sm"
      data-testid="lookup-usage-banner"
    >
      <div className="space-y-0.5">
        <p className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 shrink-0 text-muted-foreground" />
          Dipakai {products} product, {data.productsWithChanges} product / {changes} nilai berubah
        </p>
        {otherSkips.map(([k, v]) => (
          <p key={k} className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" /> {v} dilewati: {SKIP_HINTS[k] ?? k}
          </p>
        ))}
        {locked > 0 && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" /> {locked} product terkunci (dilewati)
          </p>
        )}
      </div>
      {(changes > 0 || otherSkips.length > 0) && (
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
          {changes > 0 ? "Lihat & Terapkan" : "Lihat detail"}
        </Button>
      )}
      <LookupSyncPreviewDialog
        open={open}
        onOpenChange={setOpen}
        scope={{ masterRef: { lookupMasterCode, masterKey } }}
        title={`Terapkan perubahan master ${lookupMasterCode} ${masterKey}`}
      />
    </div>
  )
}
