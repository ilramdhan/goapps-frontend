"use client"

import { Suspense } from "react"
import { Loader2 } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PageHeader } from "@/components/common/page-header"

import {
  ItemConsStockPOTable,
  DataFilters,
  DataPagination,
} from "@/components/finance/item-cons-stock-po"

import { useItemConsStockPO } from "@/hooks/finance/use-oracle-sync"
import { useUrlState } from "@/lib/hooks"
import type { ListItemConsStockPOParams } from "@/types/finance/oracle-sync"

const defaultFilters: ListItemConsStockPOParams = {
  page: 1,
  pageSize: 20,
  search: "",
  period: undefined,
  itemCode: undefined,
}

// `period` and `itemCode` default to `undefined`, so the generic deserializer
// can't infer a "string" type from them and falls back to JSON.parse — which
// turns a numeric-looking value like "202607" into the number 202607 instead
// of keeping it a string. That silently breaks the period <Select>, since its
// SelectItem values are strings and no longer match. Force string handling
// for these two keys explicitly.
function deserializeStringFilter<T extends object>(
  key: keyof T,
  value: string | null
): T[keyof T] {
  return (value === null ? undefined : value) as T[keyof T]
}

function ItemConsStockPOPageContent() {
  const [filters, setFilters] = useUrlState<ListItemConsStockPOParams>({
    defaultValues: defaultFilters,
    deserialize: (key, value, defaultValue) => {
      if (key === "period" || key === "itemCode") {
        return deserializeStringFilter(key, value)
      }
      return value === null
        ? defaultValue
        : (value as ListItemConsStockPOParams[typeof key])
    },
  })

  const { data, isLoading, isError, error } = useItemConsStockPO(filters)

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }))
  }

  const handlePageSizeChange = (pageSize: number) => {
    setFilters((prev) => ({ ...prev, pageSize, page: 1 }))
  }

  const totalItems = data?.pagination?.totalItems ?? 0

  return (
    <div className="w-full min-w-0 overflow-hidden">
      <PageHeader
        title="Item Cons Stock PO"
        subtitle="View synced item consumption, stock, and purchase order data from Oracle"
      />

      <div className="grid grid-cols-1 gap-6">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Synced Data</CardTitle>
            <CardDescription>
              {isLoading
                ? "Loading..."
                : `${totalItems} total records`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DataFilters filters={filters} onFiltersChange={setFilters} />

            {isError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
                {error instanceof Error
                  ? error.message
                  : "Failed to load data"}
              </div>
            )}

            <ItemConsStockPOTable
              data={data?.data || []}
              isLoading={isLoading}
            />

            <DataPagination
              pagination={data?.pagination}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ItemConsStockPOPageSkeleton() {
  return (
    <div className="w-full min-w-0 overflow-hidden space-y-4">
      <PageHeader
        title="Item Cons Stock PO"
        subtitle="View synced item consumption, stock, and purchase order data from Oracle"
      />
      <div className="grid grid-cols-1 gap-6">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Synced Data</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ItemConsStockPOPageClient() {
  return (
    <Suspense fallback={<ItemConsStockPOPageSkeleton />}>
      <ItemConsStockPOPageContent />
    </Suspense>
  )
}
