"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useDuplicateProduct } from "@/hooks/finance/use-duplicate-product"
import type { CostProductMaster } from "@/types/finance/cost-product-master"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: CostProductMaster | null
}

export function DuplicateProductDialog({ open, onOpenChange, product }: Props) {
  if (!product) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Keyed on productSysId so local form state resets naturally (remount)
          instead of via a setState-in-effect, which the React Compiler flags. */}
      <DuplicateProductDialogContent
        key={product.productSysId}
        product={product}
        onOpenChange={onOpenChange}
      />
    </Dialog>
  )
}

function DuplicateProductDialogContent({
  product,
  onOpenChange,
}: {
  product: CostProductMaster
  onOpenChange: (open: boolean) => void
}) {
  const [newCodePrefix, setNewCodePrefix] = useState("")
  const [copyParams, setCopyParams] = useState(true)
  const mutation = useDuplicateProduct()

  async function onConfirm() {
    try {
      await mutation.mutateAsync({
        productSysId: product.productSysId,
        newCodePrefix: newCodePrefix || undefined,
        copyParams,
      })
      onOpenChange(false)
    } catch {
      /* toast in hook */
    }
  }

  return (
    <DialogContent className="sm:max-w-[480px]">
      <DialogHeader>
        <DialogTitle>Duplicate product</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          <span className="font-mono">{product.productCode}</span> — {product.productName}
          <br />
          Creates a new product with a freshly generated code. The new product starts with no route.
        </p>

        <div>
          <Label htmlFor="dp-prefix">New code prefix (optional)</Label>
          <Input
            id="dp-prefix"
            value={newCodePrefix}
            onChange={(e) => setNewCodePrefix(e.target.value)}
            placeholder={`defaults to ${product.productCode}_COPY`}
          />
        </div>

        <div className="flex items-start gap-2">
          <Checkbox
            id="dp-copy-params"
            checked={copyParams}
            onCheckedChange={(v) => setCopyParams(!!v)}
          />
          <div>
            <Label htmlFor="dp-copy-params">Copy applicable parameters &amp; values</Label>
            <p className="text-xs text-muted-foreground">
              OFF → the new product has no parameters declared.
            </p>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Duplicate
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
