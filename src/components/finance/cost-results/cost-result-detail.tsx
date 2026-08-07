"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, BarChart3, CheckCircle2, ShieldCheck } from "lucide-react"

import { useBreadcrumbTrail } from "@/components/common/dynamic-breadcrumb"
import { PageHeader } from "@/components/common/page-header"
import { StatusBadge } from "@/components/common/status-badge"
import { UserName } from "@/components/common/user-name"
import { EmptyState } from "@/components/common/empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useApproveCost,
  useCostResult,
  useVerifyCost,
} from "@/hooks/finance/use-cost-calc"
import { useCostProductMaster } from "@/hooks/finance/use-cost-product-master"
import { usePermissionContext } from "@/providers/permission-provider"
import type { CalculationType } from "@/types/finance/cost-calc"

import { CostBreakdownModal } from "./cost-breakdown-modal"
import { CostHistoryTab } from "./cost-history-tab"
import { calcTypeLabel, formatDate, formatNumeric } from "./format"

interface Props {
  productSysId: number
  period: string
  calcType: CalculationType
}

export function CostResultDetail({ productSysId, period, calcType }: Props) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const { hasPermission } = usePermissionContext()
  const { data: result, isLoading } = useCostResult(productSysId, period, calcType)
  const verify = useVerifyCost()
  const approve = useApproveCost()

  // GetCostResult gRPC may return empty productCode/productName — fall back to product master.
  const needsProductFallback = result != null && (!result.productCode || !result.productName)
  const { data: productMaster } = useCostProductMaster(needsProductFallback ? productSysId : undefined)
  // Resolved human code, or null while the query is still settling. Never fall
  // back to the sys id here — the breadcrumb must not expose raw ids.
  const resolvedProductCode = result?.productCode || productMaster?.productCode || null
  const productCode = resolvedProductCode ?? `#${productSysId}`
  const productName = result?.productName || productMaster?.productName || ""

  // The auto-derived trail turns each route param into a clickable crumb that
  // 404s, so drive the whole trail explicitly. The tail segment is omitted until
  // the product code is known, rather than briefly rendering the sys id.
  useBreadcrumbTrail([
    { label: "Home", href: "/dashboard" },
    { label: "Finance", href: "/finance/dashboard" },
    { label: "Cost Results", href: "/finance/cost-results" },
    ...(resolvedProductCode
      ? [{ label: `${resolvedProductCode} · ${period} · ${calcTypeLabel(calcType)}` }]
      : []),
  ])

  function backToList() {
    router.push("/finance/cost-results")
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2 pb-2 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <Skeleton className="h-52 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
          <div className="lg:col-span-4">
            <Skeleton className="h-72 w-full rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="space-y-6">
        <PageHeader title="Cost Result" subtitle={`Period ${period} · ${calcType}`}>
          <Button variant="outline" onClick={backToList}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to list
          </Button>
        </PageHeader>
        <EmptyState
          title="No cost result found"
          description={`No active cost result for period ${period} / ${calcType}. Trigger a calc job to compute one.`}
          action={
            <Button variant="outline" onClick={() => router.push("/finance/calc-jobs")}>
              Go to calc jobs
            </Button>
          }
        />
      </div>
    )
  }

  const canVerify = result.status === "CALCULATED" && hasPermission("finance.cost.result.verify")
  const canApprove = result.status === "VERIFIED" && hasPermission("finance.cost.result.approve")

  return (
    <div className="space-y-6">
      <PageHeader
        title={productCode}
        subtitle={[productName, `Period ${period} · ${calcType}`].filter(Boolean).join("  ·  ")}
      >
        <Button variant="outline" onClick={backToList}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to list
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left column */}
        <div className="min-w-0 space-y-6 lg:col-span-8">

          {/* Main cost card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="font-mono text-xs text-muted-foreground">{productCode}</p>
                  {productName && (
                    <CardTitle className="text-sm font-semibold">{productName}</CardTitle>
                  )}
                </div>
                <StatusBadge status={result.status} type="cost" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <Field label="Cost per unit">
                  <span className="text-xl font-semibold tabular-nums">
                    {result.currencyCode ? `${result.currencyCode} ` : ""}
                    {formatNumeric(result.costPerUnit)}
                  </span>
                </Field>
                <Field label="Total RM cost">
                  <span className="font-mono tabular-nums">
                    {formatNumeric(result.totalRmCost)}
                  </span>
                </Field>
                <Field label="Conversion">
                  <span className="font-mono tabular-nums">
                    {formatNumeric(result.totalConversion)}
                  </span>
                </Field>
                <Field label="Total cost">
                  <span className="font-mono font-semibold tabular-nums">
                    {formatNumeric(result.totalCost)}
                  </span>
                </Field>
              </div>

              <div className="border-t pt-4">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setModalOpen(true)}>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View breakdown
                  </Button>
                  {canVerify && (
                    <Button
                      onClick={() => verify.mutate({ costId: result.costId })}
                      disabled={verify.isPending}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {verify.isPending ? "Verifying…" : "Mark verified"}
                    </Button>
                  )}
                  {canApprove && (
                    <Button
                      onClick={() => approve.mutate({ costId: result.costId })}
                      disabled={approve.isPending}
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      {approve.isPending ? "Approving…" : "Mark approved"}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* History card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Calculation history</CardTitle>
            </CardHeader>
            <CardContent>
              <CostHistoryTab productSysId={productSysId} calcType={calcType} />
            </CardContent>
          </Card>
        </div>

        {/* Right column — audit sidebar */}
        <div className="min-w-0 space-y-6 lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Audit trail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Version">
                <span className="font-mono text-sm">v{result.version}</span>
              </Field>
              <Field label="Period">
                <span className="font-mono text-sm">{result.period}</span>
              </Field>
              <Field label="Calc type">
                <span className="text-sm">{result.calculationType}</span>
              </Field>
              {result.uomCode && (
                <Field label="UOM">
                  <span className="font-mono text-sm">{result.uomCode}</span>
                </Field>
              )}
              <Separator />
              {result.calculatedAt && (
                <Field label="Calculated at">
                  <span className="text-sm">{formatDate(result.calculatedAt)}</span>
                </Field>
              )}
              {result.calculatedBy && (
                <Field label="Calculated by">
                  <UserName userId={result.calculatedBy} compact className="text-sm" />
                </Field>
              )}
              {result.verifiedAt && (
                <>
                  <Separator />
                  <Field label="Verified at">
                    <span className="text-sm">{formatDate(result.verifiedAt)}</span>
                  </Field>
                </>
              )}
              {result.verifiedBy && (
                <Field label="Verified by">
                  <UserName userId={result.verifiedBy} compact className="text-sm" />
                </Field>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <CostBreakdownModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        productSysId={productSysId}
        period={period}
        calcType={calcType}
      />
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
