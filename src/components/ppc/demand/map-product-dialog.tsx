"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ProductCombobox } from "@/components/ppc/comboboxes"

import type { Demand } from "@/types/ppc/demand"
import { useMapDemandProduct } from "@/hooks/ppc/use-demand"
import { productLinkReasonLabel } from "@/types/ppc/common"

interface MapProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  demand: Demand | null
}

export function MapProductDialog({ open, onOpenChange, demand }: MapProductDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <MapProductDialogContent
        key={demand?.demandId ?? "none"}
        demand={demand}
        onOpenChange={onOpenChange}
      />
    </Dialog>
  )
}

interface MapProductDialogContentProps {
  demand: Demand | null
  onOpenChange: (open: boolean) => void
}

function MapProductDialogContent({ demand, onOpenChange }: MapProductDialogContentProps) {
  const [cpmProductSysId, setCpmProductSysId] = useState<number | undefined>(undefined)
  const mapMutation = useMapDemandProduct()

  const handleSubmit = async () => {
    if (!demand || !cpmProductSysId) return
    try {
      await mapMutation.mutateAsync({ demandId: demand.demandId, cpmProductSysId })
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to map product:", error)
    }
  }

  return (
    <DialogContent className="sm:max-w-[480px]">
      <DialogHeader>
        <DialogTitle>Link Product</DialogTitle>
        <DialogDescription>
          {demand?.productLinkReason
            ? `${productLinkReasonLabel(demand.productLinkReason)}. Pick the Finance CPM product this demand is for — planning stays blocked until it is linked. This can only be done once.`
            : "Assign a Finance CPM product to this demand. This can only be done once — the product cannot be changed afterward."}
        </DialogDescription>
      </DialogHeader>

      <ProductCombobox
        value={cpmProductSysId}
        onChange={setCpmProductSysId}
        disabled={mapMutation.isPending}
      />

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={mapMutation.isPending}
        >
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={!cpmProductSysId || mapMutation.isPending}>
          {mapMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Link Product
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
