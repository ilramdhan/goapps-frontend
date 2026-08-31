"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeft, Download, Loader2, Lock, Package } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/common/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCostProductMaster } from "@/hooks/finance/use-cost-product-master"
import { usePermissionContext } from "@/providers/permission-provider"
import { CalculateButton } from "@/components/finance/calc-jobs/calculate-button"
import { ProductParametersTab } from "@/components/finance/cost-product-master/parameters-tab"
import { ProductRoutingTab } from "@/components/finance/cost-product-master/routing-tab"
import { ProductAuditTab } from "@/components/finance/cost-product-master/audit-tab"
import { CostHistoryTab } from "@/components/finance/cost-results/cost-history-tab"
import { ProductTypeName } from "@/components/common/product-type-name"
import { UnlockProductMasterDialog } from "@/components/finance/cost-product-master/unlock-dialog"
import { MbRecipeLinkCard } from "@/components/finance/cost-product-master/mb-recipe-link-card"
import { exportBulkProductRouting } from "@/services/finance/cost-import-api"
import type { CostProductMaster } from "@/types/finance/cost-product-master"

interface Props {
  productSysId: number
}

export default function ProductMasterDetailClient({ productSysId }: Props) {
  const { data: product, isLoading } = useCostProductMaster(productSysId)
  const router = useRouter()
  const [exporting, setExporting] = useState(false)
  const [unlockOpen, setUnlockOpen] = useState(false)
  const { hasPermission } = usePermissionContext()
  const canUnlock = hasPermission("finance.product.route.update")

  async function handleExport() {
    setExporting(true)
    try {
      const result = await exportBulkProductRouting({ productSysIds: [productSysId] })
      toast.success(`Export dijadwalkan — Job #${result.jobId}`, {
        description: "Termasuk semua intermediate product yang berkaitan.",
        action: {
          label: "Lihat job",
          onClick: () => router.push("/finance/import-jobs"),
        },
      })
    } catch {
      toast.error("Export gagal, coba lagi.")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/finance/product-master">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to product list
        </Link>
      </Button>

      <div
        data-testid="product-master-sticky-header"
        className="sticky top-16 group-has-data-[collapsible=icon]/sidebar-wrapper:top-12 z-20 -mx-6 px-6 py-3 bg-background/95 backdrop-blur border-b flex flex-wrap items-start justify-between gap-3"
      >
        <PageHeader
          title={
            isLoading
              ? "Loading…"
              : product
                ? `${product.productCode} — ${product.productName}`
                : "Product not found"
          }
          subtitle={product ? buildProductSubtitle(product) : undefined}
        />
        <div className="flex flex-wrap gap-2">
          {product && <CalculateButton productSysId={productSysId} label="Calculate cost" />}
          {product && (
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {exporting ? "Memproses…" : "Export product + routing"}
            </Button>
          )}
        </div>
      </div>

      {product && product.isLocked && (
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertTitle>Product locked</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>
              Route and parameters are locked while an MB recipe is linked. Unlock temporarily to make manual
              edits.
            </span>
            {canUnlock && (
              <Button size="sm" variant="outline" onClick={() => setUnlockOpen(true)}>
                Unlock (24h)
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {product && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4" />
              Identity
              {!product.isActive && <Badge variant="secondary">Inactive</Badge>}
              {product.isLocked && (
                <Badge variant="outline" className="gap-1">
                  <Lock className="h-3 w-3" /> Locked
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Field label="Code" value={product.productCode} mono />
            <Field label="Name" value={product.productName} />
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Type</div>
              <div className="text-sm">
                {product.productTypeName || product.productTypeCode ? (
                  `${product.productTypeCode || ""} ${product.productTypeName ? `— ${product.productTypeName}` : ""}`
                ) : (
                  <ProductTypeName id={product.productTypeId} />
                )}
              </div>
            </div>
            <Field label="Shade" value={product.shadeCode || "—"} />
            <Field label="Shade Name" value={product.shadeName || "—"} />
            <Field label="Grade" value={product.gradeCode || "—"} />
            <Field label="Oracle Sys ID" value={product.flex02 || "—"} mono />
            <Field label="ERP Compound Key" value={product.flex01 || "—"} mono />
            {product.description && (
              <div className="col-span-full">
                <Field label="Description" value={product.description} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ⭐ DIPERBARUI 2026-08-26 (R16) — MB Recipe / MB Spin linkage. Renders nothing (no
          empty card) for products whose source is not "MB_RECIPE"; see mb-recipe-link-card.tsx
          for the honest handling of the "recipe not yet validated" ambiguous case. */}
      {product && <MbRecipeLinkCard productSysId={product.productSysId} source={product.source} />}

      <Tabs defaultValue="parameters">
        <TabsList>
          <TabsTrigger value="parameters">Parameters</TabsTrigger>
          <TabsTrigger value="routing">Routing</TabsTrigger>
          <TabsTrigger value="cost-history">Cost history</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>
        <TabsContent value="parameters" className="mt-4">
          <ProductParametersTab productSysId={productSysId} isLocked={!!product?.isLocked} />
        </TabsContent>
        <TabsContent value="routing" className="mt-4">
          <ProductRoutingTab productSysId={productSysId} />
        </TabsContent>
        <TabsContent value="cost-history" className="mt-4">
          <CostHistoryTab productSysId={productSysId} />
        </TabsContent>
        <TabsContent value="audit" className="mt-4">
          <ProductAuditTab productSysId={productSysId} />
        </TabsContent>
      </Tabs>

      <UnlockProductMasterDialog open={unlockOpen} onOpenChange={setUnlockOpen} product={product ?? null} />
    </div>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={mono ? "font-mono text-sm" : "text-sm"}>{value}</div>
    </div>
  )
}

/**
 * Builds the header subtitle from non-empty parts only, so a missing shade or
 * grade never leaves a dangling separator (e.g. "· — / AX"). Shade renders as
 * "code — name" when both are present, or just whichever one is present.
 */
function buildProductSubtitle(product: CostProductMaster): string {
  const parts: string[] = []

  const typeLabel = product.productTypeName || product.productTypeCode
  if (typeLabel) parts.push(typeLabel)

  const shadeLabel =
    product.shadeCode && product.shadeName
      ? `${product.shadeCode} — ${product.shadeName}`
      : product.shadeCode || product.shadeName
  if (shadeLabel) parts.push(shadeLabel)

  if (product.gradeCode) parts.push(product.gradeCode)

  return parts.join(" · ")
}
