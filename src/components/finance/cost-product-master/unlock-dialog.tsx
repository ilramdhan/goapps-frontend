"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useUnlockCostProductMaster } from "@/hooks/finance/use-cost-product-master"
import type { CostProductMaster } from "@/types/finance/cost-product-master"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: CostProductMaster | null
}

export function UnlockProductMasterDialog({ open, onOpenChange, product }: Props) {
  const [reason, setReason] = useState("")
  const mutation = useUnlockCostProductMaster()

  if (!product) return null

  async function onConfirm() {
    if (!product) return
    try {
      await mutation.mutateAsync({ productSysId: product.productSysId, reason })
      setReason("")
      onOpenChange(false)
    } catch {
      /* toast in hook */
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) setReason("")
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unlock product for 24 hours?</DialogTitle>
          <DialogDescription>
            <span className="font-mono">{product.productCode}</span> — {product.productName}
            <br />
            This is an escape hatch for the MB-recipe lock. Manual edits to route/params become possible for
            24 hours, then the product re-locks automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="unlock-reason">
            Reason <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="unlock-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why does this product need manual route/param edits?"
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={mutation.isPending || reason.trim().length === 0}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Unlock (24h)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
