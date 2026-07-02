"use client"

// ProductDetailDrawer — compact read-only "View" drawer for a product master
// row. Modeled on the param-detail-drawer skeleton (sticky header/footer,
// scrollable body). Four independently-loading sections: details, routing,
// non-calculated parameters, and recent cost history.

import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowUpRight, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { ProductTypeName } from "@/components/common/product-type-name"
import { StatusBadge } from "@/components/common/status-badge"
import { UserName } from "@/components/common/user-name"
import { formatDate, formatNumeric } from "@/components/finance/cost-results/format"
import { useCostProductMaster } from "@/hooks/finance/use-cost-product-master"
import { useCostHistory } from "@/hooks/finance/use-cost-calc"
import { useProductRequiredParams } from "@/hooks/finance/use-cost-product-parameter"
import { useRouteByProduct } from "@/hooks/finance/use-cost-route"
import type { CostProductMaster } from "@/types/finance/cost-product-master"
import type { RequiredParamEntry } from "@/types/finance/cost-product-parameter"

interface Props {
  productSysId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Each drawer section renders as a distinct card block so the four sections
// (Details / Routing / Parameters / Cost history) read as separate units.
const sectionCardClass = "space-y-2 rounded-lg border bg-card p-4"

function SectionHeading({ children }: { children: ReactNode }) {
  return <h3 className="text-xs uppercase tracking-wide text-muted-foreground">{children}</h3>
}

function SectionError({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted-foreground italic">{children}</p>
}

function Field({ label, children, mono }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-sm" : "text-sm"}>{children}</dd>
    </div>
  )
}

function paramValue(e: RequiredParamEntry): string {
  if (!e.hasValue) return "—"
  let v: string
  switch (e.dataType) {
    case "NUMBER":
      v = e.valueNumeric
      break
    case "BOOLEAN":
      v = e.valueFlag ? "true" : "false"
      break
    default:
      v = e.valueText
  }
  return e.uomCode ? `${v} ${e.uomCode}` : v
}

function DetailsSection({
  product,
  isLoading,
  isError,
}: {
  product: CostProductMaster | null | undefined
  isLoading: boolean
  isError: boolean
}) {
  return (
    <section className={sectionCardClass}>
      <SectionHeading>Details</SectionHeading>
      {isLoading && (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}
      {!isLoading && (isError || !product) && (
        <SectionError>Failed to load product details.</SectionError>
      )}
      {!isLoading && product && (
        <>
          <dl className="grid grid-cols-2 gap-3">
            <Field label="Type">
              {product.productTypeCode ? (
                <span>
                  <span className="font-mono text-xs text-muted-foreground">{product.productTypeCode}</span>
                  {product.productTypeName ? ` — ${product.productTypeName}` : ""}
                </span>
              ) : (
                <ProductTypeName id={product.productTypeId} />
              )}
            </Field>
            <Field label="Shade">{product.shadeCode || "—"}</Field>
            <Field label="Grade">{product.gradeCode || "—"}</Field>
            <Field label="ERP Compound Key" mono>{product.flex01 || "—"}</Field>
            <Field label="Oracle Sys ID" mono>{product.flex02 || "—"}</Field>
            <Field label="Type Label">{product.flex03 || "—"}</Field>
            {product.description && (
              <div className="col-span-2">
                <Field label="Description">
                  <span className="whitespace-pre-wrap">{product.description}</span>
                </Field>
              </div>
            )}
          </dl>
          <p className="text-[11px] text-muted-foreground">
            Created {formatDate(product.createdAt)}
            {product.createdBy ? (
              <>
                {" by "}
                <UserName userId={product.createdBy} compact />
              </>
            ) : null}
            {" · Updated "}
            {formatDate(product.updatedAt)}
            {product.updatedBy ? (
              <>
                {" by "}
                <UserName userId={product.updatedBy} compact />
              </>
            ) : null}
          </p>
        </>
      )}
    </section>
  )
}

function RoutingSection({ productSysId }: { productSysId: number | undefined }) {
  const { data: head, isLoading } = useRouteByProduct(productSysId)

  return (
    <section className={sectionCardClass}>
      <SectionHeading>Routing</SectionHeading>
      {isLoading && <Skeleton className="h-9 w-full" />}
      {!isLoading && !head && <SectionError>No routing.</SectionError>}
      {!isLoading && head && (
        <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <span className="font-medium">Route #{head.headId}</span>
            <span className="text-xs text-muted-foreground">v{head.version}</span>
            <StatusBadge status={head.routingStatus} type="route" size="sm" />
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link href={`/finance/routes/${head.headId}`}>
              Open route <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}
    </section>
  )
}

function ParametersSection({ productSysId }: { productSysId: number | undefined }) {
  const { data, isLoading, isError } = useProductRequiredParams(productSysId ?? 0)
  // CALCULATED params are engine-filled during costing — excluded from the view.
  const params = (data ?? []).filter((e) => e.paramCategory !== "CALCULATED")

  // Group by displayGroup while collecting the minimum displayOrder per group
  // (entries arrive pre-sorted by display_group/display_order from the API).
  // Groups are ordered by their min displayOrder, named groups first and
  // ungrouped ("") last — mirrors the cost-breakdown-modal parameter snapshot.
  const groupMinOrder: Record<string, number> = {}
  const grouped: Record<string, RequiredParamEntry[]> = {}
  for (const e of params) {
    const group = e.displayGroup
    if (!grouped[group]) {
      grouped[group] = []
      groupMinOrder[group] = e.displayOrder
    } else {
      groupMinOrder[group] = Math.min(groupMinOrder[group], e.displayOrder)
    }
    grouped[group].push(e)
  }
  const groupEntries = Object.keys(grouped)
    .sort((a, b) => {
      if (!a && !b) return 0
      if (!a) return 1 // ungrouped after all named groups
      if (!b) return -1
      return (groupMinOrder[a] ?? 9999) - (groupMinOrder[b] ?? 9999)
    })
    .map((g) => [g, grouped[g]] as const)

  return (
    <section className={sectionCardClass}>
      <SectionHeading>Parameters</SectionHeading>
      {isLoading && (
        <div className="space-y-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      )}
      {!isLoading && isError && <SectionError>Failed to load parameters.</SectionError>}
      {!isLoading && !isError && params.length === 0 && (
        <SectionError>No parameters filled for this product.</SectionError>
      )}
      {!isLoading && !isError && params.length > 0 && (
        <div>
          {groupEntries.map(([groupName, entries], idx) => (
            <div key={groupName || "__ungrouped__"} className={idx > 0 ? "mt-4" : ""}>
              {groupName !== "" && (
                <div className="mb-2 flex items-center gap-2 border-b pb-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    {groupName}
                  </span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {entries.length}
                  </span>
                </div>
              )}
              <div className="space-y-1">
                {entries.map((e) => (
                  <div key={e.paramId} className="flex items-baseline gap-2 text-xs">
                    <span
                      className="w-36 shrink-0 truncate font-mono text-[11px] text-muted-foreground"
                      title={e.paramCode}
                    >
                      {e.paramCode}
                    </span>
                    <span className="min-w-0 flex-1 truncate" title={e.paramName}>
                      {e.paramName}
                    </span>
                    <span className="shrink-0 font-mono text-[11px]">{paramValue(e)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function CostHistorySection({
  productSysId,
  detailHref,
}: {
  productSysId: number | undefined
  detailHref: string
}) {
  const { data, isLoading, isError } = useCostHistory(productSysId, { page: 1, pageSize: 5 })
  const items = data?.items ?? []

  return (
    <section className={sectionCardClass}>
      <div className="flex items-center justify-between">
        <SectionHeading>Cost history</SectionHeading>
        {items.length > 0 && (
          <Link href={detailHref} className="text-xs text-primary hover:underline">
            View all
          </Link>
        )}
      </div>
      {isLoading && (
        <div className="space-y-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      )}
      {!isLoading && isError && <SectionError>Failed to load cost history.</SectionError>}
      {!isLoading && !isError && items.length === 0 && <SectionError>No cost history yet.</SectionError>}
      {!isLoading && !isError && items.length > 0 && (
        <div className="space-y-1">
          {items.map((row) => (
            <div key={row.costId} className="flex items-center gap-2 text-xs">
              <span className="w-20 shrink-0 font-mono">{row.period}</span>
              <span className="min-w-0 flex-1 truncate font-mono tabular-nums">
                {formatNumeric(row.costPerUnit)}
              </span>
              <StatusBadge status={row.status} type="cost" size="sm" />
              <span className="w-24 shrink-0 text-right text-muted-foreground">
                {formatDate(row.calculatedAt).slice(0, 10)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export function ProductDetailDrawer({ productSysId, open, onOpenChange }: Props) {
  // All queries are lazy: only fetch while the drawer is open for a product.
  const id = open && productSysId ? productSysId : undefined
  const { data: product, isLoading, isError } = useCostProductMaster(id)
  const detailHref = `/finance/product-master/${productSysId ?? ""}`

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex flex-col p-0 w-full sm:max-w-2xl gap-0"
      >
        {/* Sticky header */}
        <div className="flex shrink-0 items-start gap-3 border-b bg-background px-6 py-4">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <SheetTitle className="font-mono text-base font-semibold leading-tight">
                {product?.productCode ?? "Product"}
              </SheetTitle>
              {product && (
                <StatusBadge status={product.isActive ? "ACTIVE" : "INACTIVE"} type="product" size="sm" />
              )}
            </div>
            <SheetDescription className="truncate text-xs text-muted-foreground">
              {product?.productName ?? "Product master detail"}
            </SheetDescription>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </SheetClose>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <DetailsSection product={product} isLoading={!!id && isLoading} isError={isError} />
          <RoutingSection productSysId={id} />
          <ParametersSection productSysId={id} />
          <CostHistorySection productSysId={id} detailHref={detailHref} />
        </div>

        {/* Sticky footer */}
        <div className="flex shrink-0 items-center justify-end border-t bg-background px-6 py-4">
          <Button asChild>
            <Link href={detailHref}>
              Open full detail <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
