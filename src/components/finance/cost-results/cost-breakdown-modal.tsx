"use client"

import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCostBreakdown } from "@/hooks/finance/use-cost-calc"
import { useCostProductMaster } from "@/hooks/finance/use-cost-product-master"
import type { CalculationType } from "@/types/finance/cost-calc"

// P11 [G.6]: the four tab bodies + Field now live in ./breakdown. This file is
// the shell — sheet chrome, data fetching, tab wiring — and nothing else.
import {
  ByLevelTab,
  FormulaTraceTab,
  RmTab,
  SummaryTab,
} from "./breakdown"

interface Props {
  open: boolean
  onOpenChange: (b: boolean) => void
  productSysId: number
  period: string
  calcType: CalculationType
}

export function CostBreakdownModal({
  open,
  onOpenChange,
  productSysId,
  period,
  calcType,
}: Props) {
  const { data: breakdown, isLoading } = useCostBreakdown(
    open ? productSysId : undefined,
    open ? period : undefined,
    open ? calcType : undefined,
  )
  const s = breakdown?.summary

  // Same fallback as detail page — breakdown summary may also have empty code/name.
  const needsFallback = s != null && (!s.productCode || !s.productName)
  const { data: productMaster } = useCostProductMaster(needsFallback ? productSysId : undefined)
  const productCode = s?.productCode || productMaster?.productCode || `#${productSysId}`
  const productName = s?.productName || productMaster?.productName || ""

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex w-full flex-col gap-0 p-0 sm:max-w-3xl"
      >
        {/* ── Sticky header ── same structure as FillParamDrawer */}
        <div className="flex shrink-0 items-start gap-3 border-b bg-background px-6 py-4">
          <div className="min-w-0 flex-1 space-y-1">
            <SheetTitle className="text-base font-semibold leading-tight">
              {productName || productCode}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              {productName ? `${productCode}  ·  ` : ""}Period {period} · {calcType}
              {s?.version !== undefined ? ` · v${s.version}` : ""}
            </SheetDescription>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </SheetClose>
          </div>
        </div>

        {/* ── Loading ── */}
        {isLoading && (
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        )}

        {/* ── Tabs + scrollable content ── */}
        {!isLoading && breakdown && (
          <Tabs
            defaultValue="summary"
            className="flex flex-1 flex-col overflow-hidden"
          >
            {/* Tab list — sticky below header, standard shadcn TabsList */}
            <div className="shrink-0 border-b bg-background px-4 py-3">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="by-level">
                  By level
                  <span className="ml-1 text-xs opacity-60">{breakdown.byLevel.length}</span>
                </TabsTrigger>
                <TabsTrigger value="rm">
                  RM
                  <span className="ml-1 text-xs opacity-60">{breakdown.rmDetails.length}</span>
                </TabsTrigger>
                <TabsTrigger value="formula">
                  Formula
                  <span className="ml-1 text-xs opacity-60">{breakdown.formulaTrace.length}</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Scrollable panels — only the active TabsContent is visible */}
            <div className="flex-1 overflow-y-auto">
              <TabsContent value="summary" className="m-0 px-6 py-5">
                <SummaryTab breakdown={breakdown} productSysId={productSysId} />
              </TabsContent>
              <TabsContent value="by-level" className="m-0 px-6 py-5">
                <ByLevelTab rows={breakdown.byLevel} />
              </TabsContent>
              <TabsContent value="rm" className="m-0 px-6 py-5">
                <RmTab rows={breakdown.rmDetails} />
              </TabsContent>
              <TabsContent value="formula" className="m-0 px-6 py-5">
                <FormulaTraceTab rows={breakdown.formulaTrace} />
              </TabsContent>
            </div>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  )
}
