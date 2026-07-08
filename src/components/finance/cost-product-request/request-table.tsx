"use client"

import { useMemo } from "react"
import Link from "next/link"
import { FileText, ListChecks } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/components/common/empty-state"
import { SortableHeader } from "@/components/shared/data-table/sortable-header"
import { useColumnVisibility } from "@/components/shared/data-table/use-column-visibility"
import { cn } from "@/lib/utils"
import { typography } from "@/lib/ui/typography"
import { StatusBadge } from "./status-badge"
import type { CostProductRequest } from "@/types/finance/cost-product-request"
import type { ColumnDef } from "@/components/shared/data-table/types"

interface Props {
  items: CostProductRequest[]
  isLoading?: boolean
  onTrack?: (r: CostProductRequest) => void
  visibility: Record<string, boolean>
  sortBy?: string
  sortOrder?: "asc" | "desc"
  onSort: (sortKey: string) => void
}

function humanize(value: string): string {
  return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

export const TABLE_ID = "product-requests-table"

export function buildColumns(hasTrack: boolean): ColumnDef<CostProductRequest>[] {
  return [
    { id: "request_no", header: "Request #", canHide: false },
    { id: "type",       header: "Type",      defaultHidden: true },
    { id: "title",      header: "Title",     canHide: false },
    { id: "customer",   header: "Customer",  defaultHidden: true },
    { id: "class",      header: "Class",     defaultHidden: true },
    { id: "urgency",    header: "Urgency",   defaultHidden: true },
    { id: "status",     header: "Status",    canHide: false },
    ...(hasTrack ? [{ id: "fills", header: "Fills", defaultHidden: true } as ColumnDef<CostProductRequest>] : []),
  ]
}

export function useRequestTableColumns(hasTrack: boolean) {
  const columns = useMemo(() => buildColumns(hasTrack), [hasTrack])
  const { visibility, toggle, setAll, reset } = useColumnVisibility(TABLE_ID, columns)
  return { columns, visibility, toggle, setAll, reset }
}

const th = cn(typography.tableHeader)

export function RequestTable({ items, isLoading, onTrack, visibility, sortBy, sortOrder, onSort }: Props) {
  const hasTrack = !!onTrack
  const columns = useMemo(() => buildColumns(hasTrack), [hasTrack])
  const show = (id: string) => visibility[id] !== false
  const visibleCount = columns.filter((c) => show(c.id)).length
  const sortProps = { currentSortBy: sortBy, currentSortOrder: sortOrder, onSort }

  return (
    /*
     * Scroll strategy: the shadcn <Table> component adds overflow-x-auto which creates
     * a scroll container and breaks position:sticky vertical. We use a raw <table>
     * inside overflow-x-auto + max-h-[540px] overflow-y-auto so:
     *   - Horizontal scroll works on narrow screens
     *   - sticky top-0 pins the thead while the tbody scrolls vertically inside this box
     * The layout's overflow-x-hidden prevents this from expanding the page horizontally.
     */
    <div className="rounded-md border overflow-hidden">
      <div className="overflow-x-auto overflow-y-auto max-h-[540px]">
        <table className="w-full caption-bottom text-sm">
          <TableHeader className="sticky top-0 z-10 bg-background shadow-[0_1px_0_0_hsl(var(--border))]">
            <TableRow>
              {show("request_no") && (
                <SortableHeader label="Request #" sortKey="request_no" className={cn(th, "w-40 pl-4")} {...sortProps} />
              )}
              {show("type") && (
                <SortableHeader label="Type" sortKey="type" className={cn(th, "w-28")} {...sortProps} />
              )}
              {show("title") && (
                <SortableHeader label="Title" sortKey="title" className={th} {...sortProps} />
              )}
              {show("customer") && (
                <SortableHeader label="Customer" sortKey="customer" className={cn(th, "w-44")} {...sortProps} />
              )}
              {show("class") && (
                <SortableHeader label="Class" sortKey="class" className={cn(th, "w-28")} {...sortProps} />
              )}
              {show("urgency") && (
                <SortableHeader label="Urgency" sortKey="urgency" className={cn(th, "w-24")} {...sortProps} />
              )}
              {show("status") && (
                <SortableHeader label="Status" sortKey="status" className={cn(th, "w-44")} {...sortProps} />
              )}
              {show("fills") && onTrack && <TableHead className={cn(th, "w-16 text-center")}>Fills</TableHead>}
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {show("request_no") && <TableCell className="pl-4"><Skeleton className="h-4 w-28" /></TableCell>}
                {show("type")       && <TableCell><Skeleton className="h-4 w-12" /></TableCell>}
                {show("title")      && <TableCell><Skeleton className="h-4 w-48" /></TableCell>}
                {show("customer")   && <TableCell><Skeleton className="h-4 w-32" /></TableCell>}
                {show("class")      && <TableCell><Skeleton className="h-4 w-16" /></TableCell>}
                {show("urgency")    && <TableCell><Skeleton className="h-4 w-14" /></TableCell>}
                {show("status")     && <TableCell><Skeleton className="h-5 w-28 rounded-full" /></TableCell>}
                {show("fills") && onTrack && <TableCell />}
              </TableRow>
            ))}

            {!isLoading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={visibleCount} className="p-0">
                  <EmptyState
                    icon={FileText}
                    title="No requests found"
                    description="Try adjusting your search or status filter."
                    className="border-0 rounded-none"
                  />
                </TableCell>
              </TableRow>
            )}

            {items.map((r) => (
              <TableRow key={r.requestId} className="relative hover:bg-muted/50 cursor-pointer">
                {show("request_no") && (
                  <TableCell className="pl-4 font-mono text-xs">
                    <Link href={`/finance/product-requests/${r.requestId}`} className="absolute inset-0">
                      <span className="sr-only">Open {r.requestNo}</span>
                    </Link>
                    {r.requestNo}
                  </TableCell>
                )}
                {show("type") && (
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {r.requestTypeCode ?? `#${r.requestTypeId}`}
                  </TableCell>
                )}
                {show("title") && (
                  <TableCell>
                    <div className="text-sm font-medium">{r.title}</div>
                    {r.description && (
                      <div className="text-xs text-muted-foreground truncate max-w-[40ch]">
                        {r.description}
                      </div>
                    )}
                  </TableCell>
                )}
                {show("customer") && (
                  <TableCell className="text-sm">{r.customerName}</TableCell>
                )}
                {show("class") && (
                  <TableCell className="text-sm">
                    {r.productClassification === "pending" ? (
                      <Badge variant="outline">Pending</Badge>
                    ) : (
                      <span>{humanize(r.productClassification)}</span>
                    )}
                    {r.verifiedClassification && r.verifiedClassification !== r.productClassification && (
                      <span className="ml-1 text-xs text-orange-600">→ {humanize(r.verifiedClassification)}</span>
                    )}
                  </TableCell>
                )}
                {show("urgency") && (
                  <TableCell className="text-sm">{humanize(r.urgencyLevel)}</TableCell>
                )}
                {show("status") && (
                  <TableCell>
                    <StatusBadge status={r.status} substatus={r.closedSubstatus} />
                  </TableCell>
                )}
                {show("fills") && onTrack && (
                  <TableCell className="relative z-10 text-center" onClick={(e) => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" aria-label="Track fill tasks" onClick={() => onTrack(r)}>
                      <ListChecks className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </table>
      </div>
    </div>
  )
}
