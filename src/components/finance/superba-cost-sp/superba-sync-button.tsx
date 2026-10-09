"use client"

import { useState } from "react"
import { RefreshCw, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/confirm-dialog/confirm-dialog"
import { useSyncSuperbaCostSps } from "@/hooks/finance/use-superba-cost-sp"

interface Props {
  lastSyncedAt?: string
}

/** Sync button with overwrite confirmation. Last sync info is rendered by the caller via lastSyncLabel. */
export function lastSyncLabel(lastSyncedAt?: string): string {
  if (!lastSyncedAt) return "Never synced"
  const d = new Date(lastSyncedAt)
  return Number.isNaN(d.getTime()) ? "Never synced" : `Last synced ${d.toLocaleString()}`
}

export function SuperbaSyncButton({ lastSyncedAt }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const mutation = useSyncSuperbaCostSps()

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setConfirmOpen(true)}
        disabled={mutation.isPending}
        title={lastSyncLabel(lastSyncedAt)}
      >
        {mutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="mr-2 h-4 w-4" />
        )}
        Sync
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Sync Superba Cost SP"
        description="Sync will overwrite manually edited rows."
        variant="warning"
        isLoading={mutation.isPending}
        confirmText="Sync"
        onConfirm={() => mutation.mutate(undefined, { onSettled: () => setConfirmOpen(false) })}
      />
    </>
  )
}
