"use client"

import { useState } from "react"
import { Lock, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { LookupSyncPreviewDialog } from "./lookup-sync-preview-dialog"
import { useLookupUsage } from "./use-lookup-sync"

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
  if (products === 0 || (changes === 0 && locked === 0)) return null

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
        {locked > 0 && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" /> {locked} product terkunci (dilewati)
          </p>
        )}
      </div>
      {changes > 0 && (
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
          Lihat &amp; Terapkan
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
