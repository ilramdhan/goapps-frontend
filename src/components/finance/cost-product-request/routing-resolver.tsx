"use client"

// RoutingResolver — the ONE entry point for resolving a Cost Product Request's
// routing (design.md §3, Area B — B1/B2/D4 unification). Given a product,
// auto-detects whether an active route already exists:
//   - route exists            → link it to the request (useLinkExistingRoute)
//   - no route exists yet     → create a new route from the product (useCreateRouteFromProduct)
//   - brand-new product       → create the product master first (useCreateCostProductMaster),
//                                then create a route from it (useCreateRouteFromProduct)
// All 3 branches converge on the same onResolved(headId) callback.
//
// This replaces the old 2-entry-point split (PickExistingRouteDialog +
// CreateRoutingWizard) with a single auto-detecting flow; the "create new
// product master" branch is preserved inline, not dropped.
import { useState } from "react"

import { ProductMasterCombobox } from "@/components/finance/comboboxes/product-master-combobox"
import { ProductTypeCombobox } from "@/components/finance/comboboxes/product-type-combobox"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCreateCostProductMaster } from "@/hooks/finance/use-cost-product-master"
import { useCreateRouteFromProduct, useRouteByProduct } from "@/hooks/finance/use-cost-route"
import { useLinkExistingRoute } from "@/hooks/finance/use-link-route"
import { cn } from "@/lib/utils"

export interface NewProductInput {
  name: string
  typeId: number
  shade: string
  grade: string
  description: string
}

const emptyNewProduct: NewProductInput = { name: "", typeId: 0, shade: "", grade: "AX", description: "" }

/**
 * useResolveRouting resolves the routing for a given (possibly undefined)
 * product. It exposes the "does this product already have a route" check
 * (via useRouteByProduct) plus two resolve functions:
 *   - resolveExisting: link-or-create for an already-known product master.
 *   - resolveNewProduct: create the product master, then create a route from it.
 */
export function useResolveRouting(productSysId: number | undefined) {
  const routeQuery = useRouteByProduct(productSysId)
  const linkM = useLinkExistingRoute()
  const createFromProductM = useCreateRouteFromProduct()
  const createProductM = useCreateCostProductMaster()

  const hasExistingRoute = !!routeQuery.data
  const existingHeadId = routeQuery.data?.headId

  async function resolveExisting(requestId: number): Promise<number> {
    if (!productSysId) throw new Error("No product selected")
    if (hasExistingRoute && existingHeadId) {
      await linkM.mutateAsync({ requestId, routeHeadId: existingHeadId })
      return existingHeadId
    }
    return createFromProductM.mutateAsync({ productSysId, linkedRequestId: requestId })
  }

  async function resolveNewProduct(requestId: number, newProduct: NewProductInput): Promise<number> {
    const created = await createProductM.mutateAsync({
      productTypeId: newProduct.typeId,
      productName: newProduct.name,
      shadeCode: newProduct.shade,
      gradeCode: newProduct.grade || "AX",
      description: newProduct.description,
    })
    if (!created.productSysId) throw new Error("Product master create returned no sys id")
    return createFromProductM.mutateAsync({ productSysId: created.productSysId, linkedRequestId: requestId })
  }

  return {
    routeQuery,
    hasExistingRoute,
    existingHeadId,
    resolveExisting,
    resolveNewProduct,
    isPending: linkM.isPending || createFromProductM.isPending || createProductM.isPending,
  }
}

interface RoutingResolverProps {
  requestId: number
  productSysId?: number
  onResolved: (headId: number) => void
  className?: string
  /**
   * When true, skip the "brand-new product" toggle entirely and always render
   * the new-product-master form — used by ClassificationAndFeasibilityDialog's
   * inline B1 picker when verified classification is already known to be "new"
   * (design.md §3 B1: "skipping the existing-product picker entirely").
   */
  forceNewProduct?: boolean
}

export function RoutingResolver({
  requestId,
  productSysId,
  onResolved,
  className,
  forceNewProduct = false,
}: RoutingResolverProps) {
  const [selectedProductSysId, setSelectedProductSysId] = useState<number | undefined>(productSysId)
  const [isNewProduct, setIsNewProduct] = useState(forceNewProduct)
  const [newProduct, setNewProduct] = useState<NewProductInput>(emptyNewProduct)

  const { routeQuery, hasExistingRoute, resolveExisting, resolveNewProduct, isPending } = useResolveRouting(
    isNewProduct ? undefined : selectedProductSysId,
  )

  async function handleResolve() {
    try {
      const headId = isNewProduct
        ? await resolveNewProduct(requestId, newProduct)
        : await resolveExisting(requestId)
      onResolved(headId)
    } catch {
      // Mutation hooks already surface a toast on error; avoid double-toasting.
    }
  }

  const canResolveExisting = !isNewProduct && !!selectedProductSysId
  const canResolveNew = isNewProduct && newProduct.name.trim().length > 0 && newProduct.typeId > 0
  const canResolve = canResolveExisting || canResolveNew

  return (
    <div className={cn("space-y-3", className)}>
      {!forceNewProduct && (
        <div className="flex items-center gap-2">
          <Checkbox
            id="rr-new-product"
            checked={isNewProduct}
            onCheckedChange={(checked) => setIsNewProduct(checked === true)}
          />
          <Label htmlFor="rr-new-product" className="text-sm font-normal">
            This is a brand-new product (not yet in the product master)
          </Label>
        </div>
      )}

      {!isNewProduct && (
        <div className="space-y-1">
          <Label>Product</Label>
          <ProductMasterCombobox
            value={selectedProductSysId}
            onChange={(id) => setSelectedProductSysId(id)}
            placeholder="Search product by code or name…"
          />
          {selectedProductSysId && (
            <p className="text-xs text-muted-foreground">
              {routeQuery.isLoading
                ? "Checking for an existing route…"
                : hasExistingRoute
                  ? `Existing route #${routeQuery.data?.headId} will be linked to this request.`
                  : "No route yet for this product — a new route will be created."}
            </p>
          )}
        </div>
      )}

      {isNewProduct && (
        <div className="space-y-3">
          <div>
            <Label>Product name *</Label>
            <Input
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              placeholder="e.g. PTY 75/72 SD BRIGHT"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Product type *</Label>
              <ProductTypeCombobox
                value={newProduct.typeId || undefined}
                onChange={(id) => setNewProduct({ ...newProduct, typeId: id })}
              />
            </div>
            <div>
              <Label>Grade code</Label>
              <Input
                value={newProduct.grade}
                onChange={(e) => setNewProduct({ ...newProduct, grade: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Shade code (optional)</Label>
            <Input
              value={newProduct.shade}
              onChange={(e) => setNewProduct({ ...newProduct, shade: e.target.value })}
            />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Input
              value={newProduct.description}
              onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Product code is auto-generated. Required parameters (CAPP) are empty initially — open the new
            product master after creation to fill values.
          </p>
        </div>
      )}

      <Button disabled={isPending || !canResolve} onClick={handleResolve}>
        {isPending ? "Resolving…" : "Resolve routing"}
      </Button>
    </div>
  )
}
